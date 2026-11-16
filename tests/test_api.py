"""
Unit tests for FastAPI Inference REST API logic
"""

import unittest
import io
from PIL import Image
from fastapi import UploadFile

from app.api import app, load_inference_model, predict_leaf_disease, health_check, root


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


if __name__ == "__main__":
    unittest.main()
