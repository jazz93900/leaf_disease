# 📱 AgriVision Mobile Application

[![Expo](https://img.shields.io/badge/Expo-SDK_58-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-0.74+-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![Platform](https://img.shields.io/badge/Platforms-Android%20%7C%20iOS%20%7C%20Web-brightgreen)](#)

Cross-platform mobile application for **AgriVision** built with **React Native** and **Expo SDK 58**. It provides a 3-leaf canopy scanner, OpenCV quality validation, GPS weather telemetry, an agronomic dosage questionnaire, and farmer support triage.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js:** 18+ LTS
- **Expo Go App:** Installed on your physical Android or iOS device
- **Backend Running:** Ensure FastAPI server is running on the host machine (`python run.py api --port 8000`)

### 2. Install Dependencies
```bash
cd mobile
npm install
```

### 3. Launch the Application
```bash
npx expo start --clear
```

- **Physical Phone:** Scan the terminal QR code with the **Expo Go** app (Android) or default Camera app (iOS).
- **Web Browser:** Press `w` in the terminal to open the web version at `http://localhost:8081`.

---

## 📱 Navigation & Screen Architecture

The mobile app implements a 4-tab bottom navigation using `@react-navigation/bottom-tabs`:

1. **`Diagnose` ([DiagnoseScreen.js](src/screens/DiagnoseScreen.js)):**
   - 3-Leaf Slot Scanner (Upper, Middle, Lower canopy angles).
   - Real-time quality rejection banner (`"Image blurry or dark, please click again"`).
   - Single-leaf auto-fill fallback: Uses 1 main photo with dummy auxiliary slots if 3 leaves are unavailable.
   - Interactive Grad-CAM heatmap overlay modal.
   - Critical disease outbreak warning banner.

2. **`Weather` ([WeatherScreen.js](src/screens/WeatherScreen.js)):**
   - Queries `expo-location` for device GPS coordinates.
   - Fetches live temperature, relative humidity, and precipitation via Open-Meteo.
   - Displays microclimate disease outbreak risk metrics (e.g., Fungal Blight warning if humidity $> 80\%$).

3. **`Questionnaire` ([QuestionnaireScreen.js](src/screens/QuestionnaireScreen.js)):**
   - 5-step post-scan triage survey:
     1. Crop Growth Stage (Seedling, Vegetative, Flowering, Fruiting)
     2. Canopy Spread Fraction ($<10\%$, $10-30\%$, $>50\%$)
     3. Soil Drainage Condition (Dry, Moist, Waterlogged)
     4. Sunlight Level (Full Sun, Shade, Greenhouse)
     5. Organic vs. Chemical Preference
   - Dynamically recalculates spray dosage and application frequency.

4. **`Support` ([SupportScreen.js](src/screens/SupportScreen.js)):**
   - Persona switch: **Farmer** vs. **Home Gardener**.
   - 1-Tap emergency dialer to the Government Kisan Call Centre (`1800-180-1551`).
   - Automated "Dr. AgriBot" triage consultation chat.
   - Escalation ticket dispatcher for severe disease alerts.

---

## ⚙️ Configuration & Network Setup

Configuration is handled in [src/config/api.js](src/config/api.js):
- **Web Browser Host:** `http://127.0.0.1:8000`
- **Mobile Device Host:** `http://192.168.0.10:8000` (Configure this to your PC's local Wi-Fi IPv4 address)
- **Open-Meteo API:** Direct client-side fetch using device GPS latitude and longitude.
