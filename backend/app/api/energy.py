"""
Energy Intelligence API — Hormuz Crisis Oil & Fuel Impact
Covers crude oil, LNG, fuel prices, refinery risk, and India energy security.
All data is rich mock data calibrated to Feb–Apr 2026 Hormuz crisis reality.
"""
from fastapi import APIRouter, Query
from typing import List, Dict, Any
from datetime import datetime, timedelta
import random, math

router = APIRouter(prefix="/api/v1/energy", tags=["Energy Intelligence"])

# ── Deterministic "live" price simulation ──────────────────────────────────
_BASE_TS = datetime(2026, 2, 28)   # Day 0 = Hormuz closure

def _day(n: int) -> str:
    return (_BASE_TS + timedelta(days=n)).strftime("%Y-%m-%d")

def _price_series(base: float, volatility: float, trend: float, days: int = 60):
    """Generate a deterministic price series with trend + noise."""
    series = []
    price = base
    for i in range(days):
        drift = trend + volatility * math.sin(i * 0.7 + 1.3)
        price = round(price + drift + random.uniform(-volatility * 0.3, volatility * 0.3), 2)
        price = max(base * 0.8, min(base * 1.6, price))
        series.append({"date": _day(i), "value": price})
    return series

random.seed(42)  # Deterministic for demo


# ── 1. Energy Status ────────────────────────────────────────────────────────
@router.get("/status")
async def get_energy_status():
    return {
        "crisis": "HORMUZ BLOCKADE",
        "status": "ACTIVE",
        "severity": "CRITICAL",
        "days_active": 59,
        "brent_crude_usd": 118.4,
        "brent_change_pct": "+34.2%",
        "wti_crude_usd": 112.8,
        "india_import_pct_via_hormuz": 85,
        "strategic_reserve_days": 87,
        "strategic_reserve_status": "DEPLETING",
        "lng_price_usd_mmbtu": 22.6,
        "lng_change_pct": "+280%",
        "tankers_diverted": 142,
        "tankers_blocked": 31,
        "petrol_price_india_litre": 127.4,
        "diesel_price_india_litre": 114.8,
        "petrol_change_since_crisis": "+18.2%",
        "diesel_change_since_crisis": "+21.6%",
    }


# ── 2. Crude Oil Price History (Brent + WTI) ────────────────────────────────
@router.get("/prices/crude")
async def get_crude_prices():
    random.seed(42)
    brent = _price_series(base=88.0, volatility=1.2, trend=0.52, days=60)
    wti   = _price_series(base=83.5, volatility=1.1, trend=0.48, days=60)
    return {
        "brent": brent,
        "wti": wti,
        "current_brent": 118.4,
        "current_wti": 112.8,
        "pre_crisis_brent": 88.0,
        "pre_crisis_wti": 83.5,
        "peak_brent": 123.7,
        "peak_date": "2026-03-18",
    }


# ── 3. India Fuel Prices History ────────────────────────────────────────────
@router.get("/prices/fuel-india")
async def get_india_fuel_prices():
    random.seed(99)
    petrol = _price_series(base=107.8, volatility=0.45, trend=0.34, days=60)
    diesel = _price_series(base=94.6,  volatility=0.4,  trend=0.38, days=60)
    return {
        "petrol_inr_litre": petrol,
        "diesel_inr_litre": diesel,
        "current_petrol": 127.4,
        "current_diesel": 114.8,
        "pre_crisis_petrol": 107.8,
        "pre_crisis_diesel": 94.6,
    }


# ── 4. LNG Price History ────────────────────────────────────────────────────
@router.get("/prices/lng")
async def get_lng_prices():
    random.seed(77)
    lng = _price_series(base=6.0, volatility=0.5, trend=0.28, days=60)
    return {
        "lng_usd_mmbtu": lng,
        "current": 22.6,
        "pre_crisis": 6.0,
        "change_pct": "+280%",
        "india_lng_import_disruption_pct": 62,
    }


