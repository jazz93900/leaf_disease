"""
Evaluation and Benchmarking Module
Computes Multi-Class Confusion Matrix, Macro-F1, Precision, Recall,
and Model Inference Latency & Parameter Counts.
"""

from pathlib import Path
from typing import Dict, List, Tuple
import time
import json
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support

from src.config import REPORTS_DIR, DEVICE


def benchmark_inference_speed(
    model: nn.Module,
    input_size: Tuple[int, int, int, int] = (1, 3, 224, 224),
    device: str = DEVICE,
    iterations: int = 50
) -> float:
    """
    Measures average inference latency in milliseconds per image.
    """
    model.eval()
    dummy_input = torch.randn(*input_size).to(device)

    # Warmup
    with torch.no_grad():
        for _ in range(10):
            _ = model(dummy_input)

    start_time = time.perf_counter()
    with torch.no_grad():
        for _ in range(iterations):
            _ = model(dummy_input)
    elapsed = (time.perf_counter() - start_time) / iterations * 1000.0
    return float(elapsed)


def evaluate_model(
    model: nn.Module,
    test_loader: DataLoader,
    class_names: List[str],
    arch_name: str,
    device: str = DEVICE,
    reports_dir: Path = REPORTS_DIR
) -> Dict:
    """
    Evaluates model on test dataset and generates confusion matrix visualization and metrics.
    """
    model = model.to(device)
    model.eval()
    reports_dir.mkdir(parents=True, exist_ok=True)

    all_preds: List[int] = []
    all_targets: List[int] = []

    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device)
            outputs = model(images)
            _, preds = torch.max(outputs, 1)

            all_preds.extend(preds.cpu().numpy().tolist())
            all_targets.extend(labels.numpy().tolist())

    accuracy = float(accuracy_score(all_targets, all_preds))
    precision, recall, f1, _ = precision_recall_fscore_support(all_targets, all_preds, average="macro", zero_division=0)

    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)

    # Latency benchmark
    latency_ms = benchmark_inference_speed(model, device=device)

    # Confusion matrix
    cm = confusion_matrix(all_targets, all_preds)
    fig, ax = plt.subplots(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Greens",
                xticklabels=[c.split("___")[-1][:12] for c in class_names],
                yticklabels=[c.split("___")[-1][:12] for c in class_names],
                ax=ax)
    plt.title(f"Confusion Matrix: {arch_name} (Acc: {accuracy*100:.1f}%)")
    plt.xlabel("Predicted Label")
    plt.ylabel("True Label")
    plt.tight_layout()
    cm_path = reports_dir / f"{arch_name}_confusion_matrix.png"
    plt.savefig(cm_path, dpi=300)
    plt.close()

    metrics = {
        "architecture": arch_name,
        "test_accuracy": accuracy,
        "macro_precision": float(precision),
        "macro_recall": float(recall),
        "macro_f1": float(f1),
        "total_parameters_M": round(total_params / 1e6, 2),
        "trainable_parameters_M": round(trainable_params / 1e6, 2),
        "latency_ms_per_image": round(latency_ms, 2),
        "confusion_matrix_path": str(cm_path)
    }

    with open(reports_dir / f"{arch_name}_eval_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print("\n" + "="*50)
    print(f"Evaluation Results for {arch_name}:")
    print(f"  Test Accuracy:        {accuracy*100:.2f}%")
    print(f"  Macro F1-Score:       {f1:.4f}")
    print(f"  Macro Precision:      {precision:.4f}")
    print(f"  Macro Recall:         {recall:.4f}")
    print(f"  Total Parameters:     {metrics['total_parameters_M']} M")
    print(f"  Inference Latency:    {metrics['latency_ms_per_image']} ms / image")
    print("="*50 + "\n")

    return metrics
