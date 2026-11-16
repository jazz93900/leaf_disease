"""
Transfer Learning CNN Backbones for Plant Disease Classification
Supports MobileNetV3 (Edge/Mobile), ResNet50, and EfficientNet-B0.
"""

from typing import Tuple
import torch
import torch.nn as nn
from torchvision import models


class TransferCNN(nn.Module):
    def __init__(
        self,
        arch_name: str = "mobilenet_v3",
        num_classes: int = 16,
        pretrained: bool = True,
        dropout: float = 0.3
    ):
        super().__init__()
        self.arch_name = arch_name.lower()
        self.num_classes = num_classes

        if "mobilenet" in self.arch_name:
            weights = models.MobileNet_V3_Small_Weights.DEFAULT if pretrained else None
            self.backbone = models.mobilenet_v3_small(weights=weights)
            in_features = self.backbone.classifier[0].in_features
            self.backbone.classifier = nn.Sequential(
                nn.Linear(in_features, 256),
                nn.Hardswish(inplace=True),
                nn.Dropout(p=dropout),
                nn.Linear(256, num_classes)
            )
            self._last_conv = self.backbone.features[-1]

        elif "resnet" in self.arch_name:
            weights = models.ResNet50_Weights.DEFAULT if pretrained else None
            self.backbone = models.resnet50(weights=weights)
            in_features = self.backbone.fc.in_features
            self.backbone.fc = nn.Sequential(
                nn.Linear(in_features, 256),
                nn.ReLU(inplace=True),
                nn.Dropout(p=dropout),
                nn.Linear(256, num_classes)
            )
            self._last_conv = self.backbone.layer4[-1].conv3

        elif "efficientnet" in self.arch_name:
            weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
            self.backbone = models.efficientnet_b0(weights=weights)
            in_features = self.backbone.classifier[1].in_features
            self.backbone.classifier = nn.Sequential(
                nn.Dropout(p=dropout),
                nn.Linear(in_features, num_classes)
            )
            self._last_conv = self.backbone.features[-1]

        else:
            raise ValueError(f"Unsupported transfer learning architecture: {arch_name}")

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(x)

    def get_last_conv_layer(self) -> nn.Module:
        """Returns the final convolutional layer for Grad-CAM."""
        return self._last_conv

    def freeze_backbone(self):
        """Freezes feature extractor layers for Stage 1 fine-tuning."""
        for param in self.backbone.parameters():
            param.requires_grad = False

        if "mobilenet" in self.arch_name or "efficientnet" in self.arch_name:
            for param in self.backbone.classifier.parameters():
                param.requires_grad = True
        elif "resnet" in self.arch_name:
            for param in self.backbone.fc.parameters():
                param.requires_grad = True

    def unfreeze_backbone(self):
        """Unfreezes all layers for Stage 2 end-to-end fine-tuning."""
        for param in self.backbone.parameters():
            param.requires_grad = True


def build_transfer_model(
    arch_name: str = "mobilenet_v3",
    num_classes: int = 16,
    pretrained: bool = True
) -> TransferCNN:
    return TransferCNN(arch_name=arch_name, num_classes=num_classes, pretrained=pretrained)
