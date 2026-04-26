"""
Engine 1 — Signal Intelligence Service

Zero-shot LLM-driven Named Entity Recognition on news streams.
Extracts structured supply chain shock signals from raw GDELT + news text.

Implements: Tandfonline 2025 — "Zero-shot LLM-driven framework for automated
extraction of supply chain information from publicly available sources."
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .gemini_flash_client import GeminiFlashClient

logger = logging.getLogger("shockmap.signal_intelligence")

# ─── Shock Taxonomy ──────────────────────────────────────────────────────────
SHOCK_TAXONOMY = {
    "export_ban":       {"severity_multiplier": 2.0, "duration_days": 90,  "label": "Export Ban / Embargo"},
    "factory_shutdown": {"severity_multiplier": 1.7, "duration_days": 30,  "label": "Factory Shutdown"},
    "env_compliance":   {"severity_multiplier": 1.3, "duration_days": 14,  "label": "Environmental Compliance"},
    "logistics_block":  {"severity_multiplier": 1.2, "duration_days": 7,   "label": "Logistics Disruption"},
    "price_spike":      {"severity_multiplier": 1.1, "duration_days": 21,  "label": "Price Spike"},
}

# ─── CAMEO Code Mapping ─────────────────────────────────────────────────────
CAMEO_MAP = {
    "173": "export_ban",         # Impose embargo / boycott
    "163": "export_ban",         # Impose restrictions
    "201": "factory_shutdown",   # Mass expulsion / evacuation
    "1431": "logistics_block",   # Demonstrate or rally
    "0231": "price_spike",       # Appeal for economic aid
    "172": "export_ban",         # Impose economic sanctions
    "162": "factory_shutdown",   # Reduce or stop economic aid
}

# ─── Gemini NER Extraction Prompt ────────────────────────────────────────────
EXTRACTION_PROMPT = """
You are a supply chain intelligence analyst. Extract structured information
from this news text about potential supply chain disruptions.

Return ONLY valid JSON with these fields:
{{
  "shock_type": "export_ban" | "factory_shutdown" | "env_compliance" | "logistics_block" | "price_spike",
  "source_entity": {{
    "name": "<province or company name>",
    "type": "province" | "country" | "company",
    "location": "<full location string>"
  }},
  "affected_materials": [
    {{
      "name": "<material or API name>",
      "sector": "pharma" | "rare_earth" | "semiconductor"
    }}
  ],
  "severity": <float 0-1, where 1 = complete shutdown>,
  "estimated_duration_days": <integer>,
  "confidence": <float 0-1>,
  "downstream_affected": ["<what does this material feed into>"],
  "key_facts": "<1-2 sentence summary of the core event>"
}}

If you cannot determine a field, use reasonable defaults.
If the text is not about supply chain disruptions, set confidence to 0.0.

