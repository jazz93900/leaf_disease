"""
FastAPI Inference REST API for Plant Leaf Disease Detection
Provides endpoints for health check, disease prediction, and Grad-CAM visual heatmaps.
"""

from pathlib import Path
import sys
import io
import time
import base64
import urllib.request
from typing import List, Dict, Any
import cv2

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI, UploadFile, File, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import numpy as np
import torch
import torch.nn.functional as F

from src.config import CHECKPOINT_DIR, DEFAULT_CLASSES, DEVICE
from src.dataset import get_transforms
from src.segmentation import segment_leaf_hsv, segment_leaf_otsu
from src.models import build_transfer_model, CustomCNN, CBAMCNN
from src.explainability import GradCAM, overlay_heatmap, get_diagnosis_report


app = FastAPI(
    title="AgriVision Disease Inference API",
    description="RESTful Inference Endpoint for Plant Foliar Pathology Detection & Grad-CAM XAI",
    version="1.0.0"
)

# Enable CORS for cross-origin requests (web apps, mobile frontends)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model state singleton
class ModelContainer:
    model = None
    class_names = DEFAULT_CLASSES
    arch_name = "mobilenet_v3"


container = ModelContainer()


def load_inference_model():
    """Loads checkpoint weights into memory once at startup."""
    ckpt_path = CHECKPOINT_DIR / f"{container.arch_name}_best.pth"
    if not ckpt_path.exists():
        ckpt_path = CHECKPOINT_DIR / "best_model.pth"

    class_names = DEFAULT_CLASSES
    state_dict = None

    if ckpt_path.exists():
        ckpt = torch.load(ckpt_path, map_location=DEVICE)
        state_dict = ckpt.get("model_state_dict", ckpt)
        if "class_names" in ckpt:
            class_names = ckpt["class_names"]

    container.class_names = class_names

    if container.arch_name == "custom_cnn":
        model = CustomCNN(num_classes=len(class_names))
    elif container.arch_name == "cbam_cnn":
        model = CBAMCNN(num_classes=len(class_names))
    else:
        model = build_transfer_model(container.arch_name, num_classes=len(class_names), pretrained=False)

    if state_dict is not None:
        model.load_state_dict(state_dict)

    model.to(DEVICE)
    model.eval()
    container.model = model
    print(f"[API] Loaded {container.arch_name} with {len(class_names)} classes on {DEVICE}")


@app.on_event("startup")
def startup_event():
    load_inference_model()


@app.get("/", tags=["Info"])
def root():
    return {
        "service": "AgriVision Plant Leaf Disease Inference Service",
        "status": "online",
        "docs_url": "/docs",
        "predict_endpoint": "/predict",
        "health_endpoint": "/health"
    }


@app.get("/health", tags=["Monitoring"])
def health_check():
    return {
        "status": "healthy",
        "device": DEVICE,
        "architecture": container.arch_name,
        "classes_count": len(container.class_names),
        "supported_classes": container.class_names
    }


