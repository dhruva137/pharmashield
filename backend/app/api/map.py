"""
Map API — Geospatial Intelligence Surface

Provides heatmap, province detail, supply corridors, and filter facets
for the interactive Leaflet map frontend.
"""

import logging
from datetime import datetime
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, Query, HTTPException
from ..deps import get_graph_service, get_data_loader, get_demo_mode_service
from ..models.graph import ProvinceHeatmapPoint, HeatmapResponse
from .sectors import _get_live_shocks

logger = logging.getLogger("backend.map")
router = APIRouter(prefix="/api/v1/map", tags=["map"])


def _compute_india_state_risk(state: dict, graph_service, shocks: list, sector: str) -> float:
    """Compute risk score for an Indian state based on its top drugs' dependencies."""
    total_risk = 0.0
    top_drugs = state.get("top_drugs", [])
    
    for drug_id in top_drugs:
        node = graph_service.graph.nodes.get(drug_id, {})
        drug_risk = node.get("current_risk", 0.0)
        total_risk += drug_risk
    
    # Factor in shock proximity (shocks that mention this state or affect its drugs)
    state_shocks = [s for s in shocks if s.get("province") and any(
        drug_id in (graph_service.get_drugs_dependent_on_province(s["province"]) or [])
        for drug_id in top_drugs
    )]
    shock_factor = min(30, len(state_shocks) * 10)
    
    # Normalize: base drug risk + shock amplifier
    base_risk = min(70, total_risk * 2) if top_drugs else 10
    return round(min(100.0, base_risk + shock_factor), 2)


@router.get("/heatmap", response_model=HeatmapResponse)
async def get_heatmap(
    sector: str = Query(default="both"),
    risk_min: float = Query(default=0.0),
    shock_type: Optional[str] = Query(default=None),
    region: str = Query(default="all", description="'china', 'india', or 'all'"),
    graph_service = Depends(get_graph_service),
    data_loader = Depends(get_data_loader),
    demo_service = Depends(get_demo_mode_service)
):
    """
    Returns heatmap data for Chinese provinces and Indian states.
    Supports region filtering for focused views.
    """
    shocks = _get_live_shocks(demo_service)
    points = []
    
    # ── China Provinces ──────────────────────────────────────────────────
    if region in ("china", "all"):
        provinces = data_loader.get_china_provinces()
        
        for p in provinces:
            pname = p["name"]
            pid = p["id"]
            
            # Sector filter for provinces
            province_sectors = p.get("sectors", ["pharma"])
            if sector != "both" and sector not in province_sectors:
                continue
            
            risk_score = graph_service.compute_province_risk(pname, sector)
            
            if risk_score < risk_min:
                continue
                
            province_shocks = [s for s in shocks if s.get("province") == pname]
            if sector != "both":
                province_shocks = [s for s in province_shocks if s.get("sector") == sector]
                
            if shock_type:
                province_shocks = [s for s in province_shocks if s.get("event_type") == shock_type]
                if not province_shocks:
                    continue

            affected = graph_service.get_drugs_dependent_on_province(pname)
            if sector != "both":
                affected = [a for a in affected if graph_service.graph.nodes.get(a, {}).get("sector") == sector]

            points.append(ProvinceHeatmapPoint(
                id=pid,
                name=pname,
                latitude=p["latitude"],
                longitude=p["longitude"],
                risk_score=risk_score,
                shock_count=len(province_shocks),
                sector=sector,
                description=p.get("description"),
                top_affected_inputs=affected[:5],
                region="china",
                factories=p.get("factories", []),
            ))
    
    # ── India States ─────────────────────────────────────────────────────
    if region in ("india", "all"):
        states = data_loader.get_india_states()
        
        for s in states:
            sname = s["name"]
            sid = s["id"]
            
            risk_score = _compute_india_state_risk(s, graph_service, shocks, sector)
            
            if risk_score < risk_min:
                continue
            
            # Shocks affecting this state's drugs
            state_shock_count = 0
            for shock in shocks:
                if shock_type and shock.get("event_type") != shock_type:
                    continue
                if sector != "both" and shock.get("sector") != sector:
                    continue
                province = shock.get("province")
                if province:
                    affected_drugs = graph_service.get_drugs_dependent_on_province(province)
                    if any(d in s.get("top_drugs", []) for d in affected_drugs):
                        state_shock_count += 1
            
            points.append(ProvinceHeatmapPoint(
                id=sid,
                name=sname,
                latitude=s["latitude"],
                longitude=s["longitude"],
                risk_score=risk_score,
                shock_count=state_shock_count,
                sector=sector,
                description=s.get("description"),
                top_affected_inputs=s.get("top_drugs", [])[:5],
                region="india",
                factories=[],
            ))
        
    return HeatmapResponse(
        points=points,
        generated_at=datetime.utcnow()
    )


