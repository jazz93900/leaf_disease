"""
Custom CNN Baseline for Plant Disease Classification
Implements a 5-block convolutional architecture with BatchNorm and Dropout.
"""

import torch
import torch.nn as nn


class ConvBlock(nn.Module):
    def __init__(self, in_channels: int, out_channels: int, dropout: float = 0.2):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
            nn.Dropout2d(dropout)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class CustomCNN(nn.Module):
    """
    Standard Custom CNN architecture for foliar disease classification.
    Input size: (B, 3, 224, 224) -> Output: (B, num_classes)
    """
    def __init__(self, num_classes: int = 16, dropout: float = 0.3):
        super().__init__()
        self.block1 = ConvBlock(3, 32, dropout=0.1)      # 224 -> 112
        self.block2 = ConvBlock(32, 64, dropout=0.2)     # 112 -> 56
        self.block3 = ConvBlock(64, 128, dropout=0.2)    # 56 -> 28
        self.block4 = ConvBlock(128, 256, dropout=0.3)   # 28 -> 14
        self.block5 = ConvBlock(256, 512, dropout=0.3)   # 14 -> 7

        self.global_pool = nn.AdaptiveAvgPool2d((1, 1))
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(256, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.block1(x)
        x = self.block2(x)
        x = self.block3(x)
        x = self.block4(x)
        x = self.block5(x)
        x = self.global_pool(x)
        logits = self.classifier(x)
        return logits

    def get_last_conv_layer(self) -> nn.Module:
        """Returns the final convolutional layer for Grad-CAM activations."""
        return self.block5.block[3]
