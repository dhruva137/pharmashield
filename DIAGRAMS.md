# ShockMap — Eraser.io Diagram Prompts

Copy-paste each prompt block into [eraser.io](https://eraser.io) to generate the corresponding diagram.

---

## 1. Current Signal Flow & Process Diagram

```
Create a detailed signal flow diagram for a supply chain intelligence platform called "ShockMap" with the following data pipeline:

INGESTION LAYER:
- "GDELT Global News API" polls every 15 minutes across 65 languages
- Feeds into "Signal Filter" which screens for 4 event types: factory_shutdown, export_ban, port_closure, contamination
- Filtered signals go to "Gemini 2.5 Flash NER" which extracts structured JSON: {province, severity, sector, event_type, source_url}
- 3 sector pipelines branch out: Pharma APIs, Rare Earth Minerals, Energy & Oil

PROCESSING LAYER:
- Structured shocks are persisted to "data/shocks.json" (live shock store)
- Shocks feed into "NetworkX Dependency Graph" containing 20 Pharma API nodes, 8 Rare Earth nodes, 16 Energy nodes, 34 Chinese Province source nodes
- Graph runs "Personalized PageRank" to compute downstream risk scores
- Graph also runs "Louvain Community Detection" to find correlated supply clusters
- Risk scores feed into "Vulnerability Index Calculator": R = PR(shock) × (1−Substitutability) × e^(−Buffer/τ) × CommunityAmplifier

ACTION LAYER:
- High-risk results trigger "Qdrant Vector Store" semantic search across 2400+ knowledge entries (NLEM, SARS-2003 playbooks, Comtrade trade data, CDSCO policies)
- "Gemini 2.5 Flash RAG" generates grounded procurement action plans with specific supplier names, quantities, lead times
- Action plans are served via "FastAPI REST API" (15+ endpoints)

PRESENTATION LAYER:
- React 19 frontend consumes the API
- Modules: Dashboard, Live Shock Feed, Shock War Room, Shock Simulator, 3D Globe (CesiumJS), Supply Map (Leaflet), Propagation Graph, India In-Depth (domestic routing), Hormuz Crisis Tracker, Energy Watch, COVID Backtest, Ask ShockMap (AI chat), FAQ & Docs
- Real-time news ticker across all pages

Use a left-to-right flow. Color code: Blue for ingestion, Purple for processing/graph, Orange for action/RAG, Green for presentation. Use dark theme.
```

---

## 2. Current Architecture Diagram

```
Create a system architecture diagram for "ShockMap" — a 3-engine supply chain intelligence platform. Show the following components and their connections:

EXTERNAL DATA SOURCES (top):
- GDELT API (news signals, 15-min polling)
- Qdrant Cloud (vector knowledge base, 2400+ entries)
- Google Gemini API (NER extraction + RAG generation)

BACKEND — Python 3.11 + FastAPI (center):
- Engine 1: Signal Ingestion
  - shock_detector.py (GDELT poller with tenacity retry)
  - Gemini NER processor (structured JSON extraction)
  - Output: data/shocks.json

- Engine 2: Graph Propagation
  - graph/builder.py (NetworkX graph: 20 pharma + 8 rare earth + 16 energy nodes)
  - Personalized PageRank (risk scoring)
  - Louvain Community Detection (cluster analysis)
  - shock_propagation.py (cascade simulation)

- Engine 3: RAG Action Intelligence
  - Qdrant semantic retrieval (NLEM, Comtrade, SARS-2003 playbooks)
  - Gemini grounded response generation
  - gemini_analyst.py (action plan synthesis)

- API Layer: FastAPI with 6 routers
  - sectors.py, shocks.py, simulate.py, query.py, map.py, domestic.py
  - /healthz, /api/v1/shocks, /api/v1/graph, /api/v1/simulate, /api/v1/query, /api/v1/map/*, /api/v1/domestic/*

- Data Store:
  - data/seed/ (apis.json, rare_earths.json, alerts.json, demo_scenarios.json, policy_snippets.json)
  - data/shocks.json (live output)

FRONTEND — React 19 + Vite (bottom):
- AppShell (sidebar navigation, sector badges, news ticker)
- Pages: Landing, SectorSelect, Dashboard, ShockDetail, Simulate, Graph, Globe (CesiumJS), Map (Leaflet), IndiaInDepth, Hormuz, Energy, CovidBacktest, Query, Drugs, FAQ
- API Client (typed fetch wrapper with 25+ methods)
- Design System: Vanilla CSS, dark slate palette, monospace labels

INFRASTRUCTURE:
- Vite dev server (port 5173) with proxy to backend
- Uvicorn (port 8000) with hot reload
- Optional: Docker container, HuggingFace Spaces deployment

Show data flow arrows between all components. Use a layered layout: External Sources → Backend Engines → API Layer → Frontend. Dark theme, blue/purple/green color scheme.
```

---

## 3. Future Upgraded Signal Flow (v3.0 — Full Scale)

```
Create an advanced signal flow diagram for "ShockMap v3.0" — a next-generation supply chain intelligence platform with the following upgraded pipeline:

MULTI-SOURCE INGESTION:
- "GDELT API" (news signals, 15-min poll, 65 languages)
- "AIS Maritime Tracker" (real-time vessel positions, port congestion detection)
- "Satellite Imagery API" (factory activity detection via SAR/optical, weekly scan)
- "Customs & Trade APIs" (Comtrade live, Indian DGFT import/export filings)
- "Social Media NLP" (Twitter/X, Reddit — early rumor detection using sentiment analysis)
- "IoT Sensor Network" (port crane uptime, warehouse temperature/humidity, GPS fleet tracking)
- All feed into "Multi-Modal Fusion Engine" which normalizes signals into a unified event schema

AI EXTRACTION LAYER:
- "Gemini 2.5 Pro" performs deep NER + entity resolution (disambiguates "Hebei" factory vs "Hebei" province)
- "Fine-tuned Supply Chain BERT" classifies event severity (trained on 50K historical disruptions)
- "Anomaly Detector (Isolation Forest)" flags statistical outliers in trade flow volumes
- Output: Enriched structured events with confidence scores

GRAPH INTELLIGENCE LAYER:
- "Temporal Knowledge Graph" (Neo4j) — 500+ nodes, 2000+ edges, time-stamped relationships
- "Graph Neural Network (GNN)" — GraphSAGE model predicting 7-day-ahead risk propagation
- "Dynamic PageRank" — real-time recalculation as new shocks arrive
- "Hierarchical Community Detection" — multi-resolution Louvain (country → province → factory level)
- "Counterfactual Simulator" — Monte Carlo simulation: "What if Hormuz closes for 90 days?"
- "Digital Twin Sync" — mirrors real port/warehouse states from IoT feeds

ACTION INTELLIGENCE LAYER:
- "Multi-Agent Procurement System" — 3 specialized Gemini agents:
  - Agent 1: Supplier Discovery (searches global alternatives)
  - Agent 2: Cost Optimizer (models emergency procurement vs stockpile tradeoffs)
  - Agent 3: Compliance Checker (validates against NLEM, FDA, CDSCO regulations)
- "Predictive Stockout Engine" — ML model forecasting drug-level shortage probability (30/60/90 day horizons)
- "Automated Alert Routing" — pushes critical alerts to Slack, email, SMS based on user role and sector subscription
- "PDF Briefing Generator" — one-click executive summary with charts and recommendations

PRESENTATION LAYER:
- "Command Center Dashboard" — real-time KPIs, sector health, global risk heatmap
- "3D Digital Twin Globe" — live vessel tracking, port status, supply corridor animations
- "War Room" — per-shock deep dive with AI-generated 72h action ladder
- "Scenario Sandbox" — drag-and-drop shock injection with cascading impact preview
- "Mobile Companion App" — push notifications, quick-glance risk cards
- "API Gateway" — external integrations (SAP, Oracle SCM, Coupa)

Use left-to-right flow with 5 vertical swim lanes. Color code: Red for external sources, Blue for AI extraction, Purple for graph intelligence, Orange for action layer, Green for presentation. Show data volume annotations on arrows (e.g., "~3K signals/day", "500 nodes"). Dark theme, premium look.
```

---

## 4. Future Upgraded Architecture (v3.0 — Full Scale)

```
Create a comprehensive system architecture diagram for "ShockMap v3.0" — an enterprise-grade supply chain intelligence platform at Palantir scale:

TIER 1 — DATA INGESTION MICROSERVICES (top):
- GDELT Poller Service (Python, 15-min cron, Kafka producer)
- AIS Maritime Ingester (Rust, websocket stream, vessel position decoder)
- Satellite Imagery Pipeline (Python, Google Earth Engine API, change detection ML)
- Trade Flow Aggregator (Python, Comtrade + DGFT APIs, daily batch)
- Social Listener (Python, Twitter/Reddit streaming, sentiment classifier)
- IoT Gateway (Go, MQTT broker, sensor data normalization)
- All publish to "Apache Kafka" event bus (partitioned by sector)

TIER 2 — AI/ML PROCESSING (center-top):
- "Gemini NER Service" (Python, FastAPI, Gemini 2.5 Pro, structured extraction)
- "Supply Chain BERT" (PyTorch, fine-tuned classification, GPU inference)
- "Anomaly Detection Service" (scikit-learn, Isolation Forest, streaming mode)
- "GNN Risk Predictor" (PyTorch Geometric, GraphSAGE, 7-day lookahead)
- "Embedding Service" (Gemini embeddings, batch + real-time)
- All consume from Kafka, write to "Redis" (hot cache) and "PostgreSQL" (persistent store)

TIER 3 — KNOWLEDGE & GRAPH LAYER (center):
- "Neo4j Temporal Graph" (500+ nodes, 2000+ weighted edges, time-series properties)
- "Qdrant Vector Store" (5000+ knowledge entries, HNSW index)
- "PostgreSQL" (shock history, user sessions, audit logs)
- "Redis Cluster" (real-time risk scores, session cache, rate limiting)
- "MinIO Object Store" (satellite imagery, PDF reports, backups)

TIER 4 — APPLICATION SERVICES (center-bottom):
- "API Gateway" (Kong/Nginx, rate limiting, JWT auth, API versioning)
- "Core API" (Python FastAPI, 30+ endpoints, OpenAPI docs)
- "Multi-Agent Orchestrator" (LangGraph, 3 specialized Gemini agents)
- "Simulation Engine" (Python, Monte Carlo, counterfactual modeling)
- "Report Generator" (Python, WeasyPrint PDF, scheduled + on-demand)
- "Notification Service" (Python, Slack/Email/SMS webhooks)
- "WebSocket Server" (Python, real-time push to frontend)

TIER 5 — FRONTEND & CLIENTS (bottom):
- "React 19 SPA" (Vite, 15+ pages, CesiumJS 3D globe, Leaflet maps, Recharts)
- "Mobile PWA" (React, push notifications, offline-capable)
- "Admin Panel" (React, user management, sector configuration, audit logs)
- "External API Consumers" (SAP, Oracle SCM, Coupa — REST/GraphQL)

INFRASTRUCTURE & DEVOPS (side):
- "Kubernetes Cluster" (GKE/EKS, auto-scaling, health probes)
- "GitHub Actions CI/CD" (lint, test, build, deploy pipeline)
- "Prometheus + Grafana" (metrics, alerting, SLA dashboards)
- "ELK Stack" (centralized logging, error tracking)
- "Terraform" (infrastructure as code, multi-region)
- "Vault" (secrets management, API key rotation)

Show connections between all tiers with labeled arrows indicating protocol (REST, gRPC, Kafka, WebSocket, SQL). Use a 5-tier horizontal layout. Color code each tier differently. Include data store icons (cylinder for DB, hexagon for cache). Dark theme, enterprise-grade look. Add a "Current MVP" boundary box around the core components that exist today (FastAPI, NetworkX, Qdrant, React).
```

---

## Quick Reference

| Diagram | What it shows | Paste into |
|---|---|---|
| **#1 Signal Flow** | Current data pipeline end-to-end | Eraser.io → Diagram from prompt |
| **#2 Architecture** | Current system components & connections | Eraser.io → Diagram from prompt |
| **#3 Future Signal Flow** | v3.0 upgraded pipeline with GNN, multi-agent, IoT | Eraser.io → Diagram from prompt |
| **#4 Future Architecture** | Enterprise-scale Palantir-grade system design | Eraser.io → Diagram from prompt |