# ── 5. Strategic Reserve Status ─────────────────────────────────────────────
@router.get("/reserves")
async def get_strategic_reserves():
    return {
        "total_capacity_mb": 39.1,
        "current_fill_mb": 33.7,
        "fill_pct": 86.2,
        "depletion_rate_mb_per_day": 0.87,
        "days_remaining": 87,
        "sites": [
            {"name": "Visakhapatnam SPR",   "location": [17.69, 83.28], "capacity_mb": 9.75,  "fill_pct": 88, "status": "OPERATIONAL"},
            {"name": "Mangaluru SPR",        "location": [12.87, 74.88], "capacity_mb": 11.33, "fill_pct": 85, "status": "OPERATIONAL"},
            {"name": "Padur SPR",            "location": [13.14, 74.76], "capacity_mb": 18.02, "fill_pct": 85, "status": "DRAWDOWN"},
            {"name": "Bikaner (Proposed)",   "location": [28.01, 73.31], "capacity_mb": 6.0,   "fill_pct": 0,  "status": "UNDER CONSTRUCTION"},
        ],
        "daily_consumption_india_mb": 5.1,
        "supply_coverage_pct": 15,
    }


# ── 6. Oil Tanker Routes ────────────────────────────────────────────────────
@router.get("/tanker-routes")
async def get_tanker_routes():
    return {
        "routes": [
            {
                "id": "saudi-jnpt",
                "from": "Ras Tanura, Saudi Arabia",
                "to": "JNPT, Mumbai",
                "from_coords": [26.64, 50.16],
                "to_coords": [18.95, 72.85],
                "status": "BLOCKED",
                "via": "Hormuz → Arabian Sea",
                "volume_kbd": 842,
                "diversion": "Cape of Good Hope (+18 days)",
                "risk": "CRITICAL",
            },
            {
                "id": "uae-mundra",
                "from": "Jebel Ali, UAE",
                "to": "Mundra Port",
                "from_coords": [25.01, 55.06],
                "to_coords": [22.84, 69.72],
                "status": "BLOCKED",
                "via": "Hormuz → Arabian Sea",
                "volume_kbd": 412,
                "diversion": "Cape of Good Hope (+18 days)",
                "risk": "CRITICAL",
            },
            {
                "id": "iran-chennai",
                "from": "Kharg Island, Iran",
                "to": "Chennai Port",
                "from_coords": [29.23, 50.32],
                "to_coords": [13.09, 80.28],
                "status": "SUSPENDED",
                "via": "Hormuz → Indian Ocean",
                "volume_kbd": 187,
                "diversion": "None — sanctions",
                "risk": "CRITICAL",
            },
            {
                "id": "kuwait-vizag",
                "from": "Al-Ahmadi, Kuwait",
                "to": "Visakhapatnam",
                "from_coords": [29.07, 48.09],
                "to_coords": [17.69, 83.28],
                "status": "DIVERTED",
                "via": "Hormuz (disrupted) → Cape",
                "volume_kbd": 178,
                "diversion": "Cape of Good Hope (+18 days)",
                "risk": "HIGH",
            },
            {
                "id": "russia-vizag",
                "from": "Primorsk, Russia",
                "to": "Visakhapatnam",
                "from_coords": [60.36, 28.61],
                "to_coords": [17.69, 83.28],
                "status": "ACTIVE",
                "via": "Suez → Indian Ocean",
                "volume_kbd": 312,
                "diversion": "Suez Canal (partial)",
                "risk": "MEDIUM",
            },
            {
                "id": "us-mundra",
                "from": "Houston, USA",
                "to": "Mundra Port",
                "from_coords": [29.76, -95.37],
                "to_coords": [22.84, 69.72],
                "status": "ACTIVE",
                "via": "Atlantic → Cape of Good Hope",
                "volume_kbd": 94,
                "diversion": "Standard route",
                "risk": "LOW",
            },
        ],
        "total_diverted_kbd": 1432,
        "total_blocked_kbd": 1441,
        "india_import_shortfall_pct": 48,
    }


