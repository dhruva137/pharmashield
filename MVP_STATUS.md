# PharmaShield (ShockMap) - MVP Status Report

This document outlines the end-to-end capabilities, architecture, and current status of the PharmaShield (ShockMap) MVP, built for the Google Solution Challenge 2026. 

This serves as a guide for demonstrating maximum value and proving the system solves a real-world problem for hackathon judges.

## 🎯 The Core Problem & Mission

India is heavily dependent on external supply chains for critical health-system inputs (Pharmaceutical APIs) and advanced industry components (Rare Earth Minerals). 

The problem isn't a lack of news; it's a **lack of early, structured, decision-ready intelligence.** Operators typically find out about upstream disruptions too late, when prices are already spiking or stockouts are imminent.

**Mission:** *When a disruption hits an upstream source region (e.g., a factory shutdown in Hebei), show operators exactly what is at risk downstream, how the shock propagates, and what immediate actions they can take within the next 72 hours.*

## 🏗️ The 3-Engine Architecture (Currently Implemented)

The MVP successfully implements a full "Detect -> Assess -> Decide -> Act" loop using three distinct engines:

### 1. Engine 1: Signal Intelligence (Detect)
*   **What it does:** Ingests live and simulated disruption signals and structures them.
*   **Current Status:** 
    *   A Python scheduler (`ingestion/shock_detector.py`) polls the GDELT API for global news events using specific keywords (`factory shutdown`, `export ban`, `port closure`, `contamination`) combined with regions (e.g., China, India) and sectors.
    *   It structures unstructured news into "Shock Events" (saving to `data/shocks.json`).
    *   **Demo Mode:** To ensure a flawless hackathon demo, the system includes a highly curated `demo_scenarios.json`. This provides realistic, high-fidelity incidents (e.g., "Hebei analgesic stress", "Inner Mongolia export ban") without relying on the unpredictability of live news during judging.

### 2. Engine 2: Shock Propagation (Assess)
*   **What it does:** Maps how a localized shock ripples through the supply chain.
*   **Current Status:**
    *   Utilizes a **Knowledge Graph** (NetworkX via FastAPI backend).
    *   **Algorithm:** Uses **Personalized PageRank** to calculate how risk flows from an origin node (e.g., a Chinese province) down to specific inputs, APIs, and finally essential medicines.
    *   **Metrics Calculated:** Generates a real-time `Risk Score` (0-100) for downstream nodes based on:
        *   PageRank influence from the shocked origin.
        *   Buffer Days (inventory on hand).
        *   Substitutability (how easily an alternative can be sourced).
    *   **Clustering:** Implements **Louvain community detection** to identify co-propagating clusters (e.g., if one factory goes down, which other related chemicals are likely to spike in price).

### 3. Engine 3: Action Intelligence (Decide & Act)
*   **What it does:** Converts calculated risk into grounded, actionable decisions.
*   **Current Status:**
    *   Powered by **Gemini Flash**.
    *   **The "War Room":** When an operator clicks a high-risk shock, they enter a dedicated War Room. Gemini processes the shock context and generates a structured 72-hour action plan (e.g., "Advance-buy 18 MT 6-APA", "Lock para-aminophenol equivalent").
    *   **Action Simulator:** Operators can click an action to simulate its impact. The UI dynamically shows the "Delta"—how taking that action reduces the Aggregate Risk score and extends the "Days to Stockout".
    *   **Natural Language Query:** Operators can ask Gemini plain-English questions ("Which drugs depend most on Hebei?") and receive grounded answers with citations.

## 💻 Frontend UI Surfaces (Fully Built)

The React 19 frontend provides a complete, operator-ready dashboard:

1.  **Dashboard:** A high-level, real-time overview showing active shocks, top risk inputs, and a Herfindahl-Hirschman Index (HHI) heatmap of dependency concentration by province.
2.  **Interactive Supply Map:** A geospatial view (Leaflet) showing supply corridors between source provinces (e.g., China) and destination states (India). Provinces glow red when active shocks are detected.
3.  **Propagation Graph Explorer:** A visual node-edge graph that lets operators trace the exact path from a source province -> KSM -> API -> final essential Drug.
4.  **Alerts Feed:** The chronological feed of all detected disruptions.
5.  **War Room (Shock Detail):** The core MVP view bringing together evidence, propagation paths, and Gemini-generated action plans.
6.  **Drug/API Catalog:** A searchable database of monitored entities showing their baseline risk and criticality breakdown.

## 🚀 How to Demo for Maximum Impact (The "Golden Path")

To prove this solves a real problem for the judges, follow this narrative flow:

1.  **Set the Stage:** Start on the **Dashboard**. Explain that India is blind to upstream Tier-2/Tier-3 supplier disruptions. Point out the HHI concentration map showing heavy reliance on specific regions like Hebei.
2.  **The Inciting Incident:** Go to the **Alerts** or **Map**. Click on a simulated `CRITICAL` shock (e.g., *"Hebei factory shutdown disrupts para-aminophenol"*). Emphasize that normally, this is just a news headline. 
3.  **Enter the War Room:** Open the Shock Detail page.
    *   *Show, don't tell:* Point out that the system hasn't just linked an article; it has traced the graph to realize **Paracetamol** and **Ceftriaxone** are immediately at risk downstream.
    *   Show the `Days to Stockout` metric dropping.
4.  **The "Aha!" Moment (Engine 3):** Scroll down to the **72-Hour Action Ladder**. Explain that Gemini has read the policy data and generated specific procurement actions (e.g., "Lock 40 MT from alternate source").
5.  **Simulation:** Click "Run Impact" on one of the actions. Show the judges the **Action Delta** panel dynamically updating to show that spending $X million now extends the stockout buffer by +12 days and drops the risk score from Critical to Medium.
6.  **The Closer:** Use the **Query (Ask ShockMap)** tab. Ask a natural language question like *"What should procurement do about the Hebei shutdown?"* to show the AI acting as an expert analyst on the graph data.

## 🚧 What is Missing / Next Steps (Phase 2+)

While the MVP is functionally complete for a hackathon, a production-grade system would need:

1.  **Persistent Database:** Currently relying on local JSON files (`shocks.json`). Needs PostgreSQL/MongoDB for state persistence.
2.  **Authentication/RBAC:** Securing the War Room so only authorized procurement officers can trigger simulations and view sensitive supply data.
3.  **Graph Neural Networks (GNN):** The `ml/` folder contains the groundwork to upgrade Engine 2 from static PageRank to a trained GNN that learns non-linear propagation patterns from historical disruption data.
4.  **Live Vector Database Integration:** Expanding the local knowledge base into a fully hosted Qdrant cluster for massive-scale document retrieval.