"""
Engine 3 - Action Intelligence (Grounded RAG).
"""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from ..models.graph import Citation, QueryResponse
from ..data_loader import DataLoader
from .gemini_flash_client import GeminiFlashClient
from .graph_service import GraphService
from .retriever import Retriever

logger = logging.getLogger("shockmap.analyst")

SYSTEM_PROMPT = """You are ShockMap's supply intelligence analyst.
You support India's critical-import monitoring across pharma and rare earths.
Always produce concrete, actionable outputs with explicit confidence.
Use only provided context. If evidence is thin, say what is missing."""

QUERY_PROMPT = """
Answer the operator's question using only the supplied context.
Keep the answer under 140 words. Focus on what to inspect or do next.

QUESTION:
{question}

RETRIEVED CONTEXT:
{context_snippets}

TOP RISKS:
{current_risks}

RECENT ALERTS:
{recent_alerts}

COMMUNITY CLUSTERS:
{community_info}

DEMO / SCENARIO CONTEXT:
{scenario_context}
"""

ALERT_PROMPT = """
Generate a specific response plan using only the supplied context.
Prefer concrete actions with quantities, lead times, and escalation triggers.

SHOCK:
- region: {shocked_region}
- type: {shock_type}
- sector: {sector}

CONTEXT:
{retrieved_chunks}

EXPOSED INPUTS:
{affected_inputs}

RISK SCORES:
{risk_scores}

COMMUNITY:
{community_info}

PAGERANK:
{pagerank_data}

DEMO / SCENARIO PLAN:
{scenario_plan}
"""

QUERY_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "answer": {"type": "string"},
        "confidence": {"type": "number"},
        "citations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "source": {"type": "string"},
                    "snippet": {"type": "string"},
                    "url": {"type": "string"},
                },
                "required": ["source", "snippet"],
            },
        },
        "suggested_drugs_to_inspect": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": ["answer", "confidence", "citations", "suggested_drugs_to_inspect"],
}

ACTION_PLAN_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "immediate_actions": {"type": "array", "items": {"type": "string"}},
        "medium_term_actions": {"type": "array", "items": {"type": "string"}},
        "policy_escalation_trigger": {"type": "string"},
        "estimated_impact": {"type": "string"},
        "confidence": {"type": "number"},
    },
    "required": [
        "summary",
        "immediate_actions",
        "medium_term_actions",
        "policy_escalation_trigger",
        "estimated_impact",
        "confidence",
    ],
}


