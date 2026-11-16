"""
Leaf and Lesion Segmentation Module
Implements background suppression and Region of Interest (ROI) extraction.
"""

from typing import Tuple, Optional
import cv2
import numpy as np
from PIL import Image


def segment_leaf_hsv(
    image: np.ndarray,
    lower_green: Tuple[int, int, int] = (25, 30, 30),
    upper_green: Tuple[int, int, int] = (85, 255, 255),
    apply_morphology: bool = True
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Isolates healthy/diseased foliar tissue from background using HSV color thresholding.
    
    Args:
        image: RGB image as numpy array (H, W, 3).
        lower_green: Lower HSV bound for leaf tissue.
        upper_green: Upper HSV bound for leaf tissue.
        apply_morphology: Whether to apply closing/opening to fill holes.
        
    Returns:
        segmented_image: RGB image with background masked out to black.
        mask: Binary mask (255 for leaf, 0 for background).
    """
    hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
    mask = cv2.inRange(hsv, np.array(lower_green), np.array(upper_green))

    # Also capture chlorotic / necrotic yellow-brown lesion regions
    lower_necrotic = np.array([10, 40, 40])
    upper_necrotic = np.array([25, 255, 255])
    necrotic_mask = cv2.inRange(hsv, lower_necrotic, upper_necrotic)

    combined_mask = cv2.bitwise_or(mask, necrotic_mask)

    if apply_morphology:
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel, iterations=1)

    segmented = cv2.bitwise_and(image, image, mask=combined_mask)
    return segmented, combined_mask


def segment_leaf_otsu(image: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Otsu-based thresholding on grayscale / CIELAB a* channel (green-magenta axis).
    Effective for separating green leaf canopy from soil and neutral backgrounds.
    """
    lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
    a_channel = lab[:, :, 1]  # Green is low, magenta is high

    # Invert so green areas are bright
    inv_a = cv2.bitwise_not(a_channel)
    _, mask = cv2.threshold(inv_a, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    segmented = cv2.bitwise_and(image, image, mask=mask)
    return segmented, mask


def preprocess_image_with_roi(image_path: str, method: str = "none") -> np.ndarray:
    """
    Loads an image and optionally applies background suppression.
    
    Args:
        image_path: Path to the image file.
        method: One of ['none', 'hsv', 'otsu'].
    """
    img = Image.open(image_path).convert("RGB")
    img_np = np.array(img)

    if method == "hsv":
        segmented, _ = segment_leaf_hsv(img_np)
        return segmented
    elif method == "otsu":
        segmented, _ = segment_leaf_otsu(img_np)
        return segmented
    return img_np
