"""
Endpoints for sector listing and live supply shock events.
Powers the ShockMap sector selector and live feed on the landing page.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from ..deps import get_demo_mode_service, get_war_room_service
from ..config import settings

logger = logging.getLogger("backend.sectors")
router = APIRouter(prefix="/api/v1", tags=["sectors", "shocks"])

BASE_DIR = Path(__file__).parent.parent.parent.parent  # project root
SHOCKS_FILE = BASE_DIR / "data" / "shocks.json"
LEGACY_SHOCKS_FILE = BASE_DIR / "data" / "seed" / "live_shocks.json"
RARE_EARTHS_FILE = BASE_DIR / "data" / "seed" / "rare_earths.json"
DRUGS_FILE = BASE_DIR / "data" / "seed" / "drugs.json"


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class SectorInfo(BaseModel):
    id: str
    name: str
    icon: str
    status: str  # "active" | "phase2"
    input_count: int
    description: str
    active_shocks: int
    criticality_avg: float


class LiveShock(BaseModel):
    id: str
    sector: str
    title: str
    summary: str
    province: Optional[str] = None
    event_type: Optional[str] = None
    severity: str
    source: str
    source_url: Optional[str] = None
    published_at: Optional[str] = None
    detected_at: str
    gdelt_sources: int = 1
    data_mode: str = "live"
    affected_entities: List[str] = Field(default_factory=list)


class ActionSimulationRequest(BaseModel):
    action_id: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _load_json(path: Path) -> list:
    if not path.exists():
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to load {path}: {e}")
        return []


def _get_live_shocks(demo_service=None) -> list[dict]:
    shocks = _load_json(SHOCKS_FILE)
    legacy = _load_json(LEGACY_SHOCKS_FILE)

    current: list[dict] = []
    seen_ids: set[str] = set()

    for source in (shocks, legacy):
        for item in source:
            item_id = str(item.get("id", "")).strip()
            if item_id and item_id in seen_ids:
                continue
            if item_id:
                seen_ids.add(item_id)
            current.append(item)

    if settings.DEMO_MODE and demo_service is not None and demo_service.count() > 0:
        merged = list(current)
        for item in demo_service.list_shocks():
            item_id = str(item.get("id", "")).strip()
            if item_id and item_id in seen_ids:
                continue
            if item_id:
                seen_ids.add(item_id)
            merged.append(item)
        return merged

    return current


def _parse_dt(value: Optional[str]) -> datetime:
    if not value:
        return datetime.min
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return datetime.min


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@router.get("/sectors", response_model=List[SectorInfo])
async def get_sectors(demo_service=Depends(get_demo_mode_service)) -> List[SectorInfo]:
    """
    Returns the list of all sectors with status (active/phase2),
    input counts, average criticality, and active shock counts.
    """
    shocks = _get_live_shocks(demo_service)
    shock_by_sector: dict[str, int] = {}
    for s in shocks:
        sec = s.get("sector", "pharma")
        shock_by_sector[sec] = shock_by_sector.get(sec, 0) + 1

    # Pharma
    drugs = _load_json(DRUGS_FILE)
    pharma_crit = sum((d.get("criticality_score") or 0.5) for d in drugs) / max(len(drugs), 1)

    # Rare Earths
    rare_earths = _load_json(RARE_EARTHS_FILE)
    re_crit = sum((r.get("criticality") or 0.5) for r in rare_earths) / max(len(rare_earths), 1)

    return [
        SectorInfo(
            id="pharma",
            name="Pharma",
            icon="💊",
            status="active",
            input_count=len(drugs),
            description="API & essential medicines — India imports ~70% from China",
            active_shocks=shock_by_sector.get("pharma", 0),
            criticality_avg=round(pharma_crit, 2),
        ),
        SectorInfo(
            id="rare_earth",
            name="Rare Earths",
            icon="⛏️",
            status="active",
            input_count=len(rare_earths),
            description="Critical minerals for EV, defence & electronics — 94% China controlled",
            active_shocks=shock_by_sector.get("rare_earth", 0),
            criticality_avg=round(re_crit, 2),
        ),
        SectorInfo(
            id="semiconductor",
            name="Semiconductor",
            icon="💻",
            status="phase2",
            input_count=0,
            description="Chip substrates, fab chemicals — coming Phase 2",
            active_shocks=0,
            criticality_avg=0.0,
        ),
        SectorInfo(
            id="solar",
            name="Solar Energy",
            icon="☀️",
            status="phase2",
            input_count=0,
            description="Polysilicon, solar wafers — coming Phase 2",
            active_shocks=0,
            criticality_avg=0.0,
        ),
        SectorInfo(
            id="ev_battery",
            name="EV Battery",
            icon="🔋",
            status="phase2",
            input_count=0,
            description="Lithium, cobalt, battery cathode — coming Phase 2",
            active_shocks=0,
            criticality_avg=0.0,
        ),
        SectorInfo(
            id="defence",
            name="Defence Inputs",
            icon="🛡️",
            status="phase2",
            input_count=0,
            description="Titanium, tungsten, specialty alloys — coming Phase 2",
            active_shocks=0,
            criticality_avg=0.0,
        ),
    ]


@router.get("/shocks", response_model=List[LiveShock])
async def get_live_shocks(
    sector: Optional[str] = Query(default=None),
    severity: Optional[str] = Query(default=None),
    limit: int = Query(default=20, le=50),
    demo_service=Depends(get_demo_mode_service),
) -> List[LiveShock]:
    """
    Returns the latest live shock events detected by the GDELT pipeline.
    Optionally filter by sector or severity.
    Updated every 15 minutes by the ingestion/shock_detector.py cron.
    """
    shocks = _get_live_shocks(demo_service)

    if sector:
        shocks = [s for s in shocks if s.get("sector") == sector]
    if severity:
        shocks = [s for s in shocks if s.get("severity") == severity.upper()]

    # Sort: severity first, then by detected_at/published_at descending.
    sev_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    shocks.sort(
        key=lambda s: (
            sev_order.get(s.get("severity", "LOW"), 4),
            -_parse_dt(s.get("detected_at") or s.get("published_at")).timestamp()
            if _parse_dt(s.get("detected_at") or s.get("published_at")) != datetime.min
            else float("inf"),
        )
    )
    shocks = shocks[:limit]

    return [
        LiveShock(
            id=s.get("id", ""),
            sector=s.get("sector", "pharma"),
            title=s.get("title", ""),
            summary=s.get("summary", s.get("title", "")),
            province=s.get("province"),
            event_type=s.get("event_type"),
            severity=s.get("severity", "LOW"),
            source=s.get("source", "GDELT"),
            source_url=None if s.get("data_mode") == "demo" else s.get("source_url"),
            published_at=s.get("published_at"),
            detected_at=s.get("detected_at", datetime.utcnow().isoformat()),
            gdelt_sources=s.get("gdelt_sources", 1),
            data_mode=s.get("data_mode", "live"),
            affected_entities=s.get("affected_entities", []),
        )
        for s in shocks
    ]


@router.get("/shocks/{shock_id}")
async def get_shock_detail(
    shock_id: str,
    demo_service=Depends(get_demo_mode_service),
) -> dict:
    """
    Returns a single shock event by ID with full Engine 1/2/3 context:
      - NER-extracted entities (Engine 1)
      - PageRank propagation trace (Engine 2)
      - Community cluster info (Engine 2)
      - Affected inputs with risk scores
    """
    shocks = _get_live_shocks(demo_service)
    shock = next((s for s in shocks if s.get("id") == shock_id), None)
    if not shock:
        raise HTTPException(status_code=404, detail=f"Shock '{shock_id}' not found")

    # Enrich with Engine 2 data if province is known
    province = shock.get("province")
    if province:
        try:
            from ..deps import get_graph_service, get_shock_propagator

            graph_service = get_graph_service()
            propagator = get_shock_propagator()

            # PageRank propagation
            combined_risks = graph_service.compute_combined_risk(
                province, shock.get("sector", "pharma")
            )
            shock["propagation"] = {
                "method": "personalized_pagerank",
                "formula": "R_i = PR_i(shock) * (1 - S_i) * exp(-B_i / tau) * C_community",
                "affected_nodes": dict(list(combined_risks.items())[:10]),
                "total_affected": len(combined_risks),
            }

            # Community info
            community_id = graph_service.get_node_community(province)
            if community_id is not None:
                communities = graph_service.get_communities()
                for c in communities.get("communities", []):
                    if c["id"] == community_id:
                        shock["community"] = {
                            "id": community_id,
                            "label": c["label"],
                            "size": c["size"],
                            "provinces": c["provinces"],
                            "co_affected_inputs": c["inputs"][:5],
                        }
                        break

            # Affected drugs list
            affected = graph_service.get_drugs_dependent_on_province(province)
            shock["affected_drugs"] = affected

        except Exception as e:
            logger.warning(f"Engine 2 enrichment failed for shock {shock_id}: {e}")

    return shock


@router.get("/shocks/{shock_id}/war-room")
async def get_shock_war_room(
    shock_id: str,
    demo_service=Depends(get_demo_mode_service),
    war_room_service=Depends(get_war_room_service),
) -> dict:
    shocks = _get_live_shocks(demo_service)
    shock = next((s for s in shocks if s.get("id") == shock_id), None)
    if not shock:
        raise HTTPException(status_code=404, detail=f"Shock '{shock_id}' not found")
    return war_room_service.build(shock)


@router.post("/shocks/{shock_id}/simulate-action")
async def simulate_shock_action(
    shock_id: str,
    request: ActionSimulationRequest,
    demo_service=Depends(get_demo_mode_service),
    war_room_service=Depends(get_war_room_service),
) -> dict:
    shocks = _get_live_shocks(demo_service)
    shock = next((s for s in shocks if s.get("id") == shock_id), None)
    if not shock:
        raise HTTPException(status_code=404, detail=f"Shock '{shock_id}' not found")

    try:
        return war_room_service.simulate_action(shock, request.action_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Action '{request.action_id}' not found for shock '{shock_id}'")
