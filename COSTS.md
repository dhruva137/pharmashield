# ShockMap — Implementation Cost Analysis

---

## Current MVP Cost (Demo / Hackathon)

> **Total: ₹0 / $0** — Everything runs on free tiers and local hardware.

| Component | Service Used | Cost | Notes |
|---|---|---|---|
| AI / LLM | Google Gemini 2.5 Flash | **Free** | Google AI Studio free tier (1500 req/day) |
| Vector DB | Qdrant Cloud | **Free** | Free tier: 1GB storage, 1M vectors |
| News Signals | GDELT API | **Free** | Open API, no key needed, unlimited |
| Maps (2D) | Leaflet + OSM tiles | **Free** | Open source, community tiles |
| Maps (3D Globe) | CesiumJS + ArcGIS tiles | **Free** | Cesium community token + Esri free tier |
| Border Overlay | Esri Reference Layers | **Free** | Public ArcGIS REST services |
| Backend | Python + FastAPI | **Free** | Runs locally |
| Frontend | React + Vite | **Free** | Runs locally |
| Graph Engine | NetworkX (Python) | **Free** | Open source library |
| Hosting | localhost | **Free** | Dev machine |
| Domain | None | **Free** | localhost:5173 / 8000 |
| CI/CD | None | **Free** | Manual deployment |
| **TOTAL MVP** | | **₹0** | |

---

## Production Deployment — Tier 1 (Startup / Small Team)

> Serving ~100 users, 1 sector focus, basic monitoring.

| Component | Service | Monthly Cost (USD) | Monthly Cost (INR) | Notes |
|---|---|---|---|---|
| AI / LLM | Gemini 2.5 Flash (Pay-as-you-go) | $15–30 | ₹1,250–2,500 | ~50K API calls/month |
| Vector DB | Qdrant Cloud (Starter) | $25 | ₹2,100 | 4GB storage, 10M vectors |
| Backend Hosting | Railway / Render | $7–20 | ₹580–1,670 | 1 instance, auto-sleep |
| Frontend Hosting | Vercel (Free) | $0 | ₹0 | Free tier sufficient |
| Database | Supabase (Free) | $0 | ₹0 | Postgres free tier |
| Maps | Leaflet + OSM | $0 | ₹0 | Free |
| Globe | CesiumJS (Community) | $0 | ₹0 | Free token |
| India Maps | Bhuvan ISRO WMS | $0 | ₹0 | Free, govt service |
| Domain | .in or .com | $1 | ₹83 | Annual ~$12 |
| SSL | Let's Encrypt | $0 | ₹0 | Free |
| Monitoring | UptimeRobot (Free) | $0 | ₹0 | 50 monitors free |
| **TOTAL TIER 1** | | **$48–76/mo** | **₹4,000–6,350/mo** | |

---

## Production Deployment — Tier 2 (Serious Product)

> Serving ~1,000 users, 3 sectors, real-time alerts, PDF reports.

| Component | Service | Monthly Cost (USD) | Monthly Cost (INR) | Notes |
|---|---|---|---|---|
| AI / LLM | Gemini 2.5 Pro (Pay-as-you-go) | $80–200 | ₹6,700–16,700 | ~200K calls, thinking mode |
| Vector DB | Qdrant Cloud (Production) | $65 | ₹5,400 | 16GB, dedicated cluster |
| Backend Hosting | GCP Cloud Run (2 instances) | $40–80 | ₹3,340–6,700 | Auto-scaling, 2 vCPU |
| Frontend Hosting | Vercel Pro | $20 | ₹1,670 | Analytics, edge functions |
| Database | Supabase Pro | $25 | ₹2,100 | 8GB Postgres, backups |
| Cache | Redis (Upstash) | $10 | ₹835 | 10K commands/day free, then pay |
| Maps (India) | MapMyIndia / OlaMaps | $0–50 | ₹0–4,200 | Depends on API calls |
| Globe | Cesium Ion (Commercial) | $0–150 | ₹0–12,500 | Free under 10K monthly tiles |
| Email/Alerts | Resend (Starter) | $20 | ₹1,670 | 50K emails/mo |
| PDF Generation | Self-hosted (WeasyPrint) | $0 | ₹0 | Runs on backend |
| Domain | .ai or premium | $5 | ₹420 | Annual ~$60 |
| Monitoring | Grafana Cloud (Free) | $0 | ₹0 | 10K series free |
| CI/CD | GitHub Actions | $0 | ₹0 | Free for public repos |
| **TOTAL TIER 2** | | **$265–625/mo** | **₹22,100–52,200/mo** | |

---

## Production Deployment — Tier 3 (Enterprise / Palantir-Scale)

> Serving 10,000+ users, 5+ sectors, GNN, multi-agent, real-time streaming.