def read_image_from_upload(upload_file: UploadFile) -> Image.Image:
    """
    Safely parses an uploaded image whether it is:
    - Raw binary image bytes (JPEG, PNG, WEBP)
    - A base64 data URI (data:image/jpeg;base64,...)
    - An HTTP / HTTPS URL string
    """
    raw_bytes = upload_file.file.read()
    if not raw_bytes or len(raw_bytes) == 0:
        raise ValueError("Uploaded image file is empty (0 bytes received).")

    # If client passed an HTTP URL as text
    trimmed = raw_bytes.strip()
    if trimmed.startswith(b"http://") or trimmed.startswith(b"https://"):
        try:
            url_str = trimmed.decode("utf-8")
            req = urllib.request.Request(url_str, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                raw_bytes = resp.read()
        except Exception as fetch_err:
            raise ValueError(f"Could not download remote leaf image: {str(fetch_err)}")

    # If client passed a base64 Data URI
    elif b"base64," in raw_bytes[:100]:
        try:
            _, b64_data = raw_bytes.split(b"base64,", 1)
            raw_bytes = base64.b64decode(b64_data)
        except Exception as b64_err:
            raise ValueError(f"Invalid base64 image data: {str(b64_err)}")

    return Image.open(io.BytesIO(raw_bytes)).convert("RGB")


@app.post("/predict", tags=["Inference"])
def predict_leaf_disease(
    file: UploadFile = File(..., description="Image file of the plant leaf"),
    include_heatmap: bool = Query(True, description="Whether to compute and return Grad-CAM heatmap base64"),
    seg_method: str = Query("none", pattern="^(none|hsv|otsu)$", description="Background segmentation method")
):
    """
    Classifies a plant leaf photograph and optionally generates a Grad-CAM heatmap overlay.
    """
    if container.model is None:
        load_inference_model()

    # Read and validate image
    try:
        pil_image = read_image_from_upload(file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

    start_time = time.perf_counter()

    # Apply background suppression if requested
    img_np = np.array(pil_image)
    if seg_method == "hsv":
        processed_np, _ = segment_leaf_hsv(img_np)
        input_pil = Image.fromarray(processed_np)
    elif seg_method == "otsu":
        processed_np, _ = segment_leaf_otsu(img_np)
        input_pil = Image.fromarray(processed_np)
    else:
        input_pil = pil_image

    # Preprocess tensor
    transform = get_transforms(is_train=False)
    input_tensor = transform(input_pil).unsqueeze(0).to(DEVICE)

    # Prediction and Grad-CAM
    cam = GradCAM(container.model)
    heatmap, pred_idx, confidence = cam.generate_heatmap(input_tensor)
    pred_class = container.class_names[pred_idx] if pred_idx < len(container.class_names) else f"Class_{pred_idx}"
    report = get_diagnosis_report(pred_class, confidence)

    # Top-3 predictions
    with torch.no_grad():
        logits = container.model(input_tensor)
        probs = F.softmax(logits, dim=1).squeeze().cpu().numpy()
    
    top3_indices = np.argsort(probs)[-3:][::-1]
    top3_list = [
        {"class": container.class_names[i], "probability": float(probs[i])}
        for i in top3_indices
    ]

    heatmap_base64 = None
    if include_heatmap:
        overlaid_pil, _ = overlay_heatmap(pil_image, heatmap, alpha=0.45)
        buffer = io.BytesIO()
        overlaid_pil.save(buffer, format="JPEG", quality=90)
        heatmap_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0

    return {
        "success": True,
        "plant": report["plant"],
        "condition": report["condition"],
        "is_healthy": report["is_healthy"],
        "confidence": round(confidence, 4),
        "remedy": report["remedy"],
        "top3_predictions": top3_list,
        "inference_latency_ms": round(elapsed_ms, 2),
        "gradcam_heatmap_base64": heatmap_base64
    }


def check_image_leaf_quality(pil_image: Image.Image) -> Dict[str, Any]:
    """
    Validates whether an uploaded image is a proper plant leaf:
    1. Brightness check (reject pitch dark or washed out photos)
    2. Blur / Sharpness check (Laplacian variance)
    3. Foliage vegetation presence (HSV green/brown leaf tissue ratio)
    """
    img_np = np.array(pil_image)
    if len(img_np.shape) == 2:
        gray = img_np
    else:
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    
    # 1. Brightness / Luminance
    mean_brightness = float(np.mean(gray))
    if mean_brightness < 30.0:
        return {
            "is_proper": False,
            "reason": "Image is too dark. Please take photo in adequate lighting.",
            "code": "TOO_DARK",
            "sharpness": 0.0,
            "vegetation_ratio": 0.0,
            "brightness": round(mean_brightness, 1)
        }
    if mean_brightness > 245.0:
        return {
            "is_proper": False,
            "reason": "Image is overexposed or washed out. Please avoid harsh direct flash or glare.",
            "code": "OVEREXPOSED",
            "sharpness": 0.0,
            "vegetation_ratio": 0.0,
            "brightness": round(mean_brightness, 1)
        }

    # 2. Blur / Sharpness via Laplacian variance
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    sharpness = float(laplacian.var())
    if sharpness < 20.0:
        return {
            "is_proper": False,
            "reason": "Image is blurry or out of focus. Please hold camera steady and retake.",
            "code": "BLURRY",
            "sharpness": round(sharpness, 2),
            "vegetation_ratio": 0.0,
            "brightness": round(mean_brightness, 1)
        }

    # 3. Foliage / Vegetation presence
    try:
        _, mask = segment_leaf_hsv(img_np)
        vegetation_ratio = float(np.count_nonzero(mask) / mask.size)
    except Exception:
        vegetation_ratio = 0.5  # fallback if segmentation fails

    if vegetation_ratio < 0.10:
        return {
            "is_proper": False,
            "reason": "No clear plant leaf detected. Please center the crop leaf blade in the camera view.",
            "code": "NO_LEAF_DETECTED",
            "sharpness": round(sharpness, 2),
            "vegetation_ratio": round(vegetation_ratio, 3),
            "brightness": round(mean_brightness, 1)
        }

    return {
        "is_proper": True,
        "reason": "Leaf image verified successfully.",
        "code": "VALID_LEAF",
        "sharpness": round(sharpness, 2),
        "vegetation_ratio": round(vegetation_ratio, 3),
        "brightness": round(mean_brightness, 1)
    }


@app.post("/validate-leaf", tags=["Validation"])
def validate_leaf(
    file: UploadFile = File(..., description="Single plant leaf photograph to validate")
):
    """
    Validates whether an uploaded photograph is a proper, clear plant leaf image.
    """
    try:
        pil_image = read_image_from_upload(file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

    return check_image_leaf_quality(pil_image)


@app.post("/predict-batch", tags=["Inference"])
def predict_batch_leaves(
    files: List[UploadFile] = File(..., description="List of at least 3 leaf images"),
    include_heatmaps: bool = Query(True, description="Whether to include Grad-CAM heatmaps"),
    seg_method: str = Query("none", pattern="^(none|hsv|otsu)$", description="Background segmentation method")
):
    """
    Evaluates multiple leaf photographs simultaneously (e.g. 3 views).
    Validates leaf propriety and computes multi-leaf average softmax probabilities for high-accuracy consensus.
    """
    if len(files) == 0:
        raise HTTPException(status_code=400, detail="At least 1 leaf image is required (3 recommended).")

    if container.model is None:
        load_inference_model()

    start_time = time.perf_counter()
    transform = get_transforms(is_train=False)
    cam = GradCAM(container.model)

    leaf_results = []
    accumulated_probs = None
    processed_count = 0

    for idx, f in enumerate(files):
        try:
            pil_image = read_image_from_upload(f)
        except Exception as e:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": f"Image {idx+1} could not be read: {str(e)}"}
            )

        # Validate quality
        quality = check_image_leaf_quality(pil_image)
        if not quality["is_proper"]:
            return JSONResponse(
                status_code=422,
                content={
                    "success": False,
                    "invalid_leaf_index": idx,
                    "quality_check": quality,
                    "error": f"Leaf #{idx + 1} is not proper: {quality['reason']}. Please click again or select from gallery."
                }
            )

        # Preprocessing
        img_np = np.array(pil_image)
        if seg_method == "hsv":
            processed_np, _ = segment_leaf_hsv(img_np)
            input_pil = Image.fromarray(processed_np)
        elif seg_method == "otsu":
            processed_np, _ = segment_leaf_otsu(img_np)
            input_pil = Image.fromarray(processed_np)
        else:
            input_pil = pil_image

        input_tensor = transform(input_pil).unsqueeze(0).to(DEVICE)

        with torch.no_grad():
            logits = container.model(input_tensor)
            probs = F.softmax(logits, dim=1).squeeze().cpu().numpy()

        if accumulated_probs is None:
            accumulated_probs = probs.copy()
        else:
            accumulated_probs += probs
        processed_count += 1

        # Per-leaf prediction
        pred_idx = int(np.argmax(probs))
        leaf_pred_class = container.class_names[pred_idx] if pred_idx < len(container.class_names) else f"Class_{pred_idx}"
        leaf_report = get_diagnosis_report(leaf_pred_class, float(probs[pred_idx]))

        # Grad-CAM heatmap
        heatmap_base64 = None
        if include_heatmaps:
            try:
                heatmap, _, _ = cam.generate_heatmap(input_tensor)
                overlaid_pil, _ = overlay_heatmap(pil_image, heatmap, alpha=0.45)
                buf = io.BytesIO()
                overlaid_pil.save(buf, format="JPEG", quality=85)
                heatmap_base64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            except Exception:
                heatmap_base64 = None

        leaf_results.append({
            "leaf_index": idx + 1,
            "filename": f.filename or f"leaf_{idx+1}.jpg",
            "plant": leaf_report["plant"],
            "condition": leaf_report["condition"],
            "is_healthy": leaf_report["is_healthy"],
            "confidence": round(float(probs[pred_idx]), 4),
            "quality": quality,
            "gradcam_heatmap_base64": heatmap_base64
        })

    # Consensus prediction across all valid leaves
    avg_probs = accumulated_probs / max(processed_count, 1)
    consensus_idx = int(np.argmax(avg_probs))
    consensus_class = container.class_names[consensus_idx] if consensus_idx < len(container.class_names) else f"Class_{consensus_idx}"
    consensus_confidence = float(avg_probs[consensus_idx])
    final_report = get_diagnosis_report(consensus_class, consensus_confidence)

    top3_indices = np.argsort(avg_probs)[-3:][::-1]
    top3_list = [
        {"class": container.class_names[i], "probability": round(float(avg_probs[i]), 4)}
        for i in top3_indices
    ]

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0

    return {
        "success": True,
        "is_consensus": True,
        "leaves_analyzed_count": processed_count,
        "plant": final_report["plant"],
        "condition": final_report["condition"],
        "is_healthy": final_report["is_healthy"],
        "confidence": round(consensus_confidence, 4),
        "remedy": final_report["remedy"],
        "top3_predictions": top3_list,
        "individual_leaves": leaf_results,
        "inference_latency_ms": round(elapsed_ms, 2),
        "gradcam_heatmap_base64": leaf_results[0]["gradcam_heatmap_base64"] if leaf_results else None
    }

