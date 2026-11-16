"""
Training Pipeline for Plant Disease CNN Models
Features: Two-stage fine-tuning, Cosine Annealing, Early Stopping, and Model Checkpointing.
"""

from pathlib import Path
from typing import Dict, List, Optional
import time
import json
import torch
import torch.nn as nn
from torch.optim import AdamW, Adam
from torch.optim.lr_scheduler import CosineAnnealingLR
from torch.utils.data import DataLoader

from src.config import CHECKPOINT_DIR, DEVICE, DEFAULT_EPOCHS, LEARNING_RATE, WEIGHT_DECAY
from src.models import CustomCNN, build_transfer_model, CBAMCNN


def get_model(arch: str, num_classes: int, pretrained: bool = True) -> nn.Module:
    """Factory function for CNN models."""
    arch = arch.lower()
    if arch == "custom_cnn":
        return CustomCNN(num_classes=num_classes)
    elif arch == "cbam_cnn":
        return CBAMCNN(num_classes=num_classes)
    elif arch in ["mobilenet_v3", "resnet50", "efficientnet_b0"]:
        return build_transfer_model(arch_name=arch, num_classes=num_classes, pretrained=pretrained)
    else:
        raise ValueError(f"Unknown architecture: {arch}")


def train_one_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    device: str
) -> Dict[str, float]:
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0

    for images, labels in dataloader:
        images, labels = images.to(device), labels.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * images.size(0)
        _, preds = torch.max(outputs, 1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)

    epoch_loss = total_loss / max(total, 1)
    epoch_acc = correct / max(total, 1)
    return {"loss": epoch_loss, "accuracy": epoch_acc}


def validate(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: str
) -> Dict[str, float]:
    model.eval()
    total_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in dataloader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)

            total_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

    val_loss = total_loss / max(total, 1)
    val_acc = correct / max(total, 1)
    return {"loss": val_loss, "accuracy": val_acc}


def train_model(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    class_names: List[str],
    arch_name: str,
    epochs: int = DEFAULT_EPOCHS,
    lr: float = LEARNING_RATE,
    weight_decay: float = WEIGHT_DECAY,
    device: str = DEVICE,
    patience: int = 5,
    two_stage: bool = True,
    warmup_epochs: int = 3,
    save_dir: Path = CHECKPOINT_DIR
) -> Dict:
    """
    Full training routine with Two-Stage Fine-Tuning, Cosine Annealing, Early Stopping, and Checkpointing.
    Stage 1: Freeze backbone, train classification head (prevents catastrophic forgetting).
    Stage 2: Unfreeze backbone, fine-tune end-to-end with reduced learning rate.
    """
    model = model.to(device)
    save_dir.mkdir(parents=True, exist_ok=True)
    criterion = nn.CrossEntropyLoss()

    is_transfer = hasattr(model, "freeze_backbone") and hasattr(model, "unfreeze_backbone") and two_stage

    if is_transfer:
        print(f"\n[Stage 1/2: Warmup] Freezing backbone, training classifier head for {warmup_epochs} epochs...")
        model.freeze_backbone()
        optimizer = AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=lr, weight_decay=weight_decay)
    else:
        optimizer = AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)

    scheduler = CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)

    best_val_loss = float("inf")
    best_val_acc = 0.0
    epochs_no_improve = 0
    history = {"train_loss": [], "train_acc": [], "val_loss": [], "val_acc": []}

    print(f"\n[Training] Architecture: {arch_name} | Device: {device} | Total Epochs: {epochs}")
    start_time = time.time()

    for epoch in range(1, epochs + 1):
        # Transition from Stage 1 to Stage 2
        if is_transfer and epoch == warmup_epochs + 1:
            print(f"\n[Stage 2/2: Fine-Tuning] Unfreezing backbone with reduced learning rate ({lr * 0.1:.6f})...")
            model.unfreeze_backbone()
            optimizer = AdamW(model.parameters(), lr=lr * 0.1, weight_decay=weight_decay)
            scheduler = CosineAnnealingLR(optimizer, T_max=(epochs - warmup_epochs), eta_min=1e-6)

        train_metrics = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_metrics = validate(model, val_loader, criterion, device)
        scheduler.step()

        history["train_loss"].append(train_metrics["loss"])
        history["train_acc"].append(train_metrics["accuracy"])
        history["val_loss"].append(val_metrics["loss"])
        history["val_acc"].append(val_metrics["accuracy"])

        print(
            f"Epoch {epoch:02d}/{epochs:02d} | "
            f"Train Loss: {train_metrics['loss']:.4f} - Train Acc: {train_metrics['accuracy']:.4f} | "
            f"Val Loss: {val_metrics['loss']:.4f} - Val Acc: {val_metrics['accuracy']:.4f}"
        )

        # Checkpointing
        if val_metrics["loss"] < best_val_loss:
            best_val_loss = val_metrics["loss"]
            best_val_acc = val_metrics["accuracy"]
            epochs_no_improve = 0

            checkpoint = {
                "epoch": epoch,
                "arch": arch_name,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "class_names": class_names,
                "val_loss": best_val_loss,
                "val_acc": best_val_acc
            }
            torch.save(checkpoint, save_dir / f"{arch_name}_best.pth")
            # Also save as default best_model.pth
            torch.save(checkpoint, save_dir / "best_model.pth")
        else:
            epochs_no_improve += 1
            if epochs_no_improve >= patience:
                print(f"Early stopping triggered after {epoch} epochs.")
                break

    elapsed = time.time() - start_time
    print(f"[Done] Best Val Accuracy: {best_val_acc*100:.2f}% | Elapsed Time: {elapsed:.1f}s")

    # Save training history and class mapping metadata
    metadata = {
        "arch": arch_name,
        "class_names": class_names,
        "num_classes": len(class_names),
        "best_val_acc": best_val_acc,
        "best_val_loss": best_val_loss,
        "epochs_trained": epoch,
        "history": history
    }
    with open(save_dir / f"{arch_name}_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    return metadata
