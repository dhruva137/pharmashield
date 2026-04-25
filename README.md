# PharmaShield — National Pharma-Import Dependency Intelligence

![Phase 1 — WIP](https://img.shields.io/badge/Phase%201-WIP-orange)
![License](https://img.shields.io/badge/License-MIT-blue)
![Stack](https://img.shields.io/badge/Built%20with-Gemini%20%2B%20Flutter%20%2B%20FastAPI-green)

## The Problem
India, despite being the "pharmacy of the world," faces a critical structural vulnerability in its drug supply chain. For a significant portion of its life-saving medications, the industry relies on a concentrated cluster of manufacturers in a few foreign provinces. As highlighted by the Observer Research Foundation (Nov 2025): **"India still lacks a unified, constantly updated dashboard of its critical health import dependencies,"** leaving the national healthcare infrastructure reactive to external shocks, environmental shutdowns, and trade anomalies.

## The Solution
PharmaShield is an intelligence dashboard designed to map, monitor, and model India's pharmaceutical import dependencies. It transforms fragmented trade notices, environmental reports, and FDA alerts into a unified knowledge graph for strategic decision-making.

- **Supply Chain Graph**: Real-time visualization of dependencies from Finished Dosage Forms (FDF) down to Key Starting Materials (KSM).
- **Multi-Source Ingestion**: Automated pipelines for Hebei EPB notices, FDA Import Alerts, and DGCI&S trade data.
- **GNN Shock Propagation**: A Graph Neural Network that predicts how a localized factory shutdown propagates through the national supply of essential medicines.
- **Gemini RAG Analyst**: A natural-language interface to query complex dependency risks and regulatory history.
- **What-If Simulator**: Scenario modeling for lockdowns, geopolitical disruptions, and logistics bottlenecks.

## Demo
- **Live Application**: [Live URL Placeholder]
- **Video Walkthrough**: [YouTube Demo Placeholder]

## Architecture
```text
[ Flutter Web ] <------> [ FastAPI on Render ]
                             |
                             +---- [ Seed JSON Data ]
                             +---- [ Qdrant Vector Store ]
                             +---- [ Gemini 2.5 API ]
                             +---- [ GNN Weights (PyTorch) ]
```

## Tech Stack
| Layer | Tool | Cost |
| :--- | :--- | :--- |
| **Frontend** | Flutter Web 3.24 | Free |
| **Backend** | FastAPI (Python 3.11) | Free (Render) |
| **Intelligence** | Gemini 2.5 Flash/Pro | Pay-as-you-go |
| **Vector DB** | Qdrant | Free Tier |
| **Modeling** | PyTorch Geometric | Free |

## Setup

### Prerequisites
- Python 3.11+
- Flutter 3.24+
- Node.js 20+

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `pip install -r requirements.txt`
3. Configure environment: `cp ../.env.example ../.env` (Add your API keys)
4. Start server: `uvicorn app.main:app --reload --port 8080`

### Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install packages: `flutter pub get`
3. Run in Chrome: `flutter run -d chrome --dart-define=BACKEND_URL=http://localhost:8080`

## Project Structure
- `backend/`: FastAPI application, services, and Pydantic models.
- `frontend/`: Flutter Web dashboard and UI components.
- `ml/`: GNN training scripts and model weights.
- `ingestion/`: Scrapers and trade data importers.
- `data/`: Seed snapshots and raw ingestion buffers.
- `docs/`: Architecture diagrams and research notes.

## Phase 1 vs Phase 2
**Phase 1 (Current)**: The system utilizes high-fidelity committed snapshots (seed data) to demonstrate the graph logic, simulation accuracy, and RAG analyst capabilities.
**Phase 2**: Wires live scrapers for real-time monitoring of Hebei EPB and FDA portals.

## Citations
- **ORF (Nov 2025)**: India's Pharma Dependency Report.
- **NITI Aayog**: Production Linked Incentive (PLI) Scheme Guidelines.
- **FDA**: Drug Shortage Database 2025.
- **Pharmexcil**: Annual Export/Import Performance Reviews.
- **NLEM 2022**: National List of Essential Medicines.

## Team
[PharmaShield Team Placeholder]

## License
MIT License. See [LICENSE](LICENSE) for details.
