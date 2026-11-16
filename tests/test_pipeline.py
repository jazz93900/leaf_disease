"""
Automated Unit and Integration Tests for Plant Disease Detection Pipeline
"""

import unittest
from pathlib import Path
import numpy as np
import torch
from PIL import Image

from src.models import CustomCNN, build_transfer_model, CBAMCNN
from src.segmentation import segment_leaf_hsv, segment_leaf_otsu
from src.explainability import GradCAM, overlay_heatmap, get_diagnosis_report
from src.dataset import get_transforms, generate_synthetic_samples
from src.config import SAMPLES_DIR, DEFAULT_CLASSES


class TestModelArchitectures(unittest.TestCase):
    def setUp(self):
        self.batch_size = 2
        self.num_classes = 16
        self.dummy_input = torch.randn(self.batch_size, 3, 224, 224)

    def test_custom_cnn_forward(self):
        model = CustomCNN(num_classes=self.num_classes)
        model.eval()
        with torch.no_grad():
            output = model(self.dummy_input)
        self.assertEqual(output.shape, (self.batch_size, self.num_classes))
        self.assertIsNotNone(model.get_last_conv_layer())

    def test_cbam_cnn_forward(self):
        model = CBAMCNN(num_classes=self.num_classes)
        model.eval()
        with torch.no_grad():
            output = model(self.dummy_input)
        self.assertEqual(output.shape, (self.batch_size, self.num_classes))
        self.assertIsNotNone(model.get_last_conv_layer())

    def test_mobilenet_v3_forward(self):
        model = build_transfer_model("mobilenet_v3", num_classes=self.num_classes, pretrained=False)
        model.eval()
        with torch.no_grad():
            output = model(self.dummy_input)
        self.assertEqual(output.shape, (self.batch_size, self.num_classes))
        self.assertIsNotNone(model.get_last_conv_layer())

    def test_resnet50_forward(self):
        model = build_transfer_model("resnet50", num_classes=self.num_classes, pretrained=False)
        model.eval()
        with torch.no_grad():
            output = model(self.dummy_input)
        self.assertEqual(output.shape, (self.batch_size, self.num_classes))
        self.assertIsNotNone(model.get_last_conv_layer())


class TestSegmentation(unittest.TestCase):
    def setUp(self):
        # Create a mock green image
        self.green_img = np.zeros((100, 100, 3), dtype=np.uint8)
        self.green_img[:, :, 1] = 180  # green

    def test_segment_leaf_hsv(self):
        segmented, mask = segment_leaf_hsv(self.green_img)
        self.assertEqual(segmented.shape, self.green_img.shape)
        self.assertEqual(mask.shape, (100, 100))
        self.assertTrue(mask.sum() > 0)

    def test_segment_leaf_otsu(self):
        segmented, mask = segment_leaf_otsu(self.green_img)
        self.assertEqual(segmented.shape, self.green_img.shape)
        self.assertEqual(mask.shape, (100, 100))


class TestExplainabilityGradCAM(unittest.TestCase):
    def test_gradcam_generation(self):
        model = CustomCNN(num_classes=4)
        model.eval()
        input_tensor = torch.randn(1, 3, 224, 224)

        cam = GradCAM(model)
        heatmap, pred_idx, confidence = cam.generate_heatmap(input_tensor)

        self.assertEqual(heatmap.shape, (14, 14))
        self.assertTrue(0 <= pred_idx < 4)
        self.assertTrue(0.0 <= confidence <= 1.0)

        # Test overlay
        pil_img = Image.new("RGB", (224, 224), color=(34, 139, 34))
        blended_pil, blended_np = overlay_heatmap(pil_img, heatmap)
        self.assertEqual(blended_np.shape, (224, 224, 3))

        # Test diagnosis report
        report = get_diagnosis_report("Tomato___Early_blight", confidence)
        self.assertEqual(report["plant"], "Tomato")
        self.assertIn("Early blight", report["condition"])
        self.assertIn("copper-based", report["remedy"])

        cam.remove_hooks()


if __name__ == "__main__":
    unittest.main()
