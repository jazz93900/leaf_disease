"""
Dataset Download and Preparation Script
Provides automated download and organization instructions for PlantVillage and PlantDoc datasets.
"""

import argparse
from pathlib import Path
import subprocess
import sys
import shutil

# Ensure project root is in sys.path regardless of where the script is executed from
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.config import RAW_DATA_DIR, PROCESSED_DATA_DIR


def download_plantvillage_subset(crops=("Tomato", "Potato")):
    """
    Downloads real PlantVillage images for selected crops using git sparse-checkout.
    """
    target_dir = RAW_DATA_DIR / "PlantVillage"
    target_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n[Dataset Downloader] Fetching real PlantVillage images for {crops}...")
    temp_repo = RAW_DATA_DIR / "temp_pv_repo"

    try:
        # Clone repo structure without blobs
        print("Cloning repository metadata from spMohanty/PlantVillage-Dataset...")
        subprocess.run([
            "git", "clone", "--filter=blob:none", "--no-checkout", "--depth=1",
            "https://github.com/spMohanty/PlantVillage-Dataset.git", str(temp_repo)
        ], check=True)

        # Set sparse paths for requested crops
        sparse_paths = [f"raw/color/{crop}*" for crop in crops]
        print(f"Configuring sparse checkout paths: {sparse_paths}")
        subprocess.run(["git", "-C", str(temp_repo), "sparse-checkout", "set"] + sparse_paths, check=True)
        subprocess.run(["git", "-C", str(temp_repo), "checkout", "master"], check=True)

        # Move downloaded folders to target
        color_dir = temp_repo / "raw" / "color"
        if color_dir.exists():
            for folder in color_dir.iterdir():
                if folder.is_dir():
                    dest = target_dir / folder.name
                    if dest.exists():
                        shutil.rmtree(dest)
                    shutil.move(str(folder), str(dest))
                    print(f"  Extracted: {folder.name} ({len(list(dest.glob('*.*')))} images)")

        # Cleanup temp repo
        shutil.rmtree(temp_repo, ignore_errors=True)
        print(f"\n[Success] Dataset ready at: {target_dir}")
        print(f"Train on this real dataset using:")
        print(f"  python run.py train --arch mobilenet_v3 --data-dir data/raw/PlantVillage --epochs 15\n")

    except Exception as e:
        print(f"\n[Error] Automatic download failed: {e}")
        print_manual_instructions()


def print_manual_instructions():
    print("""
=============================================================================
Plant Leaf Disease Dataset Setup Instructions:
=============================================================================

1. Automated Direct Download (Fast real data for Tomato & Potato):
   python scripts/download_dataset.py --download-subset

2. Full PlantVillage Dataset (54k images across 14 crops):
   - Option A (Kaggle CLI):
     kaggle datasets download -d emmarex/plantdisease -p data/raw/
     unzip data/raw/plantdisease.zip -d data/raw/PlantVillage/
   - Option B (Web Browser):
     Download from https://www.kaggle.com/datasets/emmarex/plantdisease
     Extract images into 'data/raw/PlantVillage/'

3. Real-World Field Dataset (PlantDoc - In-Field Conditions):
   git clone https://github.com/pratikkayal/PlantDoc-Dataset data/raw/PlantDoc

4. Quickstart Benchmark Mode (Active by default):
   - Without external downloads, run.py uses data/samples/ for instant pipeline testing.
=============================================================================
""")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Plant Leaf Disease Dataset Helper")
    parser.add_argument("--download-subset", action="store_true", help="Download Tomato & Potato real PlantVillage images")
    parser.add_argument("--info", action="store_true", help="Print download instructions")
    args = parser.parse_args()

    if args.download_subset:
        download_plantvillage_subset()
    else:
        print_manual_instructions()
