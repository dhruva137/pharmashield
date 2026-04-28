import logging
from datetime import datetime
from typing import List, Dict, Any

from ..deps import get_gemini_flash_client

logger = logging.getLogger("pharmashield.hormuz")

CRISIS_START_DATE = datetime(2026, 2, 28)

# The APIs most exposed to Hormuz/China supply routes, with realistic data
AFFECTED_APIS = [
    {"id": "api_paracetamol",        "name": "Paracetamol (API)",      "category": "Analgesic",         "china_share": 0.92, "route": "China → Strait of Hormuz → JNPT"},
    {"id": "api_ibuprofen",          "name": "Ibuprofen (API)",         "category": "NSAID",             "china_share": 0.87, "route": "China → Strait of Hormuz → Mundra"},
    {"id": "api_amoxicillin",        "name": "Amoxicillin (API)",       "category": "Antibiotic",        "china_share": 0.84, "route": "China → Strait of Hormuz → JNPT"},
    {"id": "api_metformin",          "name": "Metformin (API)",         "category": "Antidiabetic",      "china_share": 0.82, "route": "China → Strait of Hormuz → Kandla"},
    {"id": "api_atorvastatin",       "name": "Atorvastatin (API)",      "category": "Cardiovascular",    "china_share": 0.79, "route": "China → Red Sea → JNPT"},
    {"id": "api_azithromycin",       "name": "Azithromycin (API)",      "category": "Antibiotic",        "china_share": 0.76, "route": "China → Strait of Hormuz → Mundra"},
    {"id": "api_omeprazole",         "name": "Omeprazole (API)",        "category": "GI",                "china_share": 0.74, "route": "China → Strait of Hormuz → JNPT"},
    {"id": "api_ciprofloxacin",      "name": "Ciprofloxacin (API)",     "category": "Antibiotic",        "china_share": 0.71, "route": "China → Red Sea → JNPT"},
    {"id": "api_vitamin_c",          "name": "Ascorbic Acid (Vit C)",   "category": "Vitamin",           "china_share": 0.95, "route": "China → Strait of Hormuz → JNPT"},
    {"id": "api_pantoprazole",       "name": "Pantoprazole (API)",      "category": "GI",                "china_share": 0.68, "route": "China → Strait of Hormuz → Mundra"},
]


class HormuzService:
    def __init__(self, data_loader=None):
        self.data_loader = data_loader
        self.gemini = get_gemini_flash_client()

    def get_status(self) -> Dict[str, Any]:
        """Returns the current status of the Hormuz crisis."""
        now = datetime.now()
        days_elapsed = (now - CRISIS_START_DATE).days
        return {
            "status": "RESTRICTED",
            "severity": "CRITICAL",
            "days_since_closure": days_elapsed,
            "start_date": CRISIS_START_DATE.isoformat(),
            "headline": "IRGC blockade persists; air cargo rates peak at +350%",
            "vessels_diverted": 142,
            "risk_level": 0.94,
        }

    def get_impact_metrics(self) -> Dict[str, Any]:
        """India-specific impact metrics."""
        return {
            "oil_supply_affected": "40%",
            "export_exposure": "84%",
            "air_cargo_rate_increase": "350%",
            "pharma_export_delay": "12-18 days",
            "food_insecurity_risk": "9.1M additional people",
            "shipping_insurance_premium": "+400%",
        }

    def get_affected_apis(self) -> List[Dict[str, Any]]:
        """Return APIs exposed to Hormuz/China supply routes with shortage projections."""
        result = []
        for api in AFFECTED_APIS:
            china_share = api["china_share"]
            result.append({
                "id": api["id"],
                "name": api["name"],
                "category": api["category"],
                "import_dependency": china_share,
                "route": api["route"],
                "stock_status": "CRITICAL" if china_share > 0.80 else "ELEVATED" if china_share > 0.70 else "STABLE",
                "days_to_shortage": 25 if china_share > 0.85 else 45 if china_share > 0.75 else 90,
            })
        return sorted(result, key=lambda x: x["import_dependency"], reverse=True)

    def predict_shortage(self, days_closed: int = 90) -> str:
        """Gemini-powered shortage prediction — synchronous."""
        api_list = ", ".join([a["name"] for a in AFFECTED_APIS[:5]])

        prompt = f"""ACT AS: Senior Supply Chain Intelligence Analyst for the Government of India.

CONTEXT: The Strait of Hormuz has been largely blocked since Feb 28, 2026.
Current disruption duration: {days_closed} days.
CRITICAL APIS AT RISK: {api_list}
India imports ~84% of API precursors via this corridor.

TASK: Write a 90-day predictive impact analysis on Indian pharmaceutical availability.

Structure your response in 4 parts:
1. IMMEDIATE IMPACT (30 days): Current shortage projections
2. LONG-TERM OUTLOOK (90 days): Escalation risk if strait stays closed
3. CORPORATE EXPOSURE: Sun Pharma and Dr. Reddy's specific risk
4. BENGALURU ACTION PLAN: 3 specific steps for local pharmacies

STYLE: Concise, intelligence-grade. Use bullet points. Under 350 words. Start directly with the analysis."""

        return self.gemini.generate_text(
            prompt=prompt,
            system_instruction="You are a senior pharmaceutical supply chain analyst. Be specific, data-driven, and urgent.",
            temperature=0.3,
            max_output_tokens=800,
            fallback="Prediction service temporarily unavailable. Fallback assessment: Expect 40% stockout probability for critical APIs within 45 days if Strait remains closed.",
            cache_namespace="hormuz_predict",
        )

    def get_timeline(self) -> List[Dict[str, Any]]:
        """Key events in the Hormuz crisis, reverse-chronological for display."""
        return [
            {"date": "2026-04-25", "event": "Pharma Alert", "desc": "ShockMap detects critical upstream API shortages in 4 China manufacturing provinces due to logistics gridlock."},
            {"date": "2026-04-10", "event": "UN Warning",   "desc": "UN warns of acute food insecurity for 9.1M people in Asia due to fertilizer/grain route closure."},
            {"date": "2026-03-12", "event": "Air Cargo Spike", "desc": "Dubai-Mumbai air cargo rates jump 350% as sea routes are abandoned; diversion to Cape of Good Hope adds 14 days."},
            {"date": "2026-03-05", "event": "US/Israel Strikes", "desc": "US Navy conducts freedom of navigation operation; retaliatory IRGC strikes on 2 commercial vessels."},
            {"date": "2026-02-28", "event": "Initial Blockade", "desc": "IRGC forces seize 3 commercial tankers; Strait of Hormuz declared restricted zone. Crisis begins."},
        ]
