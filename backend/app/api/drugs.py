"""
Endpoints for retrieving and filtering drug dependency and risk data.
"""

from typing import List, Optional, Annotated, Literal, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException

from ..deps import get_data_loader, get_graph_service, get_gnn
from ..services.graph_service import GraphService
from ..services.shock_propagation import ShockPropagator
from ..services.criticality import compute_score, compute_breakdown
from ..models.drug import Drug, NLEMTier


router = APIRouter(prefix="/api/v1", tags=["drugs"])


@router.get("/drugs")
async def get_drugs(
    severity: Optional[Literal["low", "medium", "high", "critical"]] = None,
    tier: Optional[int] = Query(None, ge=1, le=3),
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    data_loader: Annotated[Any, Depends(get_data_loader)] = None,
    graph_service: Annotated[GraphService, Depends(get_graph_service)] = None,
    gnn: Annotated[ShockPropagator, Depends(get_gnn)] = None
):
    """
    Returns a paginated and filtered list of drugs with computed criticality and risk scores.
    """
    all_drugs = data_loader.get_drugs()
    
    # Pre-compute scores and apply filters
    processed_drugs = []
    
    # Pre-compute full risk map once (avoids per-drug GNN inference)
    use_gnn = hasattr(gnn, "is_available") and gnn.is_available()
    gnn_risk_map = gnn.compute_current_risk() if use_gnn else {}

    for drug in all_drugs:
        # 1. Compute HHI
        hhi = graph_service.compute_concentration_hhi(drug.id)

        # 2. Compute Criticality
        crit_score = compute_score(drug, hhi)
        drug.criticality_score = crit_score

        # 3. Compute Current Risk
        if use_gnn:
            risk = gnn_risk_map.get(drug.id, crit_score)
        else:
            risk = crit_score
        drug.current_risk = risk
        
        # 4. Apply Tier Filter
        if tier is not None:
            expected_tier = f"TIER_{tier}"
            if drug.nlem_tier.value != expected_tier:
                continue
        
        # 5. Apply Severity Filter
        # Buckets: low <30, medium 30-60, high 60-80, critical >80
        if severity is not None:
            if severity == "low" and risk >= 30: continue
            if severity == "medium" and (risk < 30 or risk >= 60): continue
            if severity == "high" and (risk < 60 or risk >= 80): continue
            if severity == "critical" and risk < 80: continue
            
        processed_drugs.append(drug)
        
    # Paginate
    total = len(processed_drugs)
    paginated = processed_drugs[offset : offset + limit]
    
    return {
        "drugs": paginated,
        "total": total,
        "page": (offset // limit) + 1,
        "page_size": len(paginated)
    }


@router.get("/drug/{drug_id}")
async def get_drug_detail(
    drug_id: str,
    data_loader: Annotated[Any, Depends(get_data_loader)] = None,
    graph_service: Annotated[GraphService, Depends(get_graph_service)] = None,
    gnn: Annotated[ShockPropagator, Depends(get_gnn)] = None
):
    """
    Returns detailed supply chain and risk information for a specific drug.
    """
    drug = data_loader.get_drug(drug_id)
    if not drug:
        raise HTTPException(status_code=404, detail=f"Drug with ID '{drug_id}' not found")
        
    # 1. Supplier HHI
    hhi = graph_service.compute_concentration_hhi(drug_id)
    
    # 2. Dependency Chain
    chain = graph_service.get_dependency_chain(drug_id)
    
    # 3. Criticality Breakdown
    breakdown = compute_breakdown(drug, hhi)
    
    # 4. Recent Alerts (last 5 affecting this drug)
    all_alerts = data_loader.get_alerts()
    drug_alerts = [a for a in all_alerts if drug_id in a.affected_drugs]
    # Sort by created_at descending
    recent_alerts = sorted(drug_alerts, key=lambda x: x.created_at, reverse=True)[:5]
    
    # 5. Current Risk
    use_gnn = hasattr(gnn, "is_available") and gnn.is_available()
    if use_gnn:
        risk_map = gnn.compute_current_risk()
        risk = risk_map.get(drug_id, compute_score(drug, hhi))
    else:
        risk = compute_score(drug, hhi)
        
    # Enrich the drug object for the response
    drug.criticality_score = breakdown["final_score"]
    drug.current_risk = risk
    
    return {
        "drug": drug,
        "dependency_chain": chain,
        "supplier_hhi": hhi,
        "criticality_breakdown": breakdown,
        "recent_alerts": recent_alerts,
        "current_risk": risk
    }