class GeminiAnalyst:
    """
    Engine 3 orchestrator for grounded answers and action plans.
    """

    def __init__(
        self,
        genai: Any,
        retriever: Retriever,
        graph_service: GraphService,
        data_loader: DataLoader,
        gemini_client: Optional[GeminiFlashClient] = None,
        demo_mode_service: Optional[Any] = None,
    ):
        from ..config import settings

        self.retriever = retriever
        self.graph_service = graph_service
        self.data_loader = data_loader
        self.demo_mode_service = demo_mode_service
        self.gemini_client = gemini_client or GeminiFlashClient(
            genai=genai,
            model_name=settings.GEMINI_FLASH_MODEL,
            cache_ttl_seconds=1800,
        )
        self._cache: Dict[str, Dict[str, Any]] = {}

    def _get_cache(self, key: str) -> Optional[QueryResponse]:
        entry = self._cache.get(key)
        if entry and entry["expiry"] > datetime.now():
            return entry["response"]
        return None

    def _set_cache(self, key: str, response: QueryResponse) -> None:
        self._cache[key] = {
            "response": response,
            "expiry": datetime.now() + timedelta(minutes=30),
        }

    @staticmethod
    def _clamp_confidence(value: Any, default: float = 0.0) -> float:
        try:
            return max(0.0, min(1.0, float(value)))
        except Exception:
            return default

    @staticmethod
    def _build_query_fallback(
        question: str,
        top_risks: List[Dict[str, Any]],
        citations: List[Citation],
    ) -> Dict[str, Any]:
        if top_risks:
            top = top_risks[0]
            answer = (
                f"Top propagation risk is {top['name']} ({top['id']}) with score {top['risk']:.2f}. "
                f"Focus on dependency exposure in provinces: {top['provinces']}."
            )
        else:
            answer = (
                "No high-confidence risk ranking is available right now. "
                "Use recent alerts and province-level shocks for manual review."
            )

        fallback_citations = [
            {"source": c.source, "snippet": c.snippet, "url": c.url}
            for c in citations[:3]
        ]
        return {
            "answer": answer,
            "confidence": 0.35 if fallback_citations else 0.2,
            "citations": fallback_citations,
            "suggested_drugs_to_inspect": [d["id"] for d in top_risks[:5]],
        }

    @staticmethod
    def _serialize_citations(citations: List[Citation], limit: int = 4) -> List[Dict[str, Any]]:
        payload = []
        for item in citations[:limit]:
            payload.append(
                {
                    "source": item.source,
                    "snippet": item.snippet,
                    "url": item.url,
                }
            )
        return payload

    @staticmethod
    def _dedupe_citation_payload(items: List[Dict[str, Any]], limit: int = 4) -> List[Dict[str, Any]]:
        deduped: List[Dict[str, Any]] = []
        seen = set()
        for item in items:
            source = str(item.get("source", "")).strip()
            snippet = str(item.get("snippet", "")).strip()
            if not source or not snippet:
                continue
            key = (source, str(item.get("url") or ""), snippet[:120])
            if key in seen:
                continue
            seen.add(key)
            deduped.append(
                {
                    "source": source,
                    "snippet": snippet,
                    "url": item.get("url"),
                }
            )
            if len(deduped) >= limit:
                break
        return deduped

    @staticmethod
    def _dedupe_citations(citations: List[Citation], limit: int = 4) -> List[Citation]:
        deduped: List[Citation] = []
        seen = set()
        for item in citations:
            key = (item.source, item.url or "", item.snippet[:120])
            if key in seen:
                continue
            seen.add(key)
            deduped.append(item)
            if len(deduped) >= limit:
                break
        return deduped

    @staticmethod
    def _build_action_fallback(
        shocked_region: str,
        shock_type: str,
        affected_inputs: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        top_items = affected_inputs[:3]
        immediate_actions = [
            f"Secure emergency purchase coverage for {item['name']} within 72 hours (risk={item['risk_score']})."
            for item in top_items
        ] or [
            "Trigger manual procurement review for top exposed APIs within 72 hours.",
        ]
        medium_actions = [
            "Increase safety stock target to at least 30 days for top exposed inputs.",
            "Diversify supplier mix across at least two non-overlapping source clusters.",
        ]
        max_risk = max((item["risk_score"] for item in affected_inputs), default=0.0)
        escalate = (
            "YES - notify Department of Pharmaceuticals and NITI coordination desk."
            if max_risk >= 70
            else "NO - monitor daily and escalate only if risk rises above 70."
        )
        impact = (
            f"Scenario {shock_type} in {shocked_region} affects {len(affected_inputs)} inputs; "
            f"highest modeled risk={max_risk:.2f}."
        )
        return {
            "summary": f"Operational response required for {shock_type} in {shocked_region}.",
            "immediate_actions": immediate_actions,
            "medium_term_actions": medium_actions,
            "policy_escalation_trigger": escalate,
            "estimated_impact": impact,
            "confidence": 0.4,
        }

    @staticmethod
    def _render_action_plan(plan: Dict[str, Any]) -> str:
        summary = str(plan.get("summary", "")).strip()
        immediate = [str(x).strip() for x in plan.get("immediate_actions", []) if str(x).strip()]
        medium = [str(x).strip() for x in plan.get("medium_term_actions", []) if str(x).strip()]
        escalation = str(plan.get("policy_escalation_trigger", "")).strip()
        impact = str(plan.get("estimated_impact", "")).strip()

        parts = [
            f"Summary: {summary}",
            "Immediate Actions (72h):",
        ]
        parts.extend([f"- {item}" for item in immediate] or ["- No immediate actions provided."])
        parts.append("Medium-Term Actions (30d):")
        parts.extend([f"- {item}" for item in medium] or ["- No medium-term actions provided."])
        parts.append(f"Policy Escalation Trigger: {escalation}")
        parts.append(f"Estimated Impact: {impact}")
        return "\n".join(parts)

    async def answer(
        self,
        question: str,
        context_filters: Optional[Dict[str, Any]] = None,
    ) -> QueryResponse:
        from ..config import settings

        cache_data = question + json.dumps(context_filters or {}, sort_keys=True)
        cache_key = hashlib.sha256(cache_data.encode("utf-8")).hexdigest()
        cached = self._get_cache(cache_key)
        if cached:
            return cached

        demo_response: Optional[QueryResponse] = None
        matched_scenarios: List[str] = []
        scenario_context = "[]"
        if settings.DEMO_MODE and self.demo_mode_service is not None:
            demo_response = self.demo_mode_service.answer_query(question, context_filters)
            matched = self.demo_mode_service.match_scenarios(question, limit=2)
            matched_scenarios = demo_response.matched_scenarios
            scenario_context = json.dumps(
                [
                    {
                        "title": item.get("title"),
                        "province": item.get("province"),
                        "sector": item.get("sector"),
                        "severity": item.get("severity"),
                        "summary": item.get("summary"),
                        "action_summary": item.get("structured_plan", {}).get("summary"),
                    }
                    for item in matched
                ],
                indent=2,
            )

        if not self.gemini_client.is_available():
            if demo_response is not None:
                self._set_cache(cache_key, demo_response)
                return demo_response

        try:
            citations = self.retriever.search(question, top_k=4)

            all_drugs = self.data_loader.get_drugs()
            drug_risks: List[Dict[str, Any]] = []
            for drug in all_drugs:
                node = self.graph_service.get_node(drug.id)
                risk = node["attributes"].get("current_risk", 0.0) if node else 0.0
                community = self.graph_service.get_node_community(drug.id)
                drug_risks.append(
                    {
                        "id": drug.id,
                        "name": drug.name,
                        "risk": risk,
                        "tier": drug.nlem_tier.value,
                        "therapeutic_class": drug.therapeutic_class,
                        "has_substitute": drug.has_substitute,
                        "community_id": community,
                        "provinces": ", ".join(self.graph_service.get_neighbors(drug.id, "out")),
                    }
                )
            top_risks = sorted(drug_risks, key=lambda x: x["risk"], reverse=True)[:6]

            communities = self.graph_service.get_communities()
            community_summary = json.dumps(
                [
                    {"label": c["label"], "size": c["size"], "provinces": c["provinces"][:3]}
                    for c in communities.get("communities", [])[:3]
                ],
                indent=2,
            )
            recent_alerts = self.data_loader.get_alerts(limit=3)

            fallback_payload = self._build_query_fallback(
                question=question,
                top_risks=top_risks,
                citations=citations,
            )
            if demo_response is not None:
                demo_payload = {
                    "answer": demo_response.answer,
                    "confidence": demo_response.confidence,
                    "citations": self._serialize_citations(demo_response.citations, limit=4),
                    "suggested_drugs_to_inspect": demo_response.suggested_drugs_to_inspect,
                }
                fallback_payload = {
                    "answer": demo_payload["answer"] or fallback_payload["answer"],
                    "confidence": max(
                        float(demo_payload["confidence"] or 0.0),
                        float(fallback_payload["confidence"] or 0.0),
                    ),
                    "citations": self._dedupe_citation_payload(
                        demo_payload["citations"] + fallback_payload["citations"],
                        limit=4,
                    ),
                    "suggested_drugs_to_inspect": demo_payload["suggested_drugs_to_inspect"] or fallback_payload["suggested_drugs_to_inspect"],
                }

            prompt = QUERY_PROMPT.format(
                context_snippets=json.dumps(
                    [{"source": c.source, "text": c.snippet, "url": c.url} for c in citations],
                    indent=2,
                ),
                current_risks=json.dumps(top_risks, indent=2),
                recent_alerts=json.dumps(
                    [{"severity": a.severity.value, "summary": a.summary} for a in recent_alerts],
                    indent=2,
                ),
                community_info=community_summary,
                scenario_context=scenario_context,
                question=question,
            )

            data = self.gemini_client.generate_json(
                prompt=prompt,
                response_schema=QUERY_RESPONSE_SCHEMA,
                system_instruction=SYSTEM_PROMPT,
                temperature=0.1,
                max_output_tokens=700,
                min_confidence=0.25,
                fallback=fallback_payload,
                cache_namespace="engine3_query",
            )

            answer_text = str(data.get("answer", fallback_payload["answer"])).strip()
            confidence = self._clamp_confidence(
                data.get("confidence", fallback_payload["confidence"]),
                default=fallback_payload["confidence"],
            )

            raw_citations = data.get("citations", fallback_payload["citations"])
            citation_models: List[Citation] = []
            for item in raw_citations:
                if not isinstance(item, dict):
                    continue
                source = str(item.get("source", "")).strip()
                snippet = str(item.get("snippet", "")).strip()
                if not source or not snippet:
                    continue
                citation_models.append(
                    Citation(
                        source=source,
                        snippet=snippet,
                        url=item.get("url"),
                    )
                )
            if demo_response is not None:
                citation_models.extend(demo_response.citations)
            citation_models = self._dedupe_citations(citation_models, limit=4)

            suggested = [str(x) for x in data.get("suggested_drugs_to_inspect", []) if str(x).strip()]
            if not suggested:
                suggested = fallback_payload["suggested_drugs_to_inspect"]

            response_mode = "live"
            if demo_response is not None:
                response_mode = "hybrid_live" if answer_text != fallback_payload["answer"] else "demo"

            query_res = QueryResponse(
                answer=answer_text,
                confidence=confidence,
                citations=citation_models,
                suggested_drugs_to_inspect=suggested,
                response_mode=response_mode,
                matched_scenarios=matched_scenarios,
            )

            self._set_cache(cache_key, query_res)
            return query_res

        except Exception as exc:
            logger.error("Gemini Analyst failure: %s", exc)
            if demo_response is not None:
                demo_fallback = demo_response.model_copy(
                    update={
                        "response_mode": "demo",
                        "matched_scenarios": matched_scenarios or demo_response.matched_scenarios,
                    }
                )
                self._set_cache(cache_key, demo_fallback)
                return demo_fallback
            return QueryResponse(
                answer="I could not form a grounded answer right now. Check alerts and propagation views.",
                confidence=0.0,
                citations=[],
                suggested_drugs_to_inspect=[],
                response_mode="fallback",
                matched_scenarios=[],
            )

    async def generate_action_plan(
        self,
        shocked_region: str,
        shock_type: str = "factory_shutdown",
        sector: str = "pharma",
    ) -> Dict[str, Any]:
        from ..config import settings

        demo_plan: Optional[Dict[str, Any]] = None
        if settings.DEMO_MODE and self.demo_mode_service is not None:
            demo_plan = self.demo_mode_service.generate_action_plan(
                shocked_region=shocked_region,
                shock_type=shock_type,
                sector=sector,
            )
            if not self.gemini_client.is_available():
                return demo_plan

        try:
            risk_results = self.graph_service.compute_combined_risk(shocked_region, sector)
            top_affected = dict(list(risk_results.items())[:10])

            affected_inputs: List[Dict[str, Any]] = []
            for node_id, risk_data in top_affected.items():
                affected_inputs.append(
                    {
                        "id": node_id,
                        "name": risk_data["name"],
                        "risk_score": risk_data["risk_score"],
                        "buffer_days": risk_data["components"]["buffer_days"],
                        "substitutability": risk_data["components"]["substitutability"],
                        "community": risk_data["components"]["community_label"],
                    }
                )

            community_id = self.graph_service.get_node_community(shocked_region)
            community_info = "Unknown cluster"
            if community_id is not None:
                communities = self.graph_service.get_communities()
                for community in communities.get("communities", []):
                    if community["id"] == community_id:
                        community_info = (
                            f"{community['label']} - {community['size']} nodes; "
                            f"provinces: {', '.join(community['provinces'][:5])}"
                        )
                        break

            search_query = f"{shock_type} {shocked_region} supply chain disruption impact India"
            citations = self.retriever.search(search_query, top_k=4)
            if demo_plan is not None:
                for item in demo_plan.get("citations", []):
                    source = str(item.get("source", "")).strip()
                    snippet = str(item.get("snippet", "")).strip()
                    if source and snippet:
                        citations.append(Citation(source=source, snippet=snippet, url=item.get("url")))
                citations = self._dedupe_citations(citations, limit=4)

            prompt = ALERT_PROMPT.format(
                retrieved_chunks=json.dumps(
                    [{"source": c.source, "text": c.snippet, "url": c.url} for c in citations],
                    indent=2,
                ),
                shocked_region=shocked_region,
                shock_type=shock_type,
                sector=sector,
                affected_inputs=json.dumps(affected_inputs, indent=2),
                risk_scores=json.dumps(
                    {k: v["risk_score"] for k, v in top_affected.items()},
                    indent=2,
                ),
                community_info=community_info,
                pagerank_data=json.dumps(
                    {k: v["components"]["pagerank"] for k, v in top_affected.items()},
                    indent=2,
                ),
                scenario_plan=json.dumps((demo_plan or {}).get("structured_plan", {}), indent=2),
            )

            fallback_plan = (demo_plan or {}).get("structured_plan") or self._build_action_fallback(
                shocked_region=shocked_region,
                shock_type=shock_type,
                affected_inputs=affected_inputs,
            )
            plan = self.gemini_client.generate_json(
                prompt=prompt,
                response_schema=ACTION_PLAN_SCHEMA,
                system_instruction=SYSTEM_PROMPT,
                temperature=0.15,
                max_output_tokens=1000,
                min_confidence=0.25,
                fallback=fallback_plan,
                cache_namespace="engine3_action_plan",
            )

            plan["confidence"] = self._clamp_confidence(
                plan.get("confidence", fallback_plan["confidence"]),
                default=fallback_plan["confidence"],
            )
            action_plan_text = self._render_action_plan(plan)

            return {
                "action_plan": action_plan_text,
                "structured_plan": plan,
                "shocked_region": shocked_region,
                "shock_type": shock_type,
                "sector": sector,
                "affected_inputs": affected_inputs,
                "community_info": community_info,
                "citations": [{"source": c.source, "snippet": c.snippet, "url": c.url} for c in citations],
                "pagerank_scores": {k: v["components"]["pagerank"] for k, v in top_affected.items()},
                "generated_at": datetime.utcnow().isoformat(),
                "response_mode": (
                    "hybrid_live"
                    if demo_plan is not None and plan != fallback_plan
                    else "demo"
                    if demo_plan is not None
                    else "live"
                    if plan != fallback_plan
                    else "fallback"
                ),
            }
        except Exception as exc:
            logger.error("Action plan generation failed: %s", exc)
            if demo_plan is not None:
                return demo_plan
            fallback_plan = self._build_action_fallback(
                shocked_region=shocked_region,
                shock_type=shock_type,
                affected_inputs=[],
            )
            return {
                "action_plan": self._render_action_plan(fallback_plan),
                "structured_plan": fallback_plan,
                "shocked_region": shocked_region,
                "shock_type": shock_type,
                "sector": sector,
                "error": str(exc),
                "generated_at": datetime.utcnow().isoformat(),
                "response_mode": "fallback",
            }
