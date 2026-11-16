"""
Streamlit Web Application: Plant Leaf Disease Detection & Grad-CAM XAI
Provides interactive diagnosis, Grad-CAM symptom heatmaps, and agronomic remedies.
"""

from pathlib import Path
import sys

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import streamlit as st
from PIL import Image
import numpy as np
import torch
import torch.nn.functional as F

from src.config import (
    CHECKPOINT_DIR,
    SAMPLES_DIR,
    DEFAULT_CLASSES,
    DEVICE,
    SUPPORTED_ARCHITECTURES,
    DISEASE_REMEDIES
)
from src.dataset import get_transforms, generate_synthetic_samples
from src.segmentation import segment_leaf_hsv, segment_leaf_otsu
from src.models import CustomCNN, build_transfer_model, CBAMCNN
from src.explainability import GradCAM, overlay_heatmap, get_diagnosis_report


st.set_page_config(
    page_title="Plant Leaf Disease Detection & XAI",
    page_icon="🌿",
    layout="wide"
)


@st.cache_resource
def load_trained_model(checkpoint_path: Path, arch_name: str, num_classes: int):
    """Loads model weights and returns the model instance."""
    if arch_name == "custom_cnn":
        model = CustomCNN(num_classes=num_classes)
    elif arch_name == "cbam_cnn":
        model = CBAMCNN(num_classes=num_classes)
    else:
        model = build_transfer_model(arch_name=arch_name, num_classes=num_classes, pretrained=False)

    if checkpoint_path.exists():
        checkpoint = torch.load(checkpoint_path, map_location=DEVICE)
        state_dict = checkpoint.get("model_state_dict", checkpoint)
        model.load_state_dict(state_dict)
    
    model.to(DEVICE)
    model.eval()
    return model


