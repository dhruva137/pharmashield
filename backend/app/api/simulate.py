"""
Endpoints for running what-if supply chain simulations.
"""

import logging
from datetime import datetime
from typing import Annotated, Any, List, Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..deps import get_shock_propagator, get_graph_service, get_data_loader, get_gemini_analyst
from ..services.shock_propagation import ShockPropagator
from ..services.graph_service import GraphService
from ..services.gemini_analyst import GeminiAnalyst
from ..models.drug import Drug

# Setup Logging
logger = logging.getLogger("backend.simulate")

router = APIRouter(prefix="/api/v1", tags=["simulate"])


class SimulationRequest(BaseModel):
    """Parameters for a supply chain shock simulation."""
    province: str = Field(..., description="The ID of the province where the shock occurs")
    duration_days: int = Field(..., ge=1, le=180, description="Duration of the disruption in days")
    severity: Literal["warning", "partial_shutdown", "full_shutdown"] = Field(..., description="Intensity of the shock")


class SimulationResult(BaseModel):
    """The outcome of a shock simulation."""
    affected_drugs: List[Drug] = Field(..., description="List of top 10 drugs most affected by the shock")
    propagation_explanation: str = Field(..., description="AI or rule-based explanation of why these drugs are at risk")
    simulated_at: datetime = Field(default_factory=datetime.utcnow)


@router.post("/simulate", response_model=SimulationResult)
async def post_simulate(
    request: SimulationRequest,
    propagator: Annotated[ShockPropagator, Depends(get_shock_propagator)],
    graph_service: Annotated[GraphService, Depends(get_graph_service)],
    data_loader: Annotated[Any, Depends(get_data_loader)],
    analyst: Annotated[GeminiAnalyst, Depends(get_gemini_analyst)]
) -> SimulationResult:
    """
    Simulates a regional production shock and predicts its impact on the drug supply.
    
    Uses the GNN shock propagation model to estimate risk scores across the network.
    """
    logger.info(f"Simulation Request: province={request.province}, dur={request.duration_days}, sev={request.severity}")
    
    # 1. Validate Province — be lenient: accept province name or ID
    node = graph_service.get_node(request.province)
    if not node or node["type"] != "province":
        # Also try matching by name (case-insensitive)
        all_provinces = graph_service.nodes_by_type("province")
        match = next(
            (p for p in all_provinces if p and p["name"].lower() == request.province.lower()),
            None
        )
        if match:
            request = request.model_copy(update={"province": match["id"]})
        else:
            available = [p["name"] for p in all_provinces if p]
            raise HTTPException(
                status_code=422,
                detail=f"Province '{request.province}' not found. Available: {', '.join(available[:10])}"
            )

    # 2. Run Shock Propagation
    risk_map = propagator.simulate_shock(
        province=request.province,
        duration_days=request.duration_days,
        severity=request.severity
    )
    
    # 3. Filter and Hydrate Top 10
    filtered_risks = sorted(
        [(d_id, score) for d_id, score in risk_map.items() if score > 30],
        key=lambda x: x[1],
        reverse=True
    )[:10]
    
    hydrated_drugs = []
    top_drug_names = []
    for d_id, score in filtered_risks:
        drug = data_loader.get_drug(d_id)
        if drug:
            # Pydantic v2: use model_copy to update immutable fields
            drug = drug.model_copy(update={"current_risk": score})
            hydrated_drugs.append(drug)
            top_drug_names.append(drug.name)

    # 4. Generate Explanation (falls back to rule-based if Gemini unavailable)
    explanation = propagator.propagate_explanation(
        province=request.province,
        duration_days=request.duration_days,
        severity=request.severity,
        top_affected=top_drug_names
    )

    if top_drug_names:
        try:
            from ..config import settings
            explain_prompt = (
                f"Briefly explain in 2-3 sentences why a {request.severity.replace('_', ' ')} "
                f"in {request.province} for {request.duration_days} days affects these drugs: "
                f"{', '.join(top_drug_names)}. Focus on shared API precursors and regional manufacturing concentration."
            )
            model = analyst.genai.GenerativeModel(settings.GEMINI_FLASH_MODEL)
            explanation = model.generate_content(explain_prompt).text
        except Exception as e:
            logger.warning(f"Gemini explanation failed, using rule-based fallback: {e}")

    return SimulationResult(
        affected_drugs=hydrated_drugs,
        propagation_explanation=explanation,
        simulated_at=datetime.utcnow()
    )