@router.get("/provinces/{province_id}")
async def get_province_detail(
    province_id: str,
    sector: str = Query(default="both"),
    graph_service = Depends(get_graph_service),
    data_loader = Depends(get_data_loader),
    demo_service = Depends(get_demo_mode_service)
):
    """
    Returns detailed metrics for a specific province or Indian state.
    """
    # Check China provinces first
    provinces = data_loader.get_china_provinces()
    province = next((p for p in provinces if p["id"] == province_id or p["name"] == province_id), None)
    
    # Then check India states
    is_india = False
    if not province:
        states = data_loader.get_india_states()
        province = next((s for s in states if s["id"] == province_id or s["name"] == province_id), None)
        is_india = True
    
    if not province:
        raise HTTPException(status_code=404, detail=f"Province/State {province_id} not found")
        
    pname = province["name"]
    shocks = _get_live_shocks(demo_service)
    
    if is_india:
        # For Indian states, find shocks that affect their drugs
        province_shocks = []
        top_drugs = province.get("top_drugs", [])
        for shock in shocks:
            shock_province = shock.get("province")
            if shock_province:
                affected = graph_service.get_drugs_dependent_on_province(shock_province)
                if any(d in top_drugs for d in affected):
                    province_shocks.append(shock)
        
        risk_score = _compute_india_state_risk(province, graph_service, shocks, sector)
        
        top_entities = []
        for drug_id in top_drugs[:10]:
            node = graph_service.graph.nodes.get(drug_id, {})
            if node:
                top_entities.append({
                    "id": drug_id,
                    "name": node.get("name", drug_id),
                    "type": node.get("type"),
                    "risk": node.get("current_risk", 0.0)
                })
    else:
        province_shocks = [s for s in shocks if s.get("province") == pname]
        if sector != "both":
            province_shocks = [s for s in province_shocks if s.get("sector") == sector]

        risk_score = graph_service.compute_province_risk(pname, sector)
        affected = graph_service.get_drugs_dependent_on_province(pname)
        
        if sector != "both":
            affected = [a for a in affected if graph_service.graph.nodes.get(a, {}).get("sector") == sector]

        top_entities = []
        for entity_id in affected[:10]:
            node = graph_service.graph.nodes.get(entity_id, {})
            top_entities.append({
                "id": entity_id,
                "name": node.get("name", entity_id),
                "type": node.get("type"),
                "risk": node.get("current_risk", 0.0)
            })

    return {
        "id": province.get("id"),
        "name": pname,
        "region": "india" if is_india else "china",
        "risk_score": risk_score,
        "shocks": province_shocks[:10],
        "factories": province.get("factories", []),
        "description": province.get("description"),
        "top_entities": top_entities,
        "coordinates": {"lat": province["latitude"], "lng": province["longitude"]},
        "population_millions": province.get("population_millions"),
        "pharma_hub": province.get("pharma_hub", False),
        "sectors": province.get("sectors", []),
        "annual_api_output_tons": province.get("annual_api_output_tons", 0),
    }


@router.get("/supply-corridors")
async def get_supply_corridors(
    sector: str = Query(default="both"),
    graph_service = Depends(get_graph_service),
    data_loader = Depends(get_data_loader)
):
    """
    Returns supply corridors (China Province -> India State) with risk weighting.
    """
    corridors = []
    provinces = data_loader.get_china_provinces()
    states = data_loader.get_india_states()
    
    for p in provinces:
        pname = p["name"]
        
        # Sector filter
        province_sectors = p.get("sectors", ["pharma"])
        if sector != "both" and sector not in province_sectors:
            continue
        
        affected_drugs = graph_service.get_drugs_dependent_on_province(pname)
        if not affected_drugs:
            continue
            
        province_risk = graph_service.compute_province_risk(pname, sector)
        
        for s in states:
            overlap = set(affected_drugs).intersection(set(s.get("top_drugs", [])))
            if overlap:
                corridors.append({
                    "id": f"{p['id']}_{s['id']}",
                    "source": {
                        "id": p["id"],
                        "name": pname,
                        "lat": p["latitude"],
                        "lng": p["longitude"],
                        "region": "china"
                    },
                    "target": {
                        "id": s["id"],
                        "name": s["name"],
                        "lat": s["latitude"],
                        "lng": s["longitude"],
                        "region": "india"
                    },
                    "weight": len(overlap),
                    "risk_score": province_risk,
                    "affected_entities": list(overlap)[:5]
                })
                
    return {"corridors": corridors, "total": len(corridors)}


@router.get("/filter-facets")
async def get_filter_facets(
    data_loader = Depends(get_data_loader),
    demo_service = Depends(get_demo_mode_service)
):
    """
    Returns available options for map filtering.
    """
    shocks = _get_live_shocks(demo_service)
    shock_types = sorted(list(set([s.get("event_type") for s in shocks if s.get("event_type")])))
    sectors = ["pharma", "rare_earth"]
    
    china_provinces = sorted([p["name"] for p in data_loader.get_china_provinces()])
    india_states = sorted([s["name"] for s in data_loader.get_india_states()])
    
    severity_levels = sorted(list(set([s.get("severity") for s in shocks if s.get("severity")])))
    
    return {
        "sectors": sectors,
        "shock_types": shock_types,
        "risk_levels": ["low", "medium", "high", "critical"],
        "severity_levels": severity_levels,
        "china_provinces": china_provinces,
        "india_states": india_states,
        "provinces": china_provinces,  # backward compat
        "regions": ["china", "india", "all"],
    }


@router.get("/stats")
async def get_map_stats(
    graph_service = Depends(get_graph_service),
    data_loader = Depends(get_data_loader),
    demo_service = Depends(get_demo_mode_service)
):
    """
    Returns aggregate statistics for the map overview banner.
    """
    shocks = _get_live_shocks(demo_service)
    provinces = data_loader.get_china_provinces()
    states = data_loader.get_india_states()
    
    active_shocks = len(shocks)
    high_risk_provinces = 0
    total_factories = 0
    
    for p in provinces:
        risk = graph_service.compute_province_risk(p["name"], "both")
        if risk >= 60:
            high_risk_provinces += 1
        total_factories += len(p.get("factories", []))
    
    total_corridors = 0
    for p in provinces:
        affected = graph_service.get_drugs_dependent_on_province(p["name"])
        for s in states:
            if set(affected).intersection(set(s.get("top_drugs", []))):
                total_corridors += 1
    
    return {
        "active_shocks": active_shocks,
        "monitored_provinces": len(provinces),
        "monitored_states": len(states),
        "high_risk_provinces": high_risk_provinces,
        "total_factories": total_factories,
        "supply_corridors": total_corridors,
    }