| Component | Service | Monthly Cost (USD) | Monthly Cost (INR) | Notes |
|---|---|---|---|---|
| AI / LLM | Gemini 2.5 Pro + Fine-tuned models | $500–2,000 | ₹41,700–1,67,000 | 1M+ calls, custom models |
| GNN Training | GCP A100 GPU (spot) | $200–800 | ₹16,700–66,800 | GraphSAGE training, weekly retrain |
| GNN Inference | GCP T4 GPU (always-on) | $150–300 | ₹12,500–25,000 | Real-time risk prediction |
| Vector DB | Qdrant Cloud (Enterprise) | $200 | ₹16,700 | 64GB, HA cluster |
| Graph DB | Neo4j AuraDB (Pro) | $150–400 | ₹12,500–33,400 | Temporal knowledge graph |
| Backend | GKE Kubernetes (3 nodes) | $200–500 | ₹16,700–41,700 | Auto-scaling, multi-region |
| Frontend | Vercel Enterprise | $100 | ₹8,350 | SSR, edge, analytics |
| Database | Cloud SQL (Postgres HA) | $100–200 | ₹8,350–16,700 | High availability, backups |
| Cache | Redis Enterprise | $50–100 | ₹4,200–8,350 | Cluster mode, persistence |
| Message Queue | Apache Kafka (Confluent) | $100–300 | ₹8,350–25,000 | Event streaming |
| Object Storage | GCS / S3 | $20–50 | ₹1,670–4,200 | Satellite imagery, PDFs |
| AIS Maritime | MarineTraffic API | $200–500 | ₹16,700–41,700 | Real-time vessel tracking |
| Satellite Imagery | Google Earth Engine | $0–300 | ₹0–25,000 | Research free, commercial paid |
| Maps (India) | MapMyIndia Enterprise | $100–300 | ₹8,350–25,000 | Unlimited tiles, routing |
| Globe | Cesium Ion (Enterprise) | $300 | ₹25,000 | Custom assets, terrain |
| Email/SMS | Twilio + Resend | $50–150 | ₹4,200–12,500 | Multi-channel alerts |
| Monitoring | Datadog / New Relic | $100–300 | ₹8,350–25,000 | APM, logs, traces |
| Security | Vault + WAF | $50–100 | ₹4,200–8,350 | Secrets, DDoS protection |
| CI/CD | GitHub Enterprise | $21/user | ₹1,750/user | Advanced CI/CD |
| Domain + CDN | Cloudflare Pro | $25 | ₹2,100 | CDN, DDoS, analytics |
| **TOTAL TIER 3** | | **$2,600–6,700/mo** | **₹2.2–5.6 lakh/mo** | |

---

## One-Time Development Costs (if hiring)

| Role | Duration | Rate (India) | Total (INR) | Total (USD) |
|---|---|---|---|---|
| Full-stack Developer | 3 months | ₹80K–1.5L/mo | ₹2.4–4.5L | $2,900–5,400 |
| ML/AI Engineer (GNN) | 2 months | ₹1–2L/mo | ₹2–4L | $2,400–4,800 |
| DevOps Engineer | 1 month | ₹80K–1.2L/mo | ₹80K–1.2L | $960–1,440 |
| UI/UX Designer | 1 month | ₹50K–1L/mo | ₹50K–1L | $600–1,200 |
| Domain Expert (Pharma) | Consulting | ₹2K–5K/hr | ₹40K–1L | $480–1,200 |
| **TOTAL DEV** | | | **₹5.7–11.8L** | **$7,000–14,000** |

---

## Cost Comparison Summary

| Tier | Monthly Cost | Annual Cost | Users | Features |
|---|---|---|---|---|
| **MVP (Current)** | ₹0 | ₹0 | 1 (demo) | Full platform, free APIs |
| **Tier 1 (Startup)** | ₹4K–6.4K | ₹48K–76K | ~100 | Production, basic monitoring |
| **Tier 2 (Product)** | ₹22K–52K | ₹2.6–6.3L | ~1,000 | 3 sectors, alerts, PDF reports |
| **Tier 3 (Enterprise)** | ₹2.2–5.6L | ₹26–67L | 10,000+ | GNN, multi-agent, streaming, digital twin |

---

## Free APIs Used (Current MVP)

| API | What it provides | Rate Limit | Key Required |
|---|---|---|---|
| GDELT | Global news events | Unlimited | No |
| Gemini (AI Studio) | NER + RAG | 1,500 req/day | Yes (free) |
| Qdrant Cloud | Vector search | 1M vectors | Yes (free) |
| ArcGIS Tiles | Satellite imagery | Unlimited | No |
| Esri Reference | Country borders | Unlimited | No |
| CesiumJS | 3D globe rendering | Community token | Yes (free) |
| OpenStreetMap | 2D map tiles | Fair use | No |
| Bhuvan ISRO | India state borders | Unlimited | No |

---

> **Bottom line:** The entire ShockMap platform runs at ₹0 today. Scaling to a real product starts at ~₹4K/month. Enterprise-grade Palantir-scale deployment would cost ₹2–6 lakh/month — still 100x cheaper than an actual Palantir contract (which starts at $1M+/year).
