"""
Unified CLI Runner for Plant Leaf Disease Detection System
Commands:
  python run.py generate-samples   # Generates benchmark botanical sample leaves
  python run.py train             # Trains CNN model (Custom, MobileNet, ResNet, CBAM)
  python run.py eval              # Evaluates model & outputs confusion matrix
  python run.py explain           # Runs Grad-CAM heatmap visualization on a leaf
  python run.py app               # Launches interactive Streamlit UI
"""

import argparse
from pathlib import Path
import sys
import subprocess

# Self-diagnostic check for PyTorch and Virtual Environment
try:
    import torch
except ImportError:
    venv_dir = Path(__file__).resolve().parent / ".venv"
    print("\n" + "=" * 65)
    print("❌ ERROR: 'torch' is not installed in your active Python interpreter.")
    print(f"   Current Python: {sys.executable}")
    if venv_dir.exists():
        print("\n💡 A virtual environment was detected at:")
        print(f"   {venv_dir}")
        print("\n👉 Please activate the virtual environment and re-run:")
        print("   In PowerShell:     .\\.venv\\Scripts\\Activate.ps1")
        print("   In Command Prompt: .\\.venv\\Scripts\\activate.bat")
        print("   Or run directly:   .\\.venv\\Scripts\\python.exe run.py api --port 8000")
    else:
        print("\n👉 Please install dependencies using:")
        print("   pip install -r requirements.txt")
    print("=" * 65 + "\n")
    sys.exit(1)

from src.config import (
    CHECKPOINT_DIR,
    SAMPLES_DIR,
    REPORTS_DIR,
    DEFAULT_CLASSES,
    SUPPORTED_ARCHITECTURES,
    DEVICE,
    DEFAULT_EPOCHS,
    LEARNING_RATE
)
from src.dataset import (
    generate_synthetic_samples,
    load_dataset_from_dir,
    create_dataloaders,
    get_transforms
)
from src.train import get_model, train_model
from src.evaluate import evaluate_model
from src.explainability import GradCAM, overlay_heatmap, get_diagnosis_report
from PIL import Image
import torch


def cmd_generate_samples(args):
    print(f"Generating botanical sample images in {SAMPLES_DIR}...")
    generate_synthetic_samples(SAMPLES_DIR, DEFAULT_CLASSES, samples_per_class=args.samples_per_class)
    print(f"Successfully generated samples across {len(DEFAULT_CLASSES)} classes.")


def cmd_train(args):
    data_path = Path(args.data_dir)
    if not data_path.exists() or not any(data_path.glob("*/*.jpg")):
        print(f"Data directory '{data_path}' has no images. Generating benchmark sample dataset...")
        generate_synthetic_samples(data_path, DEFAULT_CLASSES, samples_per_class=12)

    print(f"Loading dataset from {data_path}...")
    train_ds, val_ds, test_ds, class_names = load_dataset_from_dir(data_path)
    train_loader, val_loader, test_loader = create_dataloaders(train_ds, val_ds, test_ds, batch_size=args.batch_size)

    print(f"Instantiating model architecture: '{args.arch}'...")
    model = get_model(args.arch, num_classes=len(class_names), pretrained=args.pretrained)

    train_model(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        class_names=class_names,
        arch_name=args.arch,
        epochs=args.epochs,
        lr=args.lr,
        device=DEVICE
    )


def cmd_eval(args):
    data_path = Path(args.data_dir)
    if not data_path.exists():
        data_path = SAMPLES_DIR

    train_ds, val_ds, test_ds, class_names = load_dataset_from_dir(data_path)
    _, _, test_loader = create_dataloaders(train_ds, val_ds, test_ds)

    ckpt_path = CHECKPOINT_DIR / f"{args.arch}_best.pth"
    if not ckpt_path.exists():
        ckpt_path = CHECKPOINT_DIR / "best_model.pth"
    if not ckpt_path.exists():
        print(f"No checkpoint found for '{args.arch}'. Please train the model first.")
        return

    model = get_model(args.arch, num_classes=len(class_names), pretrained=False)
    ckpt = torch.load(ckpt_path, map_location=DEVICE)
    state_dict = ckpt.get("model_state_dict", ckpt)
    model.load_state_dict(state_dict)

    evaluate_model(model, test_loader, class_names, args.arch, device=DEVICE)


