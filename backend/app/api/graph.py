"""
Endpoints for supply chain graph visualization and geospatial risk aggregation.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Annotated, Any
from fastapi import APIRouter, Depends

from ..deps import get_graph_service, get_gnn, get_data_loader
from ..services.graph_service import GraphService
from ..services.shock_propagation import ShockPropagator
from ..services.criticality import compute_score
from ..models.graph import GraphResponse, StateRiskAggregate, GraphNode, GraphEdge


router = APIRouter(prefix="/api/v1", tags=["graph"])

# In-memory cache for graph data
_graph_cache: Dict[str, Any] = {
    "data": None,
    "expiry": datetime.min
}

# Mapping of Indian states to their representative drug subsets for risk aggregation
STATE_DRUG_MAP = {
    "MH": ("Maharashtra", ["paracetamol", "amoxicillin", "metformin", "atorvastatin"]),
    "DL": ("Delhi", ["azithromycin", "ceftriaxone", "amlodipine"]),
    "KA": ("Karnataka", ["losartan", "omeprazole", "ranitidine", "ibuprofen"]),
    "TN": ("Tamil Nadu", ["diclofenac", "aspirin", "penicillin_g"]),
    "WB": ("West Bengal", ["gentamicin", "fluconazole", "ciprofloxacin"]),
    "GJ": ("Gujarat", ["levofloxacin", "insulin", "salbutamol"])
}


def _get_current_graph_data(
    graph_service: GraphService,
    gnn: ShockPropagator,
    data_loader: Any
) -> GraphResponse:
    """Computes risks and aggregates state-level data."""
    # 1. Get raw graph structure
    graph_dict = graph_service.to_serializable_dict()
    
    # 2. Compute current risk for every drug
    risk_map: Dict[str, float] = {}
    drugs = data_loader.get_drugs()
    
    use_gnn = hasattr(gnn, "is_available") and gnn.is_available()

    if use_gnn:
        risk_map = gnn.compute_current_risk()
    else:
        for drug in drugs:
            hhi = graph_service.compute_concentration_hhi(drug.id)
            risk_map[drug.id] = compute_score(drug, hhi)
            
    # 3. Apply computed risks back to the graph service nodes
    graph_service.apply_risk_scores(risk_map)
    
    # Refresh nodes list after applying risks
    updated_graph = graph_service.to_serializable_dict()
    
    # 4. Compute state_risk_aggregates
    state_aggregates = []
    for state_id, (state_name, drug_ids) in STATE_DRUG_MAP.items():
        state_risks = [risk_map.get(d_id, 0.0) for d_id in drug_ids if d_id in risk_map]
        
        # Calculate mean risk for the state
        mean_risk = sum(state_risks) / len(state_risks) if state_risks else 0.0
        
        # Identify top 3 at-risk drugs for this state
        # Sort state drugs by risk descending
        sorted_drugs = sorted(
            [(d_id, risk_map.get(d_id, 0.0)) for d_id in drug_ids],
            key=lambda x: x[1],
            reverse=True
        )
        top_drugs = [d[0] for d in sorted_drugs[:3]]
        
        state_aggregates.append(StateRiskAggregate(
            state_id=state_id,
            state_name=state_name,
            risk_score=float(mean_risk),
            top_at_risk_drugs=top_drugs
        ))
        
    return GraphResponse(
        nodes=[GraphNode(**n) for n in updated_graph["nodes"]],
        edges=[GraphEdge(**e) for e in updated_graph["edges"]],
        state_risk_aggregates=state_aggregates,
        generated_at=datetime.utcnow()
    )


@router.get("/graph", response_model=GraphResponse)
async def get_full_graph(
    graph_service: Annotated[GraphService, Depends(get_graph_service)],
    gnn: Annotated[ShockPropagator, Depends(get_gnn)],
    data_loader: Annotated[Any, Depends(get_data_loader)]
) -> GraphResponse:
    """
    Returns the complete supply chain graph with computed risks and state-level aggregates.
    
    The result is cached for 1 hour to optimize performance.
    """
    global _graph_cache
    now = datetime.utcnow()
    
    if _graph_cache["data"] and _graph_cache["expiry"] > now:
        return _graph_cache["data"]
        
    response = _get_current_graph_data(graph_service, gnn, data_loader)
    
    _graph_cache["data"] = response
    _graph_cache["expiry"] = now + timedelta(hours=1)
    
    return response


@router.get("/graph/states", response_model=List[StateRiskAggregate])
async def get_state_risks(
    graph_service: Annotated[GraphService, Depends(get_graph_service)],
    gnn: Annotated[ShockPropagator, Depends(get_gnn)],
    data_loader: Annotated[Any, Depends(get_data_loader)]
) -> List[StateRiskAggregate]:
    """
    Returns just the geospatial risk aggregates for India.
    
    Useful for lightweight map visualizations.
    """
    # Reuse cached data if available
    global _graph_cache
    now = datetime.utcnow()
    
    if _graph_cache["data"] and _graph_cache["expiry"] > now:
        return _graph_cache["data"].state_risk_aggregates
        
    full_graph = _get_current_graph_data(graph_service, gnn, data_loader)
    
    # Update cache while we are at it
    _graph_cache["data"] = full_graph
    _graph_cache["expiry"] = now + timedelta(hours=1)
    
    return full_graph.state_risk_aggregates
