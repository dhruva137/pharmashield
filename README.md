---
title: ShockMap API
emoji: 🌍
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---

# ShockMap

**Real-time supply shock intelligence for India's critical import dependencies**

ShockMap is an operator-facing intelligence platform built for the Google Solution Challenge 2026. It turns weak early signals from trade, news, and policy sources into a clear operational workflow:

**detect -> assess -> decide -> act**

The product is designed around a simple mission:

> When a disruption hits an upstream source region, show Indian operators what is at risk, how the shock propagates, and what action changes the outcome in the next 72 hours.

---

## Why ShockMap

India depends heavily on external supply chains for critical industrial and health-system inputs. In the MVP, ShockMap focuses on two high-impact sectors:

- **Pharma**: essential medicines, APIs, intermediates, and upstream source regions
- **Rare earths**: strategically important minerals used in EV, electronics, and advanced industry

The core problem is not a lack of information. It is a lack of **early, structured, decision-ready intelligence**.

ShockMap closes that gap by combining live signal intake, graph-based propagation, and grounded action generation in one operator workflow.

---

## What the MVP Delivers

The current MVP is built around a complete incident-response loop.

### 1. Live shock feed
- Ingests disruption signals into a structured shock feed
- Tracks event type, province/region, sector, severity, source, and affected entities
- Supports a **hybrid live + curated scenario mode** for reliable demos and consistent walkthroughs

### 2. Shock propagation engine
- Models upstream-to-downstream impact through a supply graph
- Uses **NetworkX**, **Louvain communities**, and **Personalized PageRank**
- Produces ranked affected nodes with risk, buffer pressure, substitutability, and cluster context

### 3. War room for every shock
- Each shock opens into a decision surface, not just an alert
- Surfaces:
  - aggregate risk
  - days to stockout
  - exposure estimate
  - top affected inputs
  - source evidence
  - recommended actions

### 4. Action delta simulator
- Lets the operator run response actions against a live scenario
- Shows before/after impact such as:
  - risk reduction
  - stockout extension
  - exposure change

### 5. Grounded operator analyst
- Natural-language query interface backed by Gemini Flash
- Returns concise answers, citations, matched scenarios, and suggested entities to inspect next
- Uses schema-constrained outputs, short timeouts, retrieval merging, and deterministic degradation

### 6. Graph explorer
- Interactive graph view for provinces, APIs, inputs, and downstream drugs
- Highlights dependency corridors and the currently selected node's upstream/downstream links
- Exposes state-level aggregate risk at a glance

---

## Current MVP Coverage

| Area | MVP Coverage |
|---|---|
| Essential medicines | 20 tracked medicines |
| Pharma APIs | 25 API records in seed data |
| Rare earth minerals | 8 critical minerals |
| Live shock feed | `data/shocks.json` + curated scenario pack |
| Graph mode | PageRank + Louvain production path |
| Action intelligence | Grounded Flash-based plans with deterministic action output |
| UI surfaces | Dashboard, Alerts, Shock Detail, War Room, Graph, Query |

---

## Product Experience

### Dashboard
The dashboard gives operators an immediate view of active shocks, sector activity, feed mode, and system status.

### Alerts
The alerts surface is the real-time event feed for live shocks and scenario-backed incidents.

### Shock Detail / War Room
This is the core MVP experience. A single incident page brings together:
- shock summary
- severity
- top exposed inputs
- evidence pack
- propagation explanation
- recommended actions
- delta simulation

### Graph
The graph page shows how disruptions travel through the network, which nodes are under the most pressure, and which states absorb the highest downstream risk.

### Query
The operator can ask plain-English questions such as:
- "Which drugs are most exposed to Hebei shutdown?"
- "What should procurement do in the next 72 hours?"
- "Which nodes are highest risk in the current cluster?"

---

## MVP Demo Flow

This is the cleanest walkthrough for judges, mentors, or users:

1. Open the **Dashboard**
2. Select a high-severity shock
3. Enter the **War Room**
4. Inspect propagation and evidence
5. Run one response action in the simulator
6. Show the risk delta and stockout extension
7. Ask a question in **Query**

