# 🌿 Plant Disease Detector

> **Plant Leaf Disease Detection & Explainable AI System**

A simple, fast, and accurate Deep Learning project that detects plant leaf diseases from photographs, provides treatment remedies, and visually explains the diagnosis using AI heatmaps (Grad-CAM).

---

## 📌 1. About the Project

Plant diseases cause severe crop losses for farmers every year. Manual inspection by agricultural experts is time-consuming, expensive, and not accessible to all farmers.

This project uses **Artificial Intelligence (Convolutional Neural Networks - CNN)** to automatically identify plant diseases from leaf photos.

### Key Highlights:
- **Instant Diagnosis:** Detects crop disease and healthy states in less than a second.
- **Explainable AI (Heatmap):** Uses **Grad-CAM** to highlight the exact infected spots on the leaf in red/yellow, proving why the AI made the decision.
- **Farmer-Friendly Remedies:** Suggests practical organic and chemical treatment advice for detected diseases.
- **Interactive Web App:** Easy-to-use web interface built with **Streamlit**.
- **REST API Inference Server:** Built with **FastAPI** to allow mobile apps and IoT devices to connect easily.

---

## 💻 2. Technologies Used

| Technology | Purpose |
| :--- | :--- |
| **Python** | Primary programming language |
| **PyTorch** | Deep Learning framework used to build and train CNN models |
| **MobileNetV3** | Lightweight CNN architecture designed for fast mobile and CPU inference |
| **FastAPI & Uvicorn** | High-performance REST API inference backend with Swagger docs |
| **React 18 & Vite** | Modern, responsive frontend web UI with real-time XAI visualization |
| **Streamlit** | Alternative quick Python web application |
| **OpenCV & PIL** | Image processing and background color segmentation |
| **Matplotlib & Seaborn** | Evaluation graphs and Confusion Matrix generation |

---

## 📂 3. Dataset Used

This project is trained and evaluated on the **PlantVillage Dataset**, containing over **20,000 real leaf images** across 15 classes:

- **Tomato (10 classes):** Early Blight, Late Blight, Bacterial Spot, Leaf Mold, Septoria Leaf Spot, Spider Mites, Target Spot, Mosaic Virus, Yellow Leaf Curl Virus, Healthy.
- **Potato (3 classes):** Early Blight, Late Blight, Healthy.
- **Bell Pepper (2 classes):** Bacterial Spot, Healthy.

---

## ⚙️ 4. How the System Works

```
[ Leaf Photograph ]
        │
        ▼
[ Preprocessing ] ────────► Resizing (224x224) & Optional Background Removal
        │
        ▼
[ CNN Model (MobileNetV3) ] ──► Deep Feature Extraction & Disease Classification
        │
        ├─────────────────────────────┐
        ▼                             ▼
[ Disease & Confidence % ]     [ Grad-CAM Heatmap ]
(e.g., Tomato Early Blight - 92%)  (Red/Yellow highlights on spots)
        │                             │
        └──────────────┬──────────────┘
                       ▼
         [ Practical Remedy Advice ]
    (Organic & Chemical Spray Suggestions)
```

---

## 📁 5. Project Folder Structure

```
plant-disease-detector/
├── frontend/               # Modern React + Vite Web UI
│   ├── src/
│   │   ├── App.jsx         # Main UI component (Upload, Grad-CAM toggle, Remedies)
│   │   ├── index.css       # Clean responsive styles & animations
│   │   └── main.jsx        # React root entrypoint
│   ├── index.html          # HTML entry point
│   ├── package.json        # Frontend dependencies & scripts
│   └── vite.config.js      # Vite dev server & proxy configuration
├── app/
│   ├── api.py              # FastAPI REST Inference Server (Backend)
│   └── app.py              # Streamlit Web Application (Alternative UI)
├── data/
│   ├── raw/                # PlantVillage dataset folder (20,000+ images)
│   └── samples/            # Benchmark sample leaf images for quick testing
├── src/
│   ├── models/             # CNN models (MobileNetV3, Custom CNN, Attention CNN)
│   ├── dataset.py          # Data loading and augmentation code
│   ├── segmentation.py     # Background removal (HSV / Otsu) functions
│   ├── train.py            # Two-stage training with early stopping
│   ├── evaluate.py         # Evaluation and confusion matrix generator
│   └── explainability.py   # Grad-CAM heatmap generator
├── checkpoints/            # Saved trained model weights (.pth files)
├── reports/                # Evaluation reports and confusion matrix images
├── run.py                  # Main CLI runner script
├── requirements.txt        # Required Python libraries
└── README.md               # Project documentation
```

---

## 🚀 6. Step-by-Step Setup & Running Guide

