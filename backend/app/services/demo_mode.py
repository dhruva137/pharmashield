"""
Scenario-backed demo mode for a stable MVP walkthrough.

Provides deterministic shocks, query answers, and action plans when the app is
running in curated demo mode or when live external services are unavailable.
"""

from __future__ import annotations

import json
import logging
import re
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from ..config import settings
from ..models.graph import Citation, QueryResponse

logger = logging.getLogger("shockmap.demo")

SEVERITY_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}


class DemoModeService:
    """Curated scenario engine used for deterministic MVP demos."""

    def __init__(self, data_loader: Any, graph_service: Any):
        self.data_loader = data_loader
        self.graph_service = graph_service
        self.scenarios_path = Path(settings.DEMO_SCENARIOS_PATH)
        self._scenarios = self._load_scenarios()
        self._drug_ids = {drug.id for drug in self.data_loader.get_drugs()}

    def _load_scenarios(self) -> List[Dict[str, Any]]:
        if not self.scenarios_path.exists():
            logger.warning("Demo scenarios file missing: %s", self.scenarios_path)
            return []
        try:
            scenarios = json.loads(self.scenarios_path.read_text(encoding="utf-8"))
        except Exception as exc:
            logger.warning("Failed to load demo scenarios: %s", exc)
            return []

        normalized: List[Dict[str, Any]] = []
        for raw in scenarios:
            item = dict(raw)
            item.setdefault("data_mode", "demo")
            item.setdefault("event_type", "factory_shutdown")
            item.setdefault("keyword_trigger", item["event_type"].replace("_", " "))
            item.setdefault("detected_at", item.get("published_at", datetime.utcnow().isoformat()))
            item.setdefault("published_at", item.get("detected_at", datetime.utcnow().isoformat()))
            item.setdefault("gdelt_sources", 1)
            item.setdefault("source", "DEMO")
            item.setdefault("severity", "MEDIUM")
            item.setdefault("summary", item.get("title", ""))
            item.setdefault("query_clues", [])
            item.setdefault("affected_entities", [])
            item.setdefault("demo_citations", [])
            normalized.append(item)
        return normalized

    def enabled(self) -> bool:
        return settings.DEMO_MODE and bool(self._scenarios)

    def count(self) -> int:
        return len(self._scenarios)

    @staticmethod
    def _parse_dt(value: Optional[str]) -> datetime:
        if not value:
            return datetime.min
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            return datetime.min

    def list_shocks(
        self,
        sector: Optional[str] = None,
        severity: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        shocks = [deepcopy(item) for item in self._scenarios]
        if sector:
            shocks = [item for item in shocks if item.get("sector") == sector]
        if severity:
            shocks = [item for item in shocks if item.get("severity") == severity.upper()]
        shocks.sort(
            key=lambda item: (
                SEVERITY_ORDER.get(item.get("severity", "LOW"), 4),
                -self._parse_dt(item.get("detected_at") or item.get("published_at")).timestamp()
                if self._parse_dt(item.get("detected_at") or item.get("published_at")) != datetime.min
                else float("inf"),
            )
        )
        if limit is not None:
            shocks = shocks[:limit]
        return shocks

    def get_shock(self, shock_id: str) -> Optional[Dict[str, Any]]:
        for item in self._scenarios:
            if item.get("id") == shock_id:
                return deepcopy(item)
        return None

    @staticmethod
    def _normalize_text(text: str) -> str:
        return re.sub(r"\s+", " ", (text or "").strip().lower())

    @staticmethod
    def _tokenize(text: str) -> set[str]:
        return set(re.findall(r"[a-z0-9_]+", (text or "").lower()))

    def _match_score(self, scenario: Dict[str, Any], query: str) -> int:
        normalized = self._normalize_text(query)
        tokens = self._tokenize(query)
        score = 0

        province = self._normalize_text(str(scenario.get("province", "")))
        event_type = self._normalize_text(str(scenario.get("event_type", "")).replace("_", " "))
        title = self._normalize_text(str(scenario.get("title", "")))
        label = self._normalize_text(str(scenario.get("scenario_label", "")))

        for term in [province, event_type, title, label]:
            if term and term in normalized:
                score += 4

        for term in scenario.get("query_clues", []) + scenario.get("affected_entities", []):
            norm = self._normalize_text(str(term).replace("_", " "))
            if not norm:
                continue
            if norm in normalized:
                score += 3
                continue
            if any(piece in tokens for piece in norm.split()):
                score += 1

        sector = scenario.get("sector")
        if sector == "rare_earth" and any(
            token in tokens for token in {"rare", "earth", "ev", "magnet", "mineral", "neodymium", "dysprosium"}
        ):
            score += 4
        if sector == "pharma" and any(
            token in tokens for token in {"drug", "medicine", "api", "hospital", "stockout", "paracetamol", "antibiotic"}
        ):
            score += 3

        if "buffer" in tokens or "cover" in tokens or "stock" in tokens:
            score += 1
        return score

    def _policy_citations(self, scenario: Dict[str, Any], limit: int = 2) -> List[Citation]:
        hints = set()
        hints.update(self._tokenize(" ".join(str(x) for x in scenario.get("query_clues", []))))
        hints.update(self._tokenize(" ".join(str(x) for x in scenario.get("affected_entities", []))))
        hints.update(self._tokenize(str(scenario.get("summary", ""))))

        ranked: List[tuple[int, Dict[str, Any]]] = []
        for snippet in self.data_loader.get_policy_snippets():
            score = 0
            for keyword in snippet.get("keywords", []):
                if self._normalize_text(str(keyword)) in hints:
                    score += 2
            if any(token in self._normalize_text(snippet.get("text", "")) for token in hints):
                score += 1
            if score > 0:
                ranked.append((score, snippet))

        ranked.sort(key=lambda item: item[0], reverse=True)
        citations = []
        for _, snippet in ranked[:limit]:
            citations.append(
                Citation(
                    source=str(snippet.get("source", "Policy Snippet")),
                    snippet=str(snippet.get("text", "")).strip(),
                    url=snippet.get("source_url"),
                )
            )
        return citations

    @staticmethod
    def _coerce_citations(raw_items: List[Dict[str, Any]]) -> List[Citation]:
        citations: List[Citation] = []
        for item in raw_items:
            source = str(item.get("source", "")).strip()
            snippet = str(item.get("snippet", "")).strip()
            if not source or not snippet:
                continue
            citations.append(Citation(source=source, snippet=snippet, url=None))
        return citations

    def _community_info(self, province: str) -> str:
        community_id = self.graph_service.get_node_community(province)
        if community_id is None:
            return "Community unknown"
        communities = self.graph_service.get_communities()
        for item in communities.get("communities", []):
            if item.get("id") == community_id:
                provinces = ", ".join(item.get("provinces", [])[:5])
                return f"{item.get('label', f'Cluster {community_id}')} - {item.get('size', 0)} nodes; provinces: {provinces}"
        return f"Cluster {community_id}"

    def _affected_inputs(
        self,
        province: str,
        sector: str,
        count: int = 5,
    ) -> List[Dict[str, Any]]:
        try:
            risk_results = self.graph_service.compute_combined_risk(province, sector)
        except Exception as exc:
            logger.warning("Demo risk calculation failed for %s/%s: %s", province, sector, exc)
            return []

        affected: List[Dict[str, Any]] = []
        for node_id, risk in list(risk_results.items())[:count]:
            affected.append(
                {
                    "id": node_id,
                    "name": risk.get("name", node_id),
                    "risk_score": risk.get("risk_score", 0.0),
                    "type": risk.get("type"),
                    "sector": risk.get("sector", sector),
                    "buffer_days": risk.get("components", {}).get("buffer_days"),
                    "substitutability": risk.get("components", {}).get("substitutability"),
                    "community": risk.get("components", {}).get("community_label"),
                    "pagerank": risk.get("components", {}).get("pagerank"),
                }
            )
        return affected

    def _best_scenarios(self, question: str, limit: int = 2) -> List[Dict[str, Any]]:
        ranked = []
        for scenario in self._scenarios:
            score = self._match_score(scenario, question)
            if score > 0:
                ranked.append((score, scenario))

        ranked.sort(
            key=lambda item: (
                -item[0],
                SEVERITY_ORDER.get(item[1].get("severity", "LOW"), 4),
                -self._parse_dt(item[1].get("detected_at")).timestamp(),
            )
        )
        matches = [deepcopy(item[1]) for item in ranked[:limit]]
        if matches:
            return matches
        return self.list_shocks(limit=limit)

    def match_scenarios(self, question: str, limit: int = 2) -> List[Dict[str, Any]]:
        return self._best_scenarios(question, limit=limit)

    def answer_query(
        self,
        question: str,
        context_filters: Optional[Dict[str, Any]] = None,
    ) -> QueryResponse:
        del context_filters
        matches = self._best_scenarios(question, limit=2)
        if not matches:
            return QueryResponse(
                answer="Demo mode is enabled, but no curated scenarios are available.",
                confidence=0.0,
                citations=[],
                suggested_drugs_to_inspect=[],
                response_mode="demo",
                matched_scenarios=[],
            )

        primary = matches[0]
        affected = self._affected_inputs(primary.get("province", ""), primary.get("sector", "pharma"), count=5)
        top_drugs = [item["id"] for item in affected if item.get("id") in self._drug_ids][:5]
        if not top_drugs:
            top_drugs = [item for item in primary.get("affected_entities", []) if item in self._drug_ids][:5]

        citations = self._policy_citations(primary, limit=2)
        citations.extend(self._coerce_citations(primary.get("demo_citations", [])))
        citations = citations[:4]

        impact_list = ", ".join(f"{item['name']} ({item['risk_score']:.0f})" for item in affected[:3]) or "No computed propagation nodes available"
        related = ""
        if len(matches) > 1:
            related = f" Secondary scenario to watch: {matches[1].get('title')}."

        answer = (
            f"Primary scenario match: {primary.get('title')}. "
            f"Modeled impact centers on {primary.get('province')} with top exposed nodes {impact_list}. "
            f"{primary.get('structured_plan', {}).get('summary', primary.get('summary', ''))} "
            f"Immediate trigger: {primary.get('structured_plan', {}).get('policy_escalation_trigger', 'Monitor stock cover daily.')}"
            f"{related}"
        ).strip()

        return QueryResponse(
            answer=answer,
            confidence=float(primary.get("confidence", 0.75)),
            citations=citations,
            suggested_drugs_to_inspect=top_drugs,
            response_mode="demo",
            matched_scenarios=[item.get("scenario_label", item.get("title", "")) for item in matches],
        )

    @staticmethod
    def _render_action_plan(plan: Dict[str, Any]) -> str:
        lines = [f"Summary: {str(plan.get('summary', '')).strip()}"]
        lines.append("Immediate Actions (72h):")
        immediate = [str(item).strip() for item in plan.get("immediate_actions", []) if str(item).strip()]
        lines.extend(f"- {item}" for item in immediate or ["No immediate actions defined."])
        lines.append("Medium-Term Actions (30d):")
        medium = [str(item).strip() for item in plan.get("medium_term_actions", []) if str(item).strip()]
        lines.extend(f"- {item}" for item in medium or ["No medium-term actions defined."])
        lines.append(f"Policy Escalation Trigger: {str(plan.get('policy_escalation_trigger', '')).strip()}")
        lines.append(f"Estimated Impact: {str(plan.get('estimated_impact', '')).strip()}")
        return "\n".join(lines)

    def generate_action_plan(
        self,
        shocked_region: str,
        shock_type: str = "factory_shutdown",
        sector: str = "pharma",
    ) -> Dict[str, Any]:
        region_norm = self._normalize_text(shocked_region)
        type_norm = self._normalize_text(shock_type.replace("_", " "))

        exact = None
        fallback = None
        for scenario in self._scenarios:
            province_norm = self._normalize_text(str(scenario.get("province", "")))
            event_norm = self._normalize_text(str(scenario.get("event_type", "")).replace("_", " "))
            if province_norm == region_norm and scenario.get("sector") == sector:
                if event_norm == type_norm:
                    exact = deepcopy(scenario)
                    break
                fallback = deepcopy(scenario)

        scenario = exact or fallback or (self.list_shocks(sector=sector, limit=1)[0] if self._scenarios else None)
        if scenario is None:
            return {
                "action_plan": "No demo scenario available.",
                "structured_plan": {
                    "summary": "No demo scenario available.",
                    "immediate_actions": [],
                    "medium_term_actions": [],
                    "policy_escalation_trigger": "N/A",
                    "estimated_impact": "N/A",
                    "confidence": 0.0,
                },
                "shocked_region": shocked_region,
                "shock_type": shock_type,
                "sector": sector,
                "affected_inputs": [],
                "community_info": "Community unknown",
                "citations": [],
                "pagerank_scores": {},
                "generated_at": datetime.utcnow().isoformat(),
                "response_mode": "demo",
            }

        scenario.setdefault("sector", sector)
        scenario.setdefault("province", shocked_region)

        affected = self._affected_inputs(scenario.get("province", shocked_region), scenario.get("sector", sector), count=8)
        pagerank_scores = {
            item["id"]: item.get("pagerank", 0.0)
            for item in affected
        }
        community_info = self._community_info(scenario.get("province", shocked_region))

        plan = deepcopy(scenario.get("structured_plan", {}))
        plan.setdefault(
            "summary",
            f"Respond to {scenario.get('event_type', shock_type)} disruption in {scenario.get('province', shocked_region)}."
        )
        plan.setdefault("immediate_actions", [])
        plan.setdefault("medium_term_actions", [])
        plan.setdefault("policy_escalation_trigger", "Monitor daily.")
        plan.setdefault("estimated_impact", scenario.get("summary", ""))
        plan.setdefault("confidence", float(scenario.get("confidence", 0.75)))

        if affected:
            top_names = ", ".join(item["name"] for item in affected[:3])
            if not any(top_names in item for item in plan["immediate_actions"]):
                plan["immediate_actions"].append(
                    f"Track daily cover for {top_names} and update allocation priorities before the next dispatch cut-off."
                )

        citations = self._policy_citations(scenario, limit=2)
        citations.extend(self._coerce_citations(scenario.get("demo_citations", [])))
        citations_payload = [
            {"source": citation.source, "snippet": citation.snippet, "url": citation.url}
            for citation in citations[:4]
        ]

        return {
            "action_plan": self._render_action_plan(plan),
            "structured_plan": plan,
            "shocked_region": scenario.get("province", shocked_region),
            "shock_type": scenario.get("event_type", shock_type),
            "sector": scenario.get("sector", sector),
            "affected_inputs": affected,
            "community_info": community_info,
            "citations": citations_payload,
            "pagerank_scores": pagerank_scores,
            "generated_at": datetime.utcnow().isoformat(),
            "response_mode": "demo",
            "scenario_id": scenario.get("id"),
        }
