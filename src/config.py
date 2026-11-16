from pathlib import Path
import os
import torch

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
MPL_DIR = BASE_DIR / ".mplconfig"
MPL_DIR.mkdir(parents=True, exist_ok=True)
os.environ["MPLCONFIGDIR"] = str(MPL_DIR)
DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
SAMPLES_DIR = DATA_DIR / "samples"
CHECKPOINT_DIR = BASE_DIR / "checkpoints"
REPORTS_DIR = BASE_DIR / "reports"

# Ensure runtime directories exist
for directory in [DATA_DIR, RAW_DATA_DIR, PROCESSED_DATA_DIR, SAMPLES_DIR, CHECKPOINT_DIR, REPORTS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Training Hyperparameters
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32
NUM_WORKERS = 0  # 0 is safest on Windows
DEFAULT_EPOCHS = 20
LEARNING_RATE = 1e-3
WEIGHT_DECAY = 1e-4
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Supported CNN Architectures
SUPPORTED_ARCHITECTURES = [
    "custom_cnn",       # Tailored 5-block convolutional baseline
    "mobilenet_v3",     # Lightweight edge model for mobile/farm deployment
    "resnet50",         # Deep residual backbone
    "efficientnet_b0",  # Parameter-efficient compound scaling
    "cbam_cnn"          # Attention-augmented CNN (CBAM)
]

# Standard 10 common crop-disease benchmark classes (customizable to all 38 PlantVillage classes)
DEFAULT_CLASSES = [
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___healthy",
    "Corn___Cercospora_leaf_spot",
    "Corn___Common_rust",
    "Corn___Northern_Leaf_Blight",
    "Corn___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___healthy"
]

# Agronomic remediation guide for decision support (Explainable XAI + Practical Action)
DISEASE_REMEDIES = {
    "Apple_scab": "Apply fungicide such as captan or myclobutanil early in the season. Rake and dispose of fallen infected leaves.",
    "Black_rot": "Prune out dead or diseased wood. Remove mummified fruit from trees and ground. Apply copper or thiophanate-methyl.",
    "Cedar_apple_rust": "Remove nearby juniper/cedar hosts if possible. Apply protective fungicidal sprays at the pink bud stage.",
    "Cercospora_leaf_spot": "Rotate crops every 2-3 years. Use resistant hybrids. Apply strobilurin or triazole fungicides if severe.",
    "Common_rust": "Plant resistant cultivars. Apply foliar fungicides early if pustules appear before silking and weather is cool/humid.",
    "Northern_Leaf_Blight": "Incorporate crop residues by tillage. Use resistant hybrids. Treat with fungicides at first appearance.",
    "Early_blight": "Ensure good spacing for air circulation. Avoid overhead watering. Apply copper-based or chlorothalonil fungicides.",
    "Late_blight": "Immediately remove and destroy infected vines. Apply preventative systemic fungicides (mancozeb, chlorothalonil).",
    "Bacterial_spot": "Use certified pathogen-free seeds. Avoid overhead irrigation. Treat with fixed copper combined with mancozeb.",
    "Leaf_Mold": "Improve greenhouse ventilation and lower humidity (<85%). Space plants properly. Use preventative copper fungicides.",
    "healthy": "Crop shows vigorous vegetative growth with no visible foliar lesions. Maintain standard fertilization and irrigation."
}