### Prerequisites
Make sure you have the following installed on your system:
- **Python:** 3.9, 3.10, or 3.11 ([Download Python](https://www.python.org/downloads/))
- **Node.js & npm:** Node.js 18+ ([Download Node.js](https://nodejs.org/))
- **Git:** ([Download Git](https://git-scm.com/))

---

### Step 1: Clone the Repository & Navigate to Project Directory
```bash
git clone https://github.com/jazz93900/plant-disease-detector.git
cd plant-disease-detector
```

---

### Step 2: Create a Python Virtual Environment
Creating an isolated virtual environment keeps dependencies contained and avoids version conflicts with other projects:

```bash
# Windows (PowerShell or Command Prompt)
python -m venv venv

# macOS / Linux
python3 -m venv venv
```

---

### Step 3: Activate the Virtual Environment

- **Windows (PowerShell):**
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
  > **Tip (PowerShell):** If you receive a script execution policy error (`running scripts is disabled on this system`), enable local scripts by running:
  > ```powershell
  > Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  > ```
  > Then run `.\venv\Scripts\Activate.ps1` again.

- **Windows (Command Prompt - cmd.exe):**
  ```cmd
  venv\Scripts\activate.bat
  ```

- **macOS / Linux (Bash / Zsh):**
  ```bash
  source venv/bin/activate
  ```

*(Once activated, you will see `(venv)` at the beginning of your terminal command prompt.)*

---

### Step 4: Upgrade pip & Install Python Dependencies
```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

### Step 5: Install Frontend Dependencies (React UI)
```bash
cd frontend
npm install
cd ..
```

---

### Step 6: Verify the Installation (Optional)
Check that the environment and CLI tools are working:
```bash
python run.py --help
```

---

## 💻 7. Running the React Web Application (Frontend + Backend)

The project includes a modern **React (Vite)** frontend web application connected directly to the **FastAPI** inference backend.

### Step 1: Start the FastAPI Backend (Terminal 1)
```bash
python run.py api --port 8000
```
- API Docs: **`http://127.0.0.1:8000/docs`**
- Health Check: **`http://127.0.0.1:8000/health`**

### Step 2: Start the React Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
Open your browser and navigate to:
👉 **`http://localhost:3000`**

### ✨ React App Features:
- **Drag & Drop Upload:** Easily drop any plant leaf image (JPG/PNG).
- **1-Click Test Samples:** Instant demo buttons (Tomato Early Blight, Potato Late Blight, Healthy Leaf) for quick presentations without searching for images.
- **Explainable AI (Grad-CAM):** Interactive toggle to switch between the original leaf photo and the AI attention heatmap highlighting disease lesions.
- **Confidence & Latency:** Real-time percentage score and model execution time in milliseconds.
- **Agronomic Action Card:** Actionable organic/chemical treatment advice for farmers.
- **Background Suppression (ROI):** Optional HSV and Otsu color segmentation filters.
- **Live Status Indicator:** Real-time backend connection status badge.

*(Note: You can also run the quick Streamlit interface with `streamlit run app/app.py`)*

---

## 🌐 8. REST API Inference Server

The project includes a production-ready **FastAPI** inference endpoint. If the server is not already running from Section 7, start it with:

```bash
python run.py api --port 8000
```

- **Interactive API Documentation (Swagger UI):** Open **`http://localhost:8000/docs`** in your browser.
- **Health Check Endpoint:** `GET http://localhost:8000/health`
- **Prediction Endpoint:** `POST http://localhost:8000/predict`

#### Sample JSON Response:
```json
{
  "success": true,
  "plant": "Tomato",
  "condition": "Early blight",
  "is_healthy": false,
  "confidence": 0.9185,
  "remedy": "Ensure good spacing for air circulation. Avoid overhead watering. Apply copper-based or chlorothalonil fungicides.",
  "inference_latency_ms": 11.2,
  "gradcam_heatmap_base64": "..."
}
```

---

## 🛠️ 9. Useful Terminal Commands (CLI)

You can also train, evaluate, or test from the command line:

- **Train the Model (Recommended: 5 Epochs):**
  ```bash
  python run.py train --arch mobilenet_v3 --data-dir data/raw/PlantVillage --epochs 5 --batch-size 32
  ```
  > **💡 Why 5 Epochs is Optimal:**  
  > Because MobileNetV3 utilizes **Two-Stage Transfer Learning** with weights pretrained on ImageNet, it does **not** need 20 or 50 epochs:
  > - **Stage 1 (Epochs 1–3 - Warmup):** Trains the new classifier head for the 15 crop disease classes (**>91% validation accuracy**).
  > - **Stage 2 (Epochs 4–5 - Fine-Tuning):** Unfreezes deep convolutional feature layers with a low learning rate to detect subtle fungal and bacterial lesions (**>96–98% accuracy**).
  > - Stopping at 5–6 epochs saves significant CPU time and prevents overfitting.

- **Evaluate the Model (Generate Confusion Matrix):**
  ```bash
  python run.py eval --arch mobilenet_v3 --data-dir data/raw/PlantVillage
  ```

- **Test a Single Image (CLI Grad-CAM):**
  ```bash
  python run.py explain --image "data/raw/PlantVillage/Tomato_Early_blight" --arch mobilenet_v3
  ```

---

## 📊 10. Results & Performance

- **Model Accuracy:** **98.0%** on validation images.
- **Inference Speed:** Only **9.5 milliseconds** per image (~105 frames per second on CPU).
- **Model Size:** Only **1.08 Million parameters (~4.3 MB)**, making it lightweight enough to run on smartphones or Raspberry Pi edge devices.

### Training Progression (MobileNetV3):
| Epoch | Stage | Val Loss | Val Accuracy | Notes |
| :---: | :---: | :---: | :---: | :---: |
| **01** | Warmup | 0.4056 | 87.82% | Learning disease classes |
| **02** | Warmup | 0.3229 | 90.24% | Crossing 90% |
| **03** | Warmup | 0.2717 | 91.08% | Classifier head aligned |
| **04** | Fine-Tuning | 0.1320 | 95.77% | Rapid jump after unfreezing |
| **05** | Fine-Tuning | 0.1234 | 96.19% | Refining lesion feature maps |
| **06** | Fine-Tuning | 0.0594 | **98.03%** | 🏆 Peak accuracy reached |
| **07** | Fine-Tuning | 0.0565 | **98.00%** | Saturated |

---

## 🔮 11. Future Enhancements

- Build an Android / iOS app using the FastAPI backend.
- Connect drone / greenhouse cameras for automated real-time crop disease surveillance.
- Expand dataset to include more crops like Rice, Wheat, Cotton, and Corn.

---

## 👤 12. Author Information

- **Student Name:** [Your Name]
- **Branch:** Computer Science & Engineering / Information Technology
- **Semester:** 3rd Semester
- **Academic Year:** 2026