This makes the system feel operational from end to end.

---

## 3-Engine Architecture

```text
ENGINE 1                ENGINE 2                    ENGINE 3
Signal                  Shock                       Action
Intelligence       ->   Propagation            ->   Intelligence
(What happened)         (What it means)             (What to do)
```

### Engine 1: Signal Intelligence

Engine 1 is responsible for turning unstructured event streams into structured shocks.

Current MVP path:
- event fetch and refresh pipeline
- disruption keyword filtering
- structured shock records persisted to `data/shocks.json`
- Gemini Flash used for efficient structured extraction where available

Typical extracted fields:
- `shock_type`
- `province`
- `sector`
- `severity`
- `affected_entities`
- `estimated_duration_days`

### Engine 2: Shock Propagation

Engine 2 is the production risk engine in the MVP.

Current production method:
- **Knowledge graph** for supply structure
- **Louvain community detection** for co-propagating clusters
- **Personalized PageRank** for directional shock spread
- **Criticality modifiers** for substitutability, buffer pressure, and concentration

Propagation formula:

```text
R_i = PR_i(shock) * (1 - S_i) * exp(-B_i / tau) * C_community
```

Where:
- `PR_i(shock)` = PageRank influence from the shocked origin
- `S_i` = substitutability
- `B_i` = buffer days
- `tau` = lead-time constant by sector
- `C_community` = community amplification factor

### Engine 3: Action Intelligence

Engine 3 converts risk into decisions.

Current MVP behavior:
- retrieves grounded context from local policy and reference data
- uses Gemini Flash for structured answer/action generation
- returns citations, confidence, suggested entities, and next actions
- preserves a deterministic operator experience through scenario-backed degradation

---

## Gemini Usage Strategy

ShockMap uses Gemini Flash in a cost-aware, operator-safe way.

### Design principles
- **Flash-only routing** for MVP speed and cost control
- **Schema-constrained generation** for stable JSON outputs
- **Short timeout budget** to avoid hanging user flows
- **Prompt minimization** to keep token usage tight
- **Retrieval merge** across vector and lexical evidence
- **Deterministic fallback** so the product remains usable even when external AI calls are slow

### Where Gemini is used
- Engine 1 extraction and normalization
- Engine 3 query answering
- Engine 3 action-plan generation

This keeps Gemini central to the product while preserving a reliable operational UX.

---

## Research-Informed Product Direction

ShockMap is built as a practical MVP now, with a clear path toward more advanced graph learning and causal response intelligence.

The current production path is intentionally strong:
- interpretable
- stable
- easy to validate
- suitable for a judging demo

The next phases extend that foundation into a more advanced learning system without changing the product workflow.

---

## Phase Roadmap

### Phase 1: MVP Operations Layer
- hybrid live shock feed
- production graph propagation
- war room
- action simulation
- grounded operator query
- deployable frontend + backend surfaces

### Phase 2: Regional Operations Expansion
- state-level and corridor-level overlays
- inventory and days-of-cover modeling
- regional reallocation workflows
- map-based incident command views
- expanded sector templates beyond pharma and rare earths

### Phase 3: GNN Propagation Layer
- temporal graph learning on historical disruptions
- node embeddings across provinces, APIs, inputs, and downstream products
- learned propagation that augments or replaces the PageRank path
- improved ranking under multi-origin and cascading shocks

### Phase 4: Procurement and Policy Platform
- procurement workflow integration
- escalation playbooks
- role-based action tracking
- stakeholder notes and audit history
- organization-level workspaces

### Phase 5: Multi-Sector National Risk Platform
- semiconductor inputs
- solar and clean-energy dependencies
- EV battery chain monitoring
- defense and advanced-manufacturing inputs
- cross-sector risk portfolio views

---

## GNN Roadmap

The graph layer is already structured for a future GNN upgrade.

### Planned graph design

**Node types**
- province
- factory
- input
- API
- drug
- rare earth mineral
- route / logistics node
- supplier / buyer entity

