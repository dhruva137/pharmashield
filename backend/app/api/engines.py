"""
Engine 2 and Engine 3 API endpoints.

Exposes propagation, community, criticality, action-planning, and diagnostics
used by the frontend operations surfaces.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from ..config import settings
from ..deps import (
    get_gemini_analyst,
    get_gemini_flash_client,
    get_graph_service,
    get_retriever,
    get_shock_propagator,
)
from ..services.criticality import compute_node_criticality
from ..services.gemini_analyst import GeminiAnalyst
from ..services.graph_service import GraphService
from ..services.shock_propagation import ShockPropagator

logger = logging.getLogger("shockmap.engine_api")

router = APIRouter(prefix="/api/v1", tags=["engine2", "propagation"])

PROPAGATION_FORMULA = "R_i = PR_i(shock) * (1 - S_i) * exp(-B_i / tau) * C_community"


class PropagationRequest(BaseModel):
    province: str = Field(..., description="Province to simulate shock from")
    sector: str = Field(default="pharma", description="Sector context")


class ActionPlanRequest(BaseModel):
    region: str = Field(..., description="Shocked region (province)")
    shock_type: str = Field(
        default="factory_shutdown",
        description="Type: export_ban | factory_shutdown | env_compliance | logistics_block | price_spike",
    )
    sector: str = Field(default="pharma")


def _engine_data_mode(gemini_available: bool, retriever_enabled: bool) -> str:
    if settings.DEMO_MODE and (gemini_available or retriever_enabled):
        return "hybrid_demo_live"
    if settings.DEMO_MODE:
        return "demo"
    return "live"


@router.get("/propagation/{province}")
async def get_propagation(
    province: str,
    sector: str = Query(default="pharma"),
    graph_service: GraphService = Depends(get_graph_service),
    propagator: ShockPropagator = Depends(get_shock_propagator),
):
    """
    Returns PageRank-based shock propagation from a given province.
    """
    node = graph_service.get_node(province)
    if not node:
        all_provinces = graph_service.nodes_by_type("province")
        match = next(
            (item for item in all_provinces if item and item["name"].lower() == province.lower()),
            None,
        )
        if match:
            province = match["id"]
        else:
            available = [item["name"] for item in all_provinces if item]
            raise HTTPException(
                status_code=404,
                detail=f"Province '{province}' not found. Available: {', '.join(available[:10])}",
            )

    trace = propagator.get_propagation_trace(province, sector)
    combined_risks = graph_service.compute_combined_risk(province, sector)

    return {
        "province": province,
        "sector": sector,
        "method": "personalized_pagerank",
        "formula": PROPAGATION_FORMULA,
        "affected_nodes": combined_risks,
        "propagation_trace": trace,
        "total_affected": len(combined_risks),
    }


@router.get("/communities")
async def get_communities(
    graph_service: GraphService = Depends(get_graph_service),
):
    """
    Returns Louvain-detected supply chain communities.
    """
    return graph_service.get_communities()


@router.get("/communities/{node_id}")
async def get_node_community(
    node_id: str,
    graph_service: GraphService = Depends(get_graph_service),
):
    """
    Returns the community membership for a specific node.
    """
    community_id = graph_service.get_node_community(node_id)
    if community_id is None:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")

    communities = graph_service.get_communities()
    community = next(
        (item for item in communities.get("communities", []) if item["id"] == community_id),
        None,
    )

    return {
        "node_id": node_id,
        "community_id": community_id,
        "community": community,
    }


@router.get("/criticality/{node_id}")
async def get_criticality(
    node_id: str,
    graph_service: GraphService = Depends(get_graph_service),
):
    """
    Returns the multi-factor criticality breakdown for a node.
    """
    result = compute_node_criticality(graph_service, node_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")

    return result


@router.post("/action-plan")
async def generate_action_plan(
    request: ActionPlanRequest,
    analyst: GeminiAnalyst = Depends(get_gemini_analyst),
):
    """
    Engine 3: Generates a grounded action plan for a detected shock.
    """
    return await analyst.generate_action_plan(
        shocked_region=request.region,
        shock_type=request.shock_type,
        sector=request.sector,
    )


@router.get("/engines")
async def get_engine_status(
    graph_service: GraphService = Depends(get_graph_service),
    propagator: ShockPropagator = Depends(get_shock_propagator),
    gemini_client=Depends(get_gemini_flash_client),
    retriever=Depends(get_retriever),
):
    """
    Returns the status of all three engines for diagnostics and UI badges.
    """
    communities = graph_service.get_communities()
    gemini_available = bool(gemini_client.is_available())
    retriever_enabled = bool(getattr(retriever, "_enabled", False))
    data_mode = _engine_data_mode(gemini_available, retriever_enabled)

    return {
        "engine_1": {
            "name": "Signal Intelligence",
            "method": "Gemini Flash structured extraction",
            "status": "active",
            "data_mode": data_mode,
            "gemini_flash_available": gemini_available,
            "response_strategy": "keyword pre-filter -> Flash JSON -> deterministic fallback",
            "description": "Extracts structured supply-shock entities from GDELT and supporting feeds.",
        },
        "engine_2": {
            "name": "Shock Propagation",
            "method": "Personalized PageRank + Louvain Communities",
            "status": "active",
            "graph_nodes": graph_service.graph.number_of_nodes(),
            "graph_edges": graph_service.graph.number_of_edges(),
            "community_detection_enabled": communities.get("community_detection_enabled", True),
            "community_detection_method": communities.get("community_detection_method", "louvain"),
            "communities_detected": communities.get("total_communities", 0),
            "gnn_enabled": settings.ENABLE_GNN,
            "gnn_available": propagator.is_available(),
            "active_mode": propagator.mode(),
            "formula": PROPAGATION_FORMULA,
        },
        "engine_3": {
            "name": "Action Intelligence",
            "method": "Grounded RAG + Gemini Flash",
            "status": "active",
            "data_mode": data_mode,
            "gemini_flash_available": gemini_available,
            "retriever_enabled": retriever_enabled,
            "response_strategy": "retrieval merge -> Flash JSON -> scenario-backed fallback",
            "description": "Generates operator-ready actions with citations and deterministic degradation.",
        },
    }
