"""
Domestic Supply Chain Intelligence API
India internal routing: Port → Warehouse → Formulation → Distribution → Hospital
with alternate path computation and bottleneck detection.
"""
from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter(prefix="/api/v1/domestic", tags=["Domestic Supply Chain"])

# Realistic mock nodes for Paracetamol supply chain within India
PARACETAMOL_CHAIN = {
    "api_name": "Paracetamol API",
    "china_source": {"id": "cn-hebei", "name": "Hebei Pharma Co.", "location": [38.04, 114.50], "type": "manufacturer"},
    "nodes": [
        {"id": "port-jnpt",     "name": "JNPT Mumbai",           "type": "port",          "lat": 18.95, "lon": 72.85, "state": "Maharashtra",    "congestion_pct": 87, "clearance_days": 3.2, "status": "CONGESTED"},
        {"id": "port-mundra",   "name": "Mundra Port",            "type": "port",          "lat": 22.84, "lon": 69.72, "state": "Gujarat",        "congestion_pct": 64, "clearance_days": 1.8, "status": "OPERATIONAL"},
        {"id": "port-chennai",  "name": "Chennai Port",           "type": "port",          "lat": 13.09, "lon": 80.28, "state": "Tamil Nadu",     "congestion_pct": 52, "clearance_days": 2.1, "status": "OPERATIONAL"},
        {"id": "wh-hyd",        "name": "CWC Hyderabad",          "type": "warehouse",     "lat": 17.39, "lon": 78.49, "state": "Telangana",      "stock_days": 18, "capacity_pct": 72, "status": "LOW STOCK"},
        {"id": "wh-ahm",        "name": "CWC Ahmedabad",          "type": "warehouse",     "lat": 23.02, "lon": 72.57, "state": "Gujarat",        "stock_days": 24, "capacity_pct": 58, "status": "ADEQUATE"},
        {"id": "wh-baddi",      "name": "Baddi Pharma Hub",       "type": "warehouse",     "lat": 30.96, "lon": 76.79, "state": "Himachal Pradesh","stock_days": 12, "capacity_pct": 85, "status": "CRITICAL"},
        {"id": "fp-cipla",      "name": "Cipla Ltd, Goa",         "type": "formulation",   "lat": 15.30, "lon": 74.08, "state": "Goa",            "capacity_kbd": 42, "utilization_pct": 88, "status": "NEAR CAPACITY"},
        {"id": "fp-drreddy",    "name": "Dr Reddy's, Hyderabad",  "type": "formulation",   "lat": 17.44, "lon": 78.38, "state": "Telangana",      "capacity_kbd": 65, "utilization_pct": 76, "status": "OPERATIONAL"},
        {"id": "fp-sunpharma",  "name": "Sun Pharma, Halol",      "type": "formulation",   "lat": 22.50, "lon": 73.47, "state": "Gujarat",        "capacity_kbd": 58, "utilization_pct": 82, "status": "OPERATIONAL"},
        {"id": "fp-mankind",    "name": "Mankind Pharma, Baddi",  "type": "formulation",   "lat": 30.95, "lon": 76.80, "state": "Himachal Pradesh","capacity_kbd": 34, "utilization_pct": 91, "status": "STRAINED"},
        {"id": "dist-mumbai",   "name": "Mumbai Distribution",    "type": "distributor",   "lat": 19.07, "lon": 72.87, "state": "Maharashtra",    "coverage_states": 3, "daily_dispatch_tons": 24},
        {"id": "dist-delhi",    "name": "Delhi NCR Distribution",  "type": "distributor",   "lat": 28.61, "lon": 77.20, "state": "Delhi",          "coverage_states": 5, "daily_dispatch_tons": 38},
        {"id": "dist-chennai",  "name": "Chennai Distribution",    "type": "distributor",   "lat": 13.08, "lon": 80.27, "state": "Tamil Nadu",     "coverage_states": 4, "daily_dispatch_tons": 18},
        {"id": "hosp-aiims",    "name": "AIIMS New Delhi",        "type": "hospital",      "lat": 28.57, "lon": 77.21, "state": "Delhi",          "beds": 2478, "daily_consumption_kg": 8.2},
        {"id": "hosp-kem",      "name": "KEM Hospital Mumbai",    "type": "hospital",      "lat": 19.00, "lon": 72.84, "state": "Maharashtra",    "beds": 1800, "daily_consumption_kg": 5.4},
        {"id": "hosp-cmc",      "name": "CMC Vellore",            "type": "hospital",      "lat": 12.93, "lon": 79.13, "state": "Tamil Nadu",     "beds": 2200, "daily_consumption_kg": 6.1},
    ],
    "edges": [
        # Port → Warehouse
        {"from": "port-jnpt",    "to": "wh-hyd",       "mode": "rail",  "distance_km": 710, "transit_days": 2.5, "cost_per_ton_inr": 4200, "status": "ACTIVE"},
        {"from": "port-jnpt",    "to": "wh-ahm",       "mode": "road",  "distance_km": 524, "transit_days": 1.8, "cost_per_ton_inr": 3800, "status": "ACTIVE"},
        {"from": "port-mundra",  "to": "wh-ahm",       "mode": "rail",  "distance_km": 390, "transit_days": 1.2, "cost_per_ton_inr": 2900, "status": "ACTIVE"},
        {"from": "port-mundra",  "to": "wh-baddi",     "mode": "road",  "distance_km": 1120,"transit_days": 3.5, "cost_per_ton_inr": 7200, "status": "DELAYED"},
        {"from": "port-chennai", "to": "wh-hyd",       "mode": "road",  "distance_km": 630, "transit_days": 2.0, "cost_per_ton_inr": 3600, "status": "ACTIVE"},
        # Warehouse → Formulation
        {"from": "wh-hyd",       "to": "fp-drreddy",   "mode": "road",  "distance_km": 15,  "transit_days": 0.2, "cost_per_ton_inr": 800,  "status": "ACTIVE"},
        {"from": "wh-ahm",      "to": "fp-sunpharma",  "mode": "road",  "distance_km": 150, "transit_days": 0.5, "cost_per_ton_inr": 1200, "status": "ACTIVE"},
        {"from": "wh-ahm",      "to": "fp-cipla",      "mode": "rail",  "distance_km": 580, "transit_days": 2.0, "cost_per_ton_inr": 3400, "status": "ACTIVE"},
        {"from": "wh-baddi",    "to": "fp-mankind",     "mode": "road",  "distance_km": 5,   "transit_days": 0.1, "cost_per_ton_inr": 400,  "status": "ACTIVE"},
        # Formulation → Distributor
        {"from": "fp-drreddy",   "to": "dist-mumbai",  "mode": "air",   "distance_km": 710, "transit_days": 0.5, "cost_per_ton_inr": 18000,"status": "ACTIVE"},
        {"from": "fp-drreddy",   "to": "dist-chennai", "mode": "road",  "distance_km": 630, "transit_days": 1.8, "cost_per_ton_inr": 3200, "status": "ACTIVE"},
        {"from": "fp-sunpharma", "to": "dist-delhi",   "mode": "rail",  "distance_km": 950, "transit_days": 2.5, "cost_per_ton_inr": 4800, "status": "ACTIVE"},
        {"from": "fp-sunpharma", "to": "dist-mumbai",  "mode": "road",  "distance_km": 400, "transit_days": 1.2, "cost_per_ton_inr": 2600, "status": "ACTIVE"},
        {"from": "fp-cipla",     "to": "dist-mumbai",  "mode": "road",  "distance_km": 580, "transit_days": 1.5, "cost_per_ton_inr": 3000, "status": "ACTIVE"},
        {"from": "fp-mankind",   "to": "dist-delhi",   "mode": "road",  "distance_km": 310, "transit_days": 0.8, "cost_per_ton_inr": 2200, "status": "DELAYED"},
        # Distributor → Hospital
        {"from": "dist-delhi",   "to": "hosp-aiims",   "mode": "road",  "distance_km": 12,  "transit_days": 0.1, "cost_per_ton_inr": 500,  "status": "ACTIVE"},
        {"from": "dist-mumbai",  "to": "hosp-kem",     "mode": "road",  "distance_km": 8,   "transit_days": 0.1, "cost_per_ton_inr": 500,  "status": "ACTIVE"},
        {"from": "dist-chennai", "to": "hosp-cmc",     "mode": "road",  "distance_km": 135, "transit_days": 0.4, "cost_per_ton_inr": 1100, "status": "ACTIVE"},
    ],
}