def main():
    st.title("🌿 Plant Leaf Disease Detection & XAI Diagnostic System")
    st.caption("Deep Learning & Explainable AI (Grad-CAM) Decision Support Platform")

    # Sidebar controls
    st.sidebar.header("⚙️ Configuration")
    selected_arch = st.sidebar.selectbox("CNN Architecture", SUPPORTED_ARCHITECTURES, index=1)
    seg_method = st.sidebar.selectbox("Background Suppression (ROI)", ["None", "HSV Mask", "Otsu Thresholding"])
    cam_alpha = st.sidebar.slider("Grad-CAM Heatmap Blend (Alpha)", 0.1, 0.9, 0.45, 0.05)

    # Checkpoint lookup
    ckpt_file = CHECKPOINT_DIR / f"{selected_arch}_best.pth"
    if not ckpt_file.exists():
        ckpt_file = CHECKPOINT_DIR / "best_model.pth"

    # Detect trained classes or available dataset classes
    pv_dir = PROJECT_ROOT / "data" / "raw" / "PlantVillage"
    if ckpt_file.exists():
        ckpt = torch.load(ckpt_file, map_location=DEVICE)
        class_names = ckpt.get("class_names", DEFAULT_CLASSES)
    elif pv_dir.exists() and any(pv_dir.glob("*/*.*")):
        class_names = sorted([d.name for d in pv_dir.iterdir() if d.is_dir()])
    else:
        class_names = DEFAULT_CLASSES

    model = load_trained_model(ckpt_file, selected_arch, len(class_names))

    st.sidebar.divider()
    st.sidebar.markdown("### 🌿 AgriVision System")
    st.sidebar.info(
        "Real-time crop pathology detection powered by Convolutional Neural Networks and Explainable AI (Grad-CAM)."
    )

    # Main section: Image Input
    col_input, col_results = st.columns([1, 1])

    with col_input:
        st.subheader("1. Provide Leaf Image")
        input_choice = st.radio("Choose Input Method", ["Upload Image", "Select Sample Benchmark Leaf"], horizontal=True)

        pil_image = None
        if input_choice == "Upload Image":
            uploaded = st.file_uploader("Upload leaf photograph", type=["jpg", "jpeg", "png", "webp"])
            if uploaded is not None:
                pil_image = Image.open(uploaded).convert("RGB")
        else:
            # Use real PlantVillage images if available, otherwise synthetic samples
            active_sample_dir = pv_dir if pv_dir.exists() and any(pv_dir.glob("*/*.*")) else SAMPLES_DIR

            if active_sample_dir == SAMPLES_DIR and not any(SAMPLES_DIR.glob("*/*.jpg")):
                with st.spinner("Generating sample botanical benchmark leaves..."):
                    generate_synthetic_samples(SAMPLES_DIR, DEFAULT_CLASSES, samples_per_class=3)

            sample_classes = sorted([d.name for d in active_sample_dir.iterdir() if d.is_dir()])
            chosen_cls = st.selectbox("Sample Condition", sample_classes)
            valid_exts = {".jpg", ".jpeg", ".png", ".bmp", ".JPG"}
            sample_files = [f for f in (active_sample_dir / chosen_cls).iterdir() if f.suffix in valid_exts][:30]
            if sample_files:
                selected_sample = st.selectbox("Select Sample Image", sample_files, format_func=lambda p: p.name)
                pil_image = Image.open(selected_sample).convert("RGB")

        if pil_image is not None:
            st.image(pil_image, caption="Input Leaf Image", use_container_width=True)

            # Apply background suppression if requested
            img_np = np.array(pil_image)
            if seg_method == "HSV Mask":
                segmented_np, _ = segment_leaf_hsv(img_np)
                pil_image_proc = Image.fromarray(segmented_np)
                st.image(pil_image_proc, caption="ROI Segmented Image (HSV)", use_container_width=True)
            elif seg_method == "Otsu Thresholding":
                segmented_np, _ = segment_leaf_otsu(img_np)
                pil_image_proc = Image.fromarray(segmented_np)
                st.image(pil_image_proc, caption="ROI Segmented Image (Otsu)", use_container_width=True)
            else:
                pil_image_proc = pil_image

    with col_results:
        st.subheader("2. AI Diagnosis & Explainability")
        if pil_image is not None:
            # Preprocess tensor
            transform = get_transforms(is_train=False)
            input_tensor = transform(pil_image_proc).unsqueeze(0).to(DEVICE)

            # Grad-CAM computation
            grad_cam = GradCAM(model)
            heatmap, pred_idx, confidence = grad_cam.generate_heatmap(input_tensor)
            pred_class = class_names[pred_idx] if pred_idx < len(class_names) else f"Class_{pred_idx}"
            report = get_diagnosis_report(pred_class, confidence)

            # Status Banner
            if report["is_healthy"]:
                st.success(f"### Result: {report['plant']} - Healthy ({confidence*100:.1f}%)")
            else:
                st.error(f"### Detected: {report['plant']} - {report['condition']} ({confidence*100:.1f}%)")

            # Overlay Heatmap
            overlaid_img, _ = overlay_heatmap(pil_image, heatmap, alpha=cam_alpha)
            st.image(overlaid_img, caption="Grad-CAM Lesion Activation Heatmap", use_container_width=True)

            st.markdown(
                "💡 **Interpretability Note (XAI):** Warmer colors (red/yellow) indicate the specific visual patterns "
                "that directed the CNN's diagnosis. This verifies that the network focuses on actual foliar symptoms "
                "rather than confounding background elements."
            )

            # Agronomic Remediation Guide
            st.divider()
            st.markdown("### 🚜 Agronomic Management & Remediation")
            st.markdown(f"**Recommended Action:** {report['remedy']}")

            # Confidence distribution
            with torch.no_grad():
                logits = model(input_tensor)
                probs = F.softmax(logits, dim=1).squeeze().cpu().numpy()

            top5_indices = np.argsort(probs)[-5:][::-1]
            st.divider()
            st.markdown("### 📊 Top Diagnostic Probabilities")
            for idx in top5_indices:
                cls_label = class_names[idx].replace("___", " : ").replace("_", " ")
                prob = probs[idx]
                st.progress(float(prob), text=f"{cls_label} — {prob*100:.1f}%")
        else:
            st.info("👈 Upload an image or select a sample leaf from the sidebar to view automated diagnosis.")


if __name__ == "__main__":
    main()
