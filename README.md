# ShockMap Intelligence Platform
### *National Supply Chain Security & Disruption Command Center*

**ShockMap** is a high-fidelity geospatial intelligence platform designed to secure India's critical import dependencies (Pharma APIs & Rare Earth Minerals). Built for the **Google Solution Challenge 2026**, it transforms unstructured global disruption signals into actionable procurement intelligence.

---

## ⚡ The 3-Engine Architecture

ShockMap operates on a proprietary triple-engine workflow that bridges the gap between news and action:

1.  **Engine 1: Signal Intelligence (NER & Extraction)**
    *   Autonomous scanning of global trade news, policy shifts, and port telemetry via GDELT.
    *   Entity extraction identifies provinces (e.g., Hebei), sectors (Pharma), and event types (Export Ban).

2.  **Engine 2: Propagation Intelligence (Graph Theory)**
    *   Models the supply chain as a complex network of 60+ nodes and 70+ corridors.
    *   Uses **Personalized PageRank** and **Louvain Community Detection** to calculate how a factory shutdown in China ripples through Indian manufacturing states.

3.  **Engine 3: Action Intelligence (Grounded RAG)**
    *   Powered by **Gemini 2.0 Flash**.
    *   Generates specific 72-hour action plans (e.g., "Secure 18 MT of PAP from SE Asia") grounded in NLEM policy and real-time telemetry.

---

## 🚀 Key Features (The "WOW" Factors)

*   **Geospatial Risk Heatmap**: Real-time visualization of supply nodes in China and absorption nodes in India.
*   **Animated Propagation Graph**: WebGL-rendered supply network featuring **live particle flow** on disrupted corridors and **ripple-effect** shock simulations.
*   **War Room Command Center**: Cinematic incident detail pages with stockout countdowns and multi-path response simulators.
*   **AI Operator Analyst**: Natural language interface with streaming typewriter responses and evidence-backed citations.

---

## 🛠️ Technical Stack

*   **Frontend**: React 19, Vite, Leaflet (Geospatial), Sigma.js (WebGL Graph), Framer Motion.
*   **Backend**: FastAPI, Pydantic v2, Python 3.11.
*   **Intelligence**: Gemini 2.0 Flash (Action Gen), NetworkX (Propagation), GDELT (Live Signal Intake).
*   **Geocoding**: Google Maps Platform (Primary) + Nominatim (Fallback).

---

## 🌍 Deployment Guide

ShockMap is production-ready and optimized for high-performance edge deployment.

### 1. Backend (Render)
*   **Service Type**: Docker (Web + Background Worker)
*   **Config**: Uses `render.yaml` for automatic infrastructure provisioning.
*   **Environment**:
    *   `GEMINI_API_KEY`: Required for Engine 3.
    *   `GOOGLE_MAPS_API_KEY`: Required for Geospatial Intel.
    *   `PORT`: 8080

### 2. Frontend (Netlify / Vercel)
*   **Build Command**: `npm run build`
*   **Publish Directory**: `dist`
*   **Environment**:
    *   `VITE_BACKEND_URL`: Points to your deployed Render API.
    *   `VITE_GOOGLE_MAPS_API_KEY`: Client-side map rendering key.

---

## 💻 Local Development

### Prerequisites
*   Node.js 20+
*   Python 3.11+
*   Google Maps API Key
*   Gemini API Key

### Installation
```bash
# Clone the repository
git clone https://github.com/dhruva137/pharmashield.git
cd pharmashield

# Start Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload

# Start Frontend
cd ../frontend
npm install
npm run dev
```

---

## 📊 MVP Coverage
*   **20+** Essential Medicines (NLEM)
*   **25+** Critical Pharma APIs
*   **8** Strategic Rare Earth Minerals
*   **52** International Supply Corridors
*   **15** Indian Manufacturing States

---

### Google Solution Challenge 2026
*Developed by Dhruva P Gowda*
*MIT License*