# ── 7. Affected Indian Refineries ──────────────────────────────────────────
@router.get("/refineries")
async def get_refineries():
    return [
        {
            "id": "jamnagar-1",
            "name": "Reliance Jamnagar (SEZ)",
            "company": "Reliance Industries",
            "capacity_kbd": 580,
            "location": [22.47, 70.06],
            "feedstock_via_hormuz_pct": 82,
            "current_utilization_pct": 64,
            "pre_crisis_utilization_pct": 95,
            "status": "REDUCED OUTPUT",
            "shortfall_kbd": 180,
            "risk": "CRITICAL",
        },
        {
            "id": "jamnagar-2",
            "name": "Reliance Jamnagar (DTA)",
            "company": "Reliance Industries",
            "capacity_kbd": 340,
            "location": [22.47, 70.06],
            "feedstock_via_hormuz_pct": 79,
            "current_utilization_pct": 68,
            "pre_crisis_utilization_pct": 93,
            "status": "REDUCED OUTPUT",
            "shortfall_kbd": 85,
            "risk": "CRITICAL",
        },
        {
            "id": "kochi",
            "name": "Kochi Refinery (BPCL)",
            "company": "BPCL",
            "capacity_kbd": 310,
            "location": [9.94, 76.26],
            "feedstock_via_hormuz_pct": 91,
            "current_utilization_pct": 55,
            "pre_crisis_utilization_pct": 96,
            "status": "CRITICAL SHORTAGE",
            "shortfall_kbd": 127,
            "risk": "CRITICAL",
        },
        {
            "id": "vizag",
            "name": "Visakha Refinery (HPCL)",
            "company": "HPCL",
            "capacity_kbd": 166,
            "location": [17.69, 83.28],
            "feedstock_via_hormuz_pct": 54,
            "current_utilization_pct": 78,
            "pre_crisis_utilization_pct": 91,
            "status": "PARTIAL SHORTAGE",
            "shortfall_kbd": 22,
            "risk": "HIGH",
        },
        {
            "id": "mangalore",
            "name": "MRPL Mangaluru",
            "company": "ONGC",
            "capacity_kbd": 300,
            "location": [12.87, 74.88],
            "feedstock_via_hormuz_pct": 88,
            "current_utilization_pct": 57,
            "pre_crisis_utilization_pct": 94,
            "status": "CRITICAL SHORTAGE",
            "shortfall_kbd": 111,
            "risk": "CRITICAL",
        },
    ]


# ── 8. Energy Stocks ─────────────────────────────────────────────────────────
@router.get("/stocks")
async def get_energy_stocks():
    random.seed(55)
    def s(base, trend, vol, days=60):
        return _price_series(base, vol, trend, days)

    return [
        {
            "ticker": "ONGC.NS",
            "name": "Oil & Natural Gas Corp",
            "price": 224.8,
            "change_pct": -12.4,
            "change_1m_pct": -18.7,
            "sector": "Upstream Oil",
            "market_cap_cr": 283400,
            "hormuz_exposure_pct": 72,
            "risk": "HIGH",
            "history": s(258, -0.56, 2.1),
            "analyst_note": "Upstream production shielded but downstream margins crushed by crude spike.",
        },
        {
            "ticker": "BPCL.NS",
            "name": "Bharat Petroleum Corp",
            "price": 298.3,
            "change_pct": -21.6,
            "change_1m_pct": -31.2,
            "sector": "Refining & Marketing",
            "market_cap_cr": 128700,
            "hormuz_exposure_pct": 91,
            "risk": "CRITICAL",
            "history": s(381, -0.82, 3.2),
            "analyst_note": "Kochi refinery at 55% utilization. Feedstock shortfall of 127kbd. Under-recovery risk.",
        },
        {
            "ticker": "IOC.NS",
            "name": "Indian Oil Corporation",
            "price": 142.6,
            "change_pct": -17.3,
            "change_1m_pct": -24.8,
            "sector": "Refining & Marketing",
            "market_cap_cr": 201500,
            "hormuz_exposure_pct": 68,
            "risk": "HIGH",
            "history": s(172, -0.5, 2.4),
            "analyst_note": "Diversified feedstock helps. Strategic reserve drawdown partially compensating.",
        },
        {
            "ticker": "RELIANCE.NS",
            "name": "Reliance Industries",
            "price": 2847.5,
            "change_pct": -9.8,
            "change_1m_pct": -14.2,
            "sector": "Integrated Energy + Retail",
            "market_cap_cr": 1928000,
            "hormuz_exposure_pct": 80,
            "risk": "HIGH",
            "history": s(3152, -0.51, 18.4),
            "analyst_note": "Jamnagar complex at 64–68% capacity. Retail fuel margins compressed.",
        },
        {
            "ticker": "HPCL.NS",
            "name": "Hindustan Petroleum Corp",
            "price": 338.9,
            "change_pct": -14.5,
            "change_1m_pct": -22.1,
            "sector": "Refining & Marketing",
            "market_cap_cr": 48200,
            "hormuz_exposure_pct": 54,
            "risk": "MEDIUM",
            "history": s(396, -0.48, 2.8),
            "analyst_note": "Vizag refinery relatively insulated. Cape-routed Russian crude filling gap.",
        },
        {
            "ticker": "GAIL.NS",
            "name": "GAIL India Ltd",
            "price": 178.4,
            "change_pct": -6.2,
            "change_1m_pct": -9.4,
            "sector": "Gas Distribution",
            "market_cap_cr": 117800,
            "hormuz_exposure_pct": 62,
            "risk": "HIGH",
            "history": s(190, -0.19, 1.3),
            "analyst_note": "LNG import disruption forces spot market purchases at +280% premium.",
        },
    ]


