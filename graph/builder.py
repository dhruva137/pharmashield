"""
Builds the MVP import graph:
- 20 pharma API nodes
- 8 rare earth mineral nodes
- edges weighted by India's monthly import volume (USD millions)
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import networkx as nx

BASE_DIR = Path(__file__).resolve().parent.parent
APIS_FILE = BASE_DIR / "data" / "seed" / "apis.json"
RARE_EARTHS_FILE = BASE_DIR / "data" / "seed" / "rare_earths.json"
OUTPUT_FILE = BASE_DIR / "data" / "graph_imports.json"

INDIA_NODE_ID = "india"
PHARMA_NODE_LIMIT = 20
RARE_EARTH_NODE_LIMIT = 8


def _read_json(path: Path) -> list[dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def _top_by_import_value(records: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
    sorted_rows = sorted(
        records,
        key=lambda row: float(row.get("monthly_import_value_usd_millions", 0) or 0),
        reverse=True,
    )
    return sorted_rows[:limit]


def build_import_graph() -> nx.DiGraph:
    apis = _top_by_import_value(_read_json(APIS_FILE), PHARMA_NODE_LIMIT)
    rare_earths = _top_by_import_value(_read_json(RARE_EARTHS_FILE), RARE_EARTH_NODE_LIMIT)

    graph = nx.DiGraph(name="pharmashield_mvp_import_graph")
    graph.add_node(INDIA_NODE_ID, type="country", name="India")

    max_value = max(
        [float(item.get("monthly_import_value_usd_millions", 0) or 0) for item in apis + rare_earths] or [1.0]
    )

    for api in apis:
        node_id = api["id"]
        value = float(api.get("monthly_import_value_usd_millions", 0) or 0)
        graph.add_node(
            node_id,
            type="pharma_api",
            name=api.get("name", node_id),
            sector="pharma",
            china_share=api.get("china_share"),
            primary_provinces=api.get("primary_provinces", []),
            monthly_import_value_usd_millions=value,
        )
        graph.add_edge(
            node_id,
            INDIA_NODE_ID,
            edge_type="india_imports_api",
            import_volume_usd_millions=value,
            weight=round(value / max_value, 6),
        )

    for mineral in rare_earths:
        node_id = mineral["id"]
        value = float(mineral.get("monthly_import_value_usd_millions", 0) or 0)
        graph.add_node(
            node_id,
            type="rare_earth",
            name=mineral.get("name", node_id),
            sector="rare_earth",
            china_share=mineral.get("china_share"),
            primary_provinces=mineral.get("primary_provinces", []),
            monthly_import_value_usd_millions=value,
        )
        graph.add_edge(
            node_id,
            INDIA_NODE_ID,
            edge_type="india_imports_rare_earth",
            import_volume_usd_millions=value,
            weight=round(value / max_value, 6),
        )

    return graph


def graph_to_dict(graph: nx.DiGraph) -> dict[str, Any]:
    return {
        "nodes": [
            {"id": node_id, **attrs}
            for node_id, attrs in graph.nodes(data=True)
        ],
        "edges": [
            {"source": source, "target": target, **attrs}
            for source, target, attrs in graph.edges(data=True)
        ],
    }


def save_graph(path: Path = OUTPUT_FILE) -> dict[str, Any]:
    graph = build_import_graph()
    payload = graph_to_dict(graph)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2, ensure_ascii=False)
    return payload


if __name__ == "__main__":
    result = save_graph()
    print(
        f"Built import graph with {len(result['nodes'])} nodes "
        f"and {len(result['edges'])} edges -> {OUTPUT_FILE}"
    )
