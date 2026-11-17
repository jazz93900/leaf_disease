"""
Unit tests for FastAPI Inference REST API logic
"""

import unittest
import io
from PIL import Image
from fastapi import UploadFile

from app.api import (
    app,
    load_inference_model,
    predict_leaf_disease,
    validate_leaf,
    predict_batch_leaves,
    health_check,
    root,
)


class TestInferenceAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        load_inference_model()

    def test_root_endpoint(self):
        data = root()
        self.assertEqual(data["status"], "online")
        self.assertIn("predict_endpoint", data)

    def test_health_endpoint(self):
        data = health_check()
        self.assertEqual(data["status"], "healthy")
        self.assertTrue(data["classes_count"] > 0)

    def test_predict_endpoint(self):
        img = Image.new("RGB", (224, 224), color=(34, 139, 34))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)

        upload = UploadFile(filename="leaf.jpg", file=buf)
        data = predict_leaf_disease(file=upload, include_heatmap=True, seg_method="none")

        self.assertTrue(data["success"])
        self.assertIn("plant", data)
        self.assertIn("condition", data)
        self.assertIn("confidence", data)
        self.assertIn("remedy", data)
        self.assertIsNotNone(data["gradcam_heatmap_base64"])
        self.assertTrue(data["inference_latency_ms"] > 0)

    def test_validate_leaf_dark_image(self):
        # A pitch black image should be rejected as too dark
        img = Image.new("RGB", (224, 224), color=(0, 0, 0))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)

        upload = UploadFile(filename="dark.jpg", file=buf)
        data = validate_leaf(file=upload)
        self.assertFalse(data["is_proper"])
        self.assertEqual(data["code"], "TOO_DARK")

    def test_predict_batch_endpoint(self):
        # Create 3 synthetic green leaf-like images
        uploads = []
        for i in range(3):
            img = Image.new("RGB", (224, 224), color=(40 + i * 10, 140, 50))
            buf = io.BytesIO()
            img.save(buf, format="JPEG")
            buf.seek(0)
            uploads.append(UploadFile(filename=f"leaf_{i+1}.jpg", file=buf))

        data = predict_batch_leaves(files=uploads, include_heatmaps=True, seg_method="none")
        self.assertTrue(data["success"])
        self.assertTrue(data["is_consensus"])
        self.assertEqual(data["leaves_analyzed_count"], 3)
        self.assertIn("plant", data)
        self.assertIn("condition", data)
        self.assertIn("confidence", data)
        self.assertIn("individual_leaves", data)
        self.assertEqual(len(data["individual_leaves"]), 3)


if __name__ == "__main__":
    unittest.main()
