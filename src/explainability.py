"""
Explainable AI (XAI) Module: Grad-CAM Implementation
Implements Gradient-weighted Class Activation Mapping (Grad-CAM)
to visually confirm that predictions stem from botanical lesions rather than background bias.
"""

from typing import Tuple, Optional
import cv2
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
import torch.nn.functional as F

from src.config import DEVICE, DISEASE_REMEDIES


class GradCAM:
    """
    Grad-CAM implementation for PyTorch CNN backbones.
    Hooks into activations and gradients of the target convolutional layer.
    """
    def __init__(self, model: nn.Module, target_layer: Optional[nn.Module] = None):
        self.model = model
        self.model.eval()

        if target_layer is None:
            if hasattr(model, "get_last_conv_layer"):
                target_layer = model.get_last_conv_layer()
            else:
                raise ValueError("Target layer must be specified or implemented via get_last_conv_layer().")

        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        self._register_hooks()

    def _register_hooks(self):
        def forward_hook(module, input, output):
            self.activations = output.detach()

        def backward_hook(module, grad_in, grad_out):
            self.gradients = grad_out[0].detach()

        self.forward_handle = self.target_layer.register_forward_hook(forward_hook)
        self.backward_handle = self.target_layer.register_full_backward_hook(backward_hook)

    def generate_heatmap(
        self,
        input_tensor: torch.Tensor,
        target_class_idx: Optional[int] = None
    ) -> Tuple[np.ndarray, int, float]:
        """
        Computes Grad-CAM heatmap for a single image tensor of shape (1, 3, H, W).
        
        Returns:
            heatmap: 2D numpy array (H, W) normalized to [0, 1].
            predicted_class_idx: Class index predicted by the network.
            confidence: Softmax probability of the predicted class.
        """
        self.model.zero_grad()
        output = self.model(input_tensor)
        probabilities = F.softmax(output, dim=1)

        if target_class_idx is None:
            target_class_idx = int(torch.argmax(output, dim=1).item())

        confidence = float(probabilities[0, target_class_idx].item())

        # Backward pass with respect to the target class logit
        target_logit = output[0, target_class_idx]
        target_logit.backward()

        # Global Average Pooling of gradients across spatial dimensions
        weights = torch.mean(self.gradients, dim=(2, 3), keepdim=True)  # (1, C, 1, 1)

        # Weighted combination of forward activation maps
        cam = torch.sum(weights * self.activations, dim=1, keepdim=True)  # (1, 1, H, W)
        cam = F.relu(cam)  # Discard negative influences

        cam = cam.squeeze().cpu().numpy()
        # Normalize to [0, 1]
        cam_min, cam_max = cam.min(), cam.max()
        if cam_max - cam_min > 1e-8:
            heatmap = (cam - cam_min) / (cam_max - cam_min)
        else:
            heatmap = np.zeros_like(cam)

        return heatmap, target_class_idx, confidence

    def remove_hooks(self):
        self.forward_handle.remove()
        self.backward_handle.remove()


def overlay_heatmap(
    original_image: Image.Image,
    heatmap: np.ndarray,
    alpha: float = 0.5,
    colormap: int = cv2.COLORMAP_JET
) -> Tuple[Image.Image, np.ndarray]:
    """
    Overlays a Grad-CAM heatmap onto the original RGB PIL image.
    
    Args:
        original_image: PIL Image in RGB.
        heatmap: 2D float array in range [0, 1].
        alpha: Blending weight of heatmap relative to base image.
        colormap: OpenCV colormap (default: JET).
        
    Returns:
        blended_pil: PIL image of the overlaid visualization.
        blended_np: Blended RGB numpy array.
    """
    img_np = np.array(original_image.convert("RGB"))
    h, w = img_np.shape[:2]

    # Resize heatmap to match original image dimensions
    heatmap_resized = cv2.resize(heatmap, (w, h))
    heatmap_uint8 = np.uint8(255 * heatmap_resized)

    # Colorize heatmap
    color_cam = cv2.applyColorMap(heatmap_uint8, colormap)
    color_cam = cv2.cvtColor(color_cam, cv2.COLOR_BGR2RGB)

    # Blend
    blended = np.float32(color_cam) * alpha + np.float32(img_np) * (1 - alpha)
    blended = np.clip(blended, 0, 255).astype(np.uint8)

    return Image.fromarray(blended), blended


def get_diagnosis_report(class_name: str, confidence: float) -> dict:
    """
    Generates a farmer-friendly diagnosis report with agronomic advice.
    """
    parts = class_name.split("___")
    plant = parts[0] if len(parts) > 1 else "Plant"
    condition = parts[1] if len(parts) > 1 else class_name

    remedy = "Consult local agricultural extension service for tailored management."
    for key, text in DISEASE_REMEDIES.items():
        if key.lower() in condition.lower():
            remedy = text
            break

    return {
        "plant": plant,
        "condition": condition.replace("_", " "),
        "confidence": confidence,
        "is_healthy": "healthy" in condition.lower(),
        "remedy": remedy
    }