# ── 9. Macro Economic Impact ─────────────────────────────────────────────────
@router.get("/macro-impact")
async def get_macro_impact():
    return {
        "gdp_impact_pct": -1.8,
        "inflation_add_pct": 2.4,
        "current_account_deficit_bn_usd_annualised": 38.4,
        "forex_reserve_burn_rate_bn_usd_month": 6.2,
        "rupee_vs_usd": 87.4,
        "rupee_pre_crisis": 83.1,
        "rupee_change_pct": -5.2,
        "power_tariff_increase_pct": 12.6,
        "fertiliser_cost_increase_pct": 28.4,
        "food_inflation_add_pct": 3.1,
        "sectors_affected": [
            {"name": "Refining", "impact": "CRITICAL", "gdp_contribution_pct": 4.2},
            {"name": "Aviation", "impact": "CRITICAL", "gdp_contribution_pct": 1.8},
            {"name": "Transport", "impact": "HIGH", "gdp_contribution_pct": 6.1},
            {"name": "Agriculture", "impact": "HIGH", "gdp_contribution_pct": 18.4},
            {"name": "Pharmaceuticals", "impact": "HIGH", "gdp_contribution_pct": 3.6},
            {"name": "Power", "impact": "HIGH", "gdp_contribution_pct": 5.2},
            {"name": "Manufacturing", "impact": "MEDIUM", "gdp_contribution_pct": 16.7},
        ],
        "aviation_turbine_fuel_change_pct": 48.2,
        "air_ticket_avg_increase_pct": 34.8,
        "freight_cost_increase_pct": 62.4,
    }


# ── 10. Timeline (Energy-specific events) ───────────────────────────────────
@router.get("/timeline")
async def get_energy_timeline():
    return [
        {"date": "Feb 28, 2026", "event": "BLOCKADE BEGINS",      "desc": "IRGC mines and patrol boats establish maritime cordon at Hormuz. Brent crude spikes $18 in 6 hours to $106."},
        {"date": "Mar 4, 2026",  "event": "INDIA OIL ALERT",      "desc": "MoPNG activates oil emergency protocol. Strategic Petroleum Reserve drawdown authorised. ₹12/L petrol hike."},
        {"date": "Mar 8, 2026",  "event": "BPCL KOCHI CRUNCH",    "desc": "Kochi refinery crude inventory drops below 12-day cover. Emergency shipping contracts at 6× normal rates."},
        {"date": "Mar 14, 2026", "event": "CAPE ROUTE ACTIVATED", "desc": "142 tankers officially diverted via Cape of Good Hope. Transit time India +18 days. LNG hits $22/MMBtu."},
        {"date": "Mar 22, 2026", "event": "RUPEE PRESSURE",       "desc": "INR hits 87.4/USD as import bill surges. RBI intervenes with $3.8B forex sale. Bond yields rise 45bps."},
        {"date": "Apr 2, 2026",  "event": "RUSSIA LIFELINE",      "desc": "India fast-tracks Russian Urals crude purchase at $72/bbl discount. 312kbd flowing via Suez route."},
        {"date": "Apr 18, 2026", "event": "REFINERY CRISIS",      "desc": "Reliance Jamnagar cuts throughput to 64% capacity. Domestic fuel shortages reported in 6 states."},
        {"date": "Apr 28, 2026", "event": "DAY 59 ONGOING",       "desc": "Blockade continues. Strategic reserve at 87 days. Govt evaluating ration card fuel system."},
    ]