**Node features**
- import concentration
- current risk score
- buffer days
- substitutability
- strategic priority
- demand criticality
- recent shock exposure
- regulatory pressure

**Edge features**
- trade volume
- lead time
- dependency strength
- route dependence
- concentration and exclusivity

**Training targets**
- realized shortage severity
- price spikes
- fill-rate stress
- procurement delays
- duration to recovery

### Planned inference outcome

The GNN phase will learn propagation patterns from observed disruptions rather than relying only on static graph logic. The product experience remains the same, but the engine underneath becomes better at:
- multi-hop shock attribution
- hidden cluster coupling
- non-linear escalation
- time-aware recovery forecasting

---

## Scalability Design

ShockMap is being shaped to scale from a demo system into a broader intelligence platform.

### 1. Stateless serving layer
- FastAPI backend stays stateless
- frontend remains CDN-friendly and easy to cache
- deployment can scale horizontally without application rewrites

### 2. Separate ingestion from serving
- ingestion jobs run on a schedule
- serving reads normalized shock data
- this keeps user-facing latency stable even as source count grows

### 3. Layered storage model
- raw source archive
- normalized shock records
- graph-ready feature tables
- retrieval-ready citation corpus

### 4. Cached graph snapshots
- precompute community structure
- cache graph responses for UI views
- isolate heavy recomputation to background refresh cycles

### 5. Retrieval layer growth
- lexical fallback today
- hosted vector retrieval at scale
- sector-specific retrieval collections later

### 6. Multi-tenant evolution
- tenant-scoped sectors, alerts, and workspaces
- org-specific configuration and alerting
- audit trails for action workflows

### 7. Observability and reliability
- structured logs
- engine health status
- shock feed mode visibility
- deterministic degradation under model or network pressure

---

## Repository Structure

| Path | Purpose |
|---|---|
| `backend/app/` | FastAPI APIs, services, models, dependency injection |
| `frontend/src/` | React UI surfaces and client-side workflow |
| `ingestion/` | shock detection, scrapers, and signal intake |
| `graph/` | graph-building utilities |
| `data/seed/` | curated seed data, scenarios, policy snippets |
| `data/shocks.json` | live structured shock feed |
| `docs/` | architecture and data-source notes |

---

## Key API Surfaces

| Endpoint | Purpose |
|---|---|
| `/healthz` | system status and engine health |
| `/api/v1/sectors` | sector overview |
| `/api/v1/shocks` | live shock feed |
| `/api/v1/shocks/{id}` | shock detail |
| `/api/v1/shocks/{id}/war-room` | incident command surface |
| `/api/v1/shocks/{id}/simulate-action` | action delta simulation |
| `/api/v1/graph` | graph snapshot and state risk |
| `/api/v1/query` | operator analyst |
| `/api/v1/engines` | engine diagnostics |

---

## Run Locally

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend URLs:
- API: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/healthz`

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend URL:
- App: `http://localhost:5173`

### Optional ingestion refresh
```bash
python -m ingestion.shock_detector --once
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Gemini Flash access for extraction and action intelligence |
| `QDRANT_URL` | hosted vector store endpoint |
| `QDRANT_API_KEY` | vector store authentication |
| `DEMO_MODE` | enables curated scenario mode |
| `ENABLE_GNN` | toggles the future GNN path |
| `ALLOWED_ORIGINS` | frontend origins for the API |

---

## Tech Stack

| Layer | Stack |
|---|---|
| Backend | FastAPI, Pydantic v2, Python |
| Graph | NetworkX, python-louvain, criticality scoring |
| AI | Gemini Flash |
| Retrieval | Qdrant + lexical fallback |
| Frontend | React 19, Vite |
| Ingestion | Python schedulers, source fetchers, structured normalization |

---

## Positioning

ShockMap is not just an alert dashboard.

It is a **decision engine for upstream supply shocks**:
- detect the disruption
- map the downstream exposure
- simulate the response
- act with evidence

That is the MVP.

---

## License

MIT

Built for the **Google Solution Challenge 2026**.