# Pre-computed optimal + alternate paths
OPTIMAL_PATHS = [
    {
        "id": "path-primary",
        "label": "Primary Route (Fastest)",
        "chain": ["port-jnpt", "wh-ahm", "fp-sunpharma", "dist-delhi", "hosp-aiims"],
        "total_km": 1886,
        "total_days": 6.3,
        "total_cost_inr_per_ton": 13900,
        "risk": "HIGH",
        "status": "ACTIVE",
        "bottleneck": "JNPT congestion (87%)",
    },
    {
        "id": "path-alternate",
        "label": "Alternate (Lower Risk)",
        "chain": ["port-mundra", "wh-ahm", "fp-sunpharma", "dist-delhi", "hosp-aiims"],
        "total_km": 1690,
        "total_days": 5.0,
        "total_cost_inr_per_ton": 12500,
        "risk": "MEDIUM",
        "status": "RECOMMENDED",
        "bottleneck": None,
    },
    {
        "id": "path-south",
        "label": "South Corridor",
        "chain": ["port-chennai", "wh-hyd", "fp-drreddy", "dist-chennai", "hosp-cmc"],
        "total_km": 1408,
        "total_days": 4.5,
        "total_cost_inr_per_ton": 10000,
        "risk": "LOW",
        "status": "ACTIVE",
        "bottleneck": None,
    },
]


@router.get("/chain/{api_name}")
async def get_supply_chain(api_name: str):
    """Full domestic supply chain for a given API."""
    return PARACETAMOL_CHAIN


@router.get("/paths")
async def get_optimal_paths(api_name: str = Query("paracetamol", description="API to route")):
    """Pre-computed optimal + alternate paths."""
    return {"paths": OPTIMAL_PATHS}


@router.get("/bottlenecks")
async def get_bottlenecks():
    """Current bottleneck summary across domestic chain."""
    return {
        "bottlenecks": [
            {"node": "port-jnpt",   "name": "JNPT Mumbai",          "type": "port",       "severity": "HIGH",     "issue": "87% congestion, customs backlog 3.2 days", "impact_apis": 14},
            {"node": "wh-baddi",    "name": "Baddi Pharma Hub",      "type": "warehouse",  "severity": "CRITICAL", "issue": "12-day stock cover only, replenishment delayed", "impact_apis": 8},
            {"node": "fp-mankind",  "name": "Mankind Pharma, Baddi", "type": "formulation","severity": "HIGH",     "issue": "91% utilization, no surge capacity", "impact_apis": 5},
            {"node": "dist-delhi",  "name": "Delhi NCR Distribution","type": "distributor","severity": "MEDIUM",   "issue": "Diesel cost +21%, cold chain stress", "impact_apis": 12},
        ],
        "total_bottlenecks": 4,
        "critical_count": 1,
    }