def cmd_explain(args):
    img_path = Path(args.image)
    valid_exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".JPG", ".PNG"}

    # If user provided a folder, auto-pick the first leaf image inside it
    if img_path.is_dir():
        found = [f for f in img_path.iterdir() if f.suffix in valid_exts]
        if found:
            img_path = found[0]
            print(f"[Auto-Select] Selected image from directory: {img_path.name}")
        else:
            print(f"No valid image files found inside directory: {img_path}")
            return

    # If exact path not found, try fuzzy match in parent folder
    if not img_path.exists():
        parent_dir = img_path.parent
        if parent_dir.exists():
            matches = list(parent_dir.glob(f"*{img_path.name}*"))
            if not matches:
                matches = [f for f in parent_dir.iterdir() if f.suffix in valid_exts]
            if matches:
                img_path = matches[0]
                print(f"[Auto-Resolved] Found matching leaf image: {img_path.name}")
            else:
                print(f"Image not found in {parent_dir}")
                return
        else:
            print(f"Image path not found: {img_path}")
            return

    ckpt_path = CHECKPOINT_DIR / f"{args.arch}_best.pth"
    if not ckpt_path.exists():
        ckpt_path = CHECKPOINT_DIR / "best_model.pth"

    class_names = DEFAULT_CLASSES
    state_dict = None
    if ckpt_path.exists():
        ckpt = torch.load(ckpt_path, map_location=DEVICE)
        state_dict = ckpt.get("model_state_dict", ckpt)
        if "class_names" in ckpt:
            class_names = ckpt["class_names"]

    model = get_model(args.arch, num_classes=len(class_names), pretrained=False)
    if state_dict is not None:
        model.load_state_dict(state_dict)

    model.to(DEVICE)
    model.eval()

    pil_img = Image.open(img_path).convert("RGB")
    transform = get_transforms(is_train=False)
    tensor = transform(pil_img).unsqueeze(0).to(DEVICE)

    cam = GradCAM(model)
    heatmap, pred_idx, conf = cam.generate_heatmap(tensor)
    pred_cls = class_names[pred_idx]
    report = get_diagnosis_report(pred_cls, conf)

    overlaid, _ = overlay_heatmap(pil_img, heatmap)
    out_file = REPORTS_DIR / f"gradcam_explanation_{img_path.stem}.png"
    overlaid.save(out_file)

    print("\n" + "="*50)
    print("AI Diagnostic & XAI Explanation:")
    print(f"  Target Image:       {img_path.name}")
    print(f"  Diagnosed Disease:  {report['plant']} - {report['condition']}")
    print(f"  Confidence:         {conf*100:.2f}%")
    print(f"  Action/Remedy:      {report['remedy']}")
    print(f"  Heatmap Saved To:   {out_file}")
    print("="*50 + "\n")


def cmd_app(args):
    app_path = Path(__file__).parent / "app" / "app.py"
    print(f"Launching Streamlit application from {app_path}...")
    subprocess.run([sys.executable, "-m", "streamlit", "run", str(app_path)])


def cmd_api(args):
    import uvicorn
    print(f"\n🌱 Starting FastAPI Inference Server on all interfaces (0.0.0.0:{args.port})...")
    print(f"  💻 Local Computer:     http://127.0.0.1:{args.port}")
    print(f"  📱 Mobile Phone Wi-Fi: http://192.168.0.10:{args.port}")
    print(f"  📖 Swagger UI Docs:    http://127.0.0.1:{args.port}/docs\n")
    uvicorn.run("app.api:app", host=args.host, port=args.port, reload=args.reload)


def cmd_download_dataset(args):
    from scripts.download_dataset import download_plantvillage_subset, print_manual_instructions
    if args.subset:
        download_plantvillage_subset()
    else:
        print_manual_instructions()


def main():
    parser = argparse.ArgumentParser(description="Plant Leaf Disease Detection CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # api
    p_api = subparsers.add_parser("api", help="Launch FastAPI REST Inference Server")
    p_api.add_argument("--host", default="0.0.0.0", help="Host interface")
    p_api.add_argument("--port", type=int, default=8000, help="Port number")
    p_api.add_argument("--reload", action="store_true", help="Enable live auto-reload")
    p_api.set_defaults(func=cmd_api)

    # download-dataset
    p_dl = subparsers.add_parser("download-dataset", help="Download or view instructions for real plant disease datasets")
    p_dl.add_argument("--subset", action="store_true", help="Automatically download real PlantVillage images for Tomato & Potato")
    p_dl.set_defaults(func=cmd_download_dataset)

    # generate-samples
    p_gen = subparsers.add_parser("generate-samples", help="Generate benchmark botanical sample images")
    p_gen.add_argument("--samples-per-class", type=int, default=15)
    p_gen.set_defaults(func=cmd_generate_samples)

    # train
    p_train = subparsers.add_parser("train", help="Train a CNN model")
    p_train.add_argument("--arch", choices=SUPPORTED_ARCHITECTURES, default="mobilenet_v3")
    p_train.add_argument("--epochs", type=int, default=DEFAULT_EPOCHS)
    p_train.add_argument("--batch-size", type=int, default=32)
    p_train.add_argument("--lr", type=float, default=LEARNING_RATE)
    p_train.add_argument("--data-dir", default=str(SAMPLES_DIR))
    p_train.add_argument("--no-pretrained", dest="pretrained", action="store_false", default=True)
    p_train.set_defaults(func=cmd_train)

    # eval
    p_eval = subparsers.add_parser("eval", help="Evaluate a model")
    p_eval.add_argument("--arch", choices=SUPPORTED_ARCHITECTURES, default="mobilenet_v3")
    p_eval.add_argument("--data-dir", default=str(SAMPLES_DIR))
    p_eval.set_defaults(func=cmd_eval)

    # explain
    p_exp = subparsers.add_parser("explain", help="Run Grad-CAM on a leaf image")
    p_exp.add_argument("--image", required=True, help="Path to leaf image")
    p_exp.add_argument("--arch", choices=SUPPORTED_ARCHITECTURES, default="mobilenet_v3")
    p_exp.set_defaults(func=cmd_explain)

    # app
    p_app = subparsers.add_parser("app", help="Launch Streamlit web application")
    p_app.set_defaults(func=cmd_app)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
