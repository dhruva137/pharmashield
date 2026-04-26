"""
Local MVP smoke test:
1. Run one ingestion cycle
2. Build import graph artifact
3. Hit core API endpoints with FastAPI TestClient
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app.main import app
from backend.app.deps import get_data_loader
from ingestion.shock_detector import run_once
from graph.builder import save_graph


def main() -> None:
    data_loader = get_data_loader()
    data_loader.load_all()

    shocks = run_once()
    graph_payload = save_graph()

    client = TestClient(app)

    health = client.get("/healthz")
    sectors = client.get("/api/v1/sectors")
    shocks_res = client.get("/api/v1/shocks?limit=5")
    graph = client.get("/api/v1/graph")
    engines = client.get("/api/v1/engines")
    shocks_payload = shocks_res.json() if shocks_res.status_code == 200 else []
    first_shock_id = shocks_payload[0]["id"] if shocks_payload else None
    war_room = client.get(f"/api/v1/shocks/{first_shock_id}/war-room") if first_shock_id else None
    action_sim = None
    if war_room and war_room.status_code == 200:
        actions = war_room.json().get("action_options", [])
        if actions:
            action_sim = client.post(
                f"/api/v1/shocks/{first_shock_id}/simulate-action",
                json={"action_id": actions[0]["id"]},
            )

    report = {
        "ingestion_shocks_count": len(shocks),
        "graph_nodes": len(graph_payload.get("nodes", [])),
        "graph_edges": len(graph_payload.get("edges", [])),
        "health_status_code": health.status_code,
        "sectors_status_code": sectors.status_code,
        "shocks_status_code": shocks_res.status_code,
        "graph_status_code": graph.status_code,
        "engines_status_code": engines.status_code,
        "war_room_status_code": war_room.status_code if war_room else None,
        "action_sim_status_code": action_sim.status_code if action_sim else None,
        "health": health.json() if health.status_code == 200 else {},
    }

    report_path = ROOT / "data" / "mvp_smoke_report.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"\nWrote smoke report -> {report_path}")


if __name__ == "__main__":
    main()
