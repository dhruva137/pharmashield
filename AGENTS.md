# PharmaShield MVP Architecture Contract

This file defines the minimum agent-facing architecture expected for MVP completion.

## Required Modules

1. `ingestion/shock_detector.py`
   - Polls GDELT every 15 minutes.
   - Filters disruption events for:
     - `factory shutdown`
     - `export ban`
     - `port closure`
     - `contamination`
   - Persists structured events to `data/shocks.json`.

2. `graph/builder.py`
   - Builds a NetworkX graph with:
     - 20 pharma API nodes
     - 8 rare earth mineral nodes
   - Adds import edges weighted by India import volume.

3. `backend/app/api/sectors.py`
   - Reads live shocks from `data/shocks.json` (legacy fallback allowed).
   - Serves `/api/v1/shocks` and `/api/v1/shocks/{id}`.

4. `backend/app/services/shock_propagation.py`
   - Supports PageRank fallback when GNN weights are missing.

## Data Contract

- `data/seed/apis.json`: pharma API seed records.
- `data/seed/rare_earths.json`: rare earth seed records.
- `data/shocks.json`: live structured shock feed.

