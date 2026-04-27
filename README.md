# ShockMap — Supply Chain Intelligence Platform

> Predict supply chain disruptions before they become crises.

ShockMap is a three-engine geospatial intelligence platform that monitors pharmaceutical and rare-earth supply chains in real time, propagates risk across dependency graphs, and surfaces actionable procurement recommendations — 67 days before a COVID-scale collapse becomes visible to the market.

---

## Architecture

```
GDELT Signal Feed  ──►  Engine 1: NER Extraction (Gemini)
                               │
                               ▼
                    Engine 2: Graph Propagation (PageRank + Louvain)
                               │
                               ▼
                    Engine 3: RAG Intelligence (Qdrant + Gemini)
                               │
                               ▼
                    REST API  ──►  React Intelligence Surface
```

### Engine 1 — Signal Ingestion
- Polls GDELT every 15 minutes for supply chain disruption signals
- Filters: `factory shutdown`, `export ban`, `port closure`, `contamination`
- Gemini-powered NER extracts structured events from unstructured news text
- Persists to `data/shocks.json`

### Engine 2 — Graph Propagation
- NetworkX graph: 20 pharma API nodes + 8 rare earth mineral nodes
- Edges weighted by India import volume
- Personalized PageRank for risk propagation
- Louvain community detection to identify supply clusters
- Falls back to PageRank if GNN weights are unavailable

### Engine 3 — RAG Intelligence
- Qdrant vector store (`pharmashield_kb` collection)
- Gemini embeddings for semantic document retrieval
- Grounded procurement action recommendations per shock event

---

## Key Features

| Feature | Description |
|---|---|
| **Global Supply Map** | Interactive Leaflet map with China province nodes, India state nodes, and international supplier corridors (USA → JNPT Mumbai, Germany → Mundra, Vietnam → Chennai, etc.) |
| **India In-Depth** | State-level pharmaceutical manufacturing exposure — risk table, China dependency scores, stockpile tracking, entry port mapping |
| **COVID Backtest** | Animated signal-flow demonstration: how ShockMap's 3-engine architecture would have predicted the 2020 supply collapse 67 days before WHO declaration |
| **Live Shock Feed** | Real-time GDELT-powered supply events with severity filter, sector filter, and date range picker |
| **Propagation Graph** | Interactive dependency network — click any node to trace upstream sources and downstream drug exposure across India |
| **Shock Simulator** | Inject synthetic shock scenarios and observe propagated risk across the graph |
| **Ask ShockMap** | Gemini-powered procurement analyst — natural language queries grounded in supply chain knowledge base |

---

## Stack

**Backend**
- Python 3.11 + FastAPI + Uvicorn
- NetworkX (graph engine), NetworkX-LOUVAIN (community detection)
- Google Gemini API (NER + RAG generation)
- Qdrant Cloud (vector store)
- GDELT API (signal ingestion)

**Frontend**
- React 19 + Vite
- React-Leaflet (geospatial maps)
- React Router v6

---

## Running Locally

### Prerequisites
- Python 3.11+
- Node 20+
- Gemini API key
- Qdrant Cloud credentials (or local Qdrant instance)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS / Linux

pip install -r requirements.txt

# Set environment variables
$env:GEMINI_API_KEY="your-key"
$env:QDRANT_URL="https://your-cluster.qdrant.io:6333"
$env:QDRANT_API_KEY="your-qdrant-key"

uvicorn app.main:app --host 127.0.0.1 --port 8081 --reload
```

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

> **Note:** Vite proxies `/api` to `http://localhost:8081`. If you change the backend port, update `frontend/vite.config.js`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for NER + RAG |
| `QDRANT_URL` | Yes | Qdrant cluster URL |
| `QDRANT_API_KEY` | Yes | Qdrant API key |
| `SHOCK_FEED_MODE` | No | `live` / `demo` / `hybrid_demo_live` (default: `demo`) |
| `GNN_ENABLED` | No | `false` (default) — enables GNN propagation when `true` |

---

## API Reference

| Endpoint | Description |
|---|---|
| `GET /healthz` | System health, engine status, feed mode |
| `GET /api/v1/shocks` | Live shock feed (filterable) |
| `GET /api/v1/shocks/{id}` | Single shock detail |
| `GET /api/v1/graph` | Full dependency graph (nodes + edges) |
| `GET /api/v1/engines/status` | Engine 1/2/3 operational status |
| `GET /api/v1/map/heatmap` | Geospatial risk points |
| `GET /api/v1/map/supply-corridors` | Active supply corridor data |
| `GET /api/v1/map/stats` | Aggregate map statistics |
| `POST /api/v1/simulate` | Inject synthetic shock scenario |
| `POST /api/v1/query` | Natural language procurement query |

---

## Data Contracts

```
data/
  seed/
    apis.json                    # 20 pharma API seed nodes
    rare_earths.json             # 8 rare earth mineral nodes
    international_supply_routes.json
    demo_scenarios.json
  shocks.json                    # Live structured shock feed
```

---

## Deployment

### Docker (single container)

```bash
docker build -t shockmap .
docker run -p 7860:7860 \
  -e GEMINI_API_KEY=... \
  -e QDRANT_URL=... \
  -e QDRANT_API_KEY=... \
  shockmap
```

### Hugging Face Spaces

Push to a Space with `Dockerfile` at root. The container serves frontend static files via FastAPI's `StaticFiles` mount.

### Render

`render.yaml` is preconfigured for web service deployment. Set environment variables in the Render dashboard.

---

## Project Structure

```
pharmashield/
  backend/
    app/
      api/          # FastAPI route handlers
      services/     # Engine logic (Gemini, propagation, geocoder)
      models/       # Pydantic schemas
    data/
      seed/         # Static seed data
      shocks.json   # Live feed output
    ingestion/      # GDELT poller
    graph/          # Graph builder
  frontend/
    src/
      pages/        # Route-level components
      components/   # Shared UI (AppShell, Spinner, etc.)
      api/          # Typed API client
      lib/          # Mock data, utilities
```

---

*Built to demonstrate that supply chain intelligence at the scale of Palantir is achievable with open APIs, graph mathematics, and grounded LLM reasoning.*