Text: {news_text}
"""

EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "shock_type": {"type": "string"},
        "source_entity": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "type": {"type": "string"},
                "location": {"type": "string"},
            },
        },
        "affected_materials": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "sector": {"type": "string"},
                },
            },
        },
        "severity": {"type": "number"},
        "estimated_duration_days": {"type": "integer"},
        "confidence": {"type": "number"},
        "downstream_affected": {"type": "array", "items": {"type": "string"}},
        "key_facts": {"type": "string"},
    },
    "required": [
        "shock_type",
        "source_entity",
        "affected_materials",
        "severity",
        "estimated_duration_days",
        "confidence",
        "downstream_affected",
        "key_facts",
    ],
}


class SignalIntelligence:
    """
    Engine 1: Extracts structured shock signals from raw news/GDELT events.
    Uses Gemini for zero-shot NER when available, falls back to keyword-based
    extraction otherwise.
    """

    def __init__(
        self,
        genai: Any = None,
        model_name: str = "gemini-2.0-flash",
        gemini_client: Optional[GeminiFlashClient] = None,
    ):
        from ..config import settings
        self.genai = genai
        self.model_name = settings.GEMINI_FLASH_MODEL or model_name
        self.gemini_client = gemini_client or GeminiFlashClient(
            genai=genai,
            model_name=self.model_name,
            cache_ttl_seconds=3600,
        )

    # ─── Core NER Extraction ────────────────────────────────────────────

    def extract_signal(self, news_text: str) -> Optional[Dict[str, Any]]:
        """
        Extracts a structured shock signal from raw news text.
        Uses Gemini NER if available, otherwise falls back to keyword extraction.
        """
        if self.gemini_client.is_available():
            return self._extract_with_gemini(news_text)
        return self._extract_with_keywords(news_text)

    def _extract_with_gemini(self, news_text: str) -> Optional[Dict[str, Any]]:
        """Zero-shot LLM NER extraction using Gemini."""
        fallback_signal = self._extract_with_keywords(news_text)
        if fallback_signal is None:
            fallback_signal = {
                "shock_type": "logistics_block",
                "source_entity": {"name": "Unknown", "type": "unknown", "location": "Unknown"},
                "affected_materials": [{"name": "unspecified", "sector": self._extract_sector(news_text.lower())}],
                "severity": self._estimate_severity(news_text.lower()),
                "estimated_duration_days": 7,
                "confidence": 0.0,
                "downstream_affected": [],
                "key_facts": news_text[:200],
                "extraction_method": "keyword_fallback",
                "extracted_at": datetime.now(timezone.utc).isoformat(),
                "raw_text": news_text[:500],
            }

        try:
            prompt = EXTRACTION_PROMPT.format(news_text=news_text[:2000])
            data = self.gemini_client.generate_json(
                prompt=prompt,
                response_schema=EXTRACTION_SCHEMA,
                temperature=0.1,
                max_output_tokens=900,
                min_confidence=0.25,
                fallback=fallback_signal,
                cache_namespace="engine1_ner",
            )

            if not isinstance(data, dict):
                return fallback_signal

            # Normalize and enrich
            data["confidence"] = max(0.0, min(1.0, float(data.get("confidence", 0.0))))
            data["severity"] = max(0.0, min(1.0, float(data.get("severity", 0.0))))
            if data["confidence"] < 0.2:
                return fallback_signal

            data["shock_type"] = data.get("shock_type") or fallback_signal["shock_type"]
            source_entity = data.get("source_entity") or {}
            if not source_entity.get("name"):
                data["source_entity"] = fallback_signal["source_entity"]
            materials = data.get("affected_materials")
            if not isinstance(materials, list) or not materials:
                data["affected_materials"] = fallback_signal["affected_materials"]
            if not data.get("key_facts"):
                data["key_facts"] = fallback_signal["key_facts"]

            data["extraction_method"] = "gemini_flash_ner"
            data["extracted_at"] = datetime.now(timezone.utc).isoformat()
            data["raw_text"] = news_text[:500]

            return data

        except Exception as e:
            logger.warning(f"Gemini NER extraction failed: {e}")
            return fallback_signal

    def _extract_with_keywords(self, text: str) -> Optional[Dict[str, Any]]:
        """Fallback keyword-based extraction when Gemini is unavailable."""
        text_lower = text.lower()

        # Detect shock type
        shock_type = self._classify_shock_type(text_lower)

        # Extract province
        province = self._extract_province(text)

        # Extract sector
        sector = self._extract_sector(text_lower)

        # Estimate severity
        severity = self._estimate_severity(text_lower)

        if not province and severity < 0.3:
            return None

        taxonomy = SHOCK_TAXONOMY.get(shock_type, SHOCK_TAXONOMY["logistics_block"])

        return {
            "shock_type": shock_type,
            "source_entity": {
                "name": province or "Unknown",
                "type": "province" if province else "unknown",
                "location": f"{province}, China" if province else "China",
            },
            "affected_materials": [{"name": "unspecified", "sector": sector}],
            "severity": severity,
            "estimated_duration_days": taxonomy["duration_days"],
            "confidence": 0.5 if province else 0.3,
            "downstream_affected": [],
            "key_facts": text[:200],
            "extraction_method": "keyword_fallback",
            "extracted_at": datetime.now(timezone.utc).isoformat(),
            "raw_text": text[:500],
        }

    # ─── GDELT Event Processing ─────────────────────────────────────────

    def process_gdelt_event(self, gdelt_event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Processes a raw GDELT event into a structured signal.
        Uses CAMEO codes + GoldsteinScale for fast triage, then
        enriches with Gemini NER if warranted.
        """
        # Fast triage from GDELT structured fields
        signal = {
            "location": gdelt_event.get("Actor1Geo_FullName", ""),
            "severity": self._goldstein_to_severity(
                gdelt_event.get("GoldsteinScale", 0)
            ),
            "volume": gdelt_event.get("NumSources", 1),
            "tone": gdelt_event.get("AvgTone", 0),
            "event_type": CAMEO_MAP.get(
                str(gdelt_event.get("EventCode", "")),
                "logistics_block"
            ),
            "gdelt_url": gdelt_event.get("SOURCEURL", ""),
        }

        # If event looks significant (negative tone, multiple sources), do NER
        title = gdelt_event.get("title", gdelt_event.get("SOURCEURL", ""))
        if signal["volume"] >= 3 or signal["severity"] > 0.5:
            ner_result = self.extract_signal(title)
            if ner_result:
                signal["ner_extraction"] = ner_result
                signal["shock_type"] = ner_result.get("shock_type", signal["event_type"])
                signal["severity"] = max(
                    signal["severity"],
                    ner_result.get("severity", 0)
                )

        return signal

    # ─── Batch Processing ────────────────────────────────────────────────

    def process_batch(self, articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Process a batch of news articles/GDELT events and return
        de-duplicated, scored signals sorted by severity.
        """
        signals = []
        seen_titles = set()

        for article in articles:
            title = article.get("title", "")
            if not title or title in seen_titles:
                continue
            seen_titles.add(title)

            signal = self.extract_signal(title)
            if signal and signal.get("confidence", 0) >= 0.3:
                signal["source_title"] = title
                signal["source_url"] = article.get("url", article.get("SOURCEURL", ""))
                signals.append(signal)

        # Sort by severity descending
        signals.sort(key=lambda s: s.get("severity", 0), reverse=True)
        return signals

    # ─── Entity-to-Graph Mapping ─────────────────────────────────────────

    def map_to_graph_nodes(
        self, signal: Dict[str, Any], graph_service: Any
    ) -> Dict[str, Any]:
        """
        Maps extracted NER entities to existing nodes in the supply chain graph.
        Returns enriched signal with graph node IDs.
        """
        mapped = {
            "province_nodes": [],
            "material_nodes": [],
            "affected_drug_nodes": [],
        }

        # Map province
        source = signal.get("source_entity", {})
        if source.get("type") == "province":
            province_name = source.get("name", "")
            node = graph_service.get_node(province_name)
            if node:
                mapped["province_nodes"].append(province_name)
                # Find all drugs dependent on this province
                affected = graph_service.get_drugs_dependent_on_province(province_name)
                mapped["affected_drug_nodes"] = affected

        # Map materials to API nodes
        for material in signal.get("affected_materials", []):
            mat_name = material.get("name", "").lower()
            # Fuzzy match against graph API nodes
            for api_node in graph_service.nodes_by_type("api"):
                if api_node and mat_name in api_node["name"].lower():
                    mapped["material_nodes"].append(api_node["id"])

        signal["graph_mapping"] = mapped
        return signal

    # ─── Helper Methods ──────────────────────────────────────────────────

    @staticmethod
    def _classify_shock_type(text_lower: str) -> str:
        """Classifies shock type from text keywords."""
        if any(w in text_lower for w in ["ban", "embargo", "sanction", "restrict", "export control"]):
            return "export_ban"
        if any(w in text_lower for w in ["shutdown", "closure", "halt", "shut down", "closed"]):
            return "factory_shutdown"
        if any(w in text_lower for w in ["environment", "epb", "compliance", "pollution", "emission"]):
            return "env_compliance"
        if any(w in text_lower for w in ["logistics", "shipping", "port", "transport", "freight"]):
            return "logistics_block"
        if any(w in text_lower for w in ["price", "cost", "surge", "spike", "expensive"]):
            return "price_spike"
        return "logistics_block"

    @staticmethod
    def _extract_province(text: str) -> Optional[str]:
        """Extracts Chinese province name from text."""
        provinces = [
            "Hebei", "Jiangsu", "Zhejiang", "Shandong", "Hubei",
            "Guangdong", "Sichuan", "Fujian", "Inner Mongolia",
            "Jiangxi", "Hunan", "Liaoning", "Anhui", "Henan",
        ]
        for p in provinces:
            if p.lower() in text.lower():
                return p
        return None

    @staticmethod
    def _extract_sector(text_lower: str) -> str:
        """Determines which sector the event affects."""
        rare_earth_terms = [
            "rare earth", "neodymium", "dysprosium", "terbium", "lithium",
            "cobalt", "praseodymium", "yttrium", "lanthanum", "cerium",
            "magnet", "ndfeb",
        ]
        if any(t in text_lower for t in rare_earth_terms):
            return "rare_earth"
        return "pharma"

    @staticmethod
    def _estimate_severity(text_lower: str) -> float:
        """Estimates shock severity from 0 to 1 based on language intensity."""
        if any(w in text_lower for w in ["ban", "complete halt", "embargo", "zero tolerance"]):
            return 0.95
        if any(w in text_lower for w in ["shutdown", "closure", "halt", "freeze", "suspend"]):
            return 0.75
        if any(w in text_lower for w in ["disruption", "delay", "warning", "notice"]):
            return 0.50
        if any(w in text_lower for w in ["monitor", "concern", "watch", "potential"]):
            return 0.30
        return 0.20

    @staticmethod
    def _goldstein_to_severity(goldstein: float) -> float:
        """Converts GDELT GoldsteinScale (-10 to +10) to severity (0 to 1)."""
        # Negative goldstein = conflict/disruption, flip and normalize
        return min(1.0, max(0.0, -goldstein / 10.0))
