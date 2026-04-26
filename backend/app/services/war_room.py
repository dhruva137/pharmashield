"""
War-room orchestration for turning a shock into a decision surface.
"""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from typing import Any, Dict, List, Optional


SEVERITY_RISK_BOOST = {
    "CRITICAL": 1.25,
    "HIGH": 1.15,
    "MEDIUM": 1.05,
    "LOW": 0.9,
}

DEFAULT_STOCKOUT_DAYS = {
    ("pharma", "CRITICAL"): 9,
    ("pharma", "HIGH"): 12,
    ("pharma", "MEDIUM"): 18,
    ("pharma", "LOW"): 28,
    ("rare_earth", "CRITICAL"): 18,
    ("rare_earth", "HIGH"): 24,
    ("rare_earth", "MEDIUM"): 32,
    ("rare_earth", "LOW"): 45,
}

ACTION_PROFILES = {
    "procurement": {
        "label": "Emergency purchase cover",
        "risk_multiplier": 0.62,
        "stockout_days_delta": 12,
        "lead_time_hours": 24,
        "cost_ratio": 0.22,
    },
    "reallocate": {
        "label": "Reallocate inventory",
        "risk_multiplier": 0.74,
        "stockout_days_delta": 7,
        "lead_time_hours": 6,
        "cost_ratio": 0.05,
    },
    "buffer": {
        "label": "Raise buffer target",
        "risk_multiplier": 0.69,
        "stockout_days_delta": 14,
        "lead_time_hours": 48,
        "cost_ratio": 0.14,
    },
}


class WarRoomService:
    def __init__(self, graph_service: Any, data_loader: Any, demo_mode_service: Optional[Any] = None):
        self.graph_service = graph_service
        self.data_loader = data_loader
        self.demo_mode_service = demo_mode_service

    def _scenario_for_shock(self, shock: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if self.demo_mode_service is None:
            return None
        scenario = self.demo_mode_service.get_shock(str(shock.get("id", "")))
        return deepcopy(scenario) if scenario else None

    def _risk_rows(self, shock: Dict[str, Any]) -> List[Dict[str, Any]]:
        province = shock.get("province")
        sector = shock.get("sector", "pharma")
        if not province:
            return []

        try:
            combined = self.graph_service.compute_combined_risk(province, sector)
        except Exception:
            return []

        rows = []
        for node_id, payload in list(combined.items())[:8]:
            node = self.graph_service.get_node(node_id) or {"attributes": {}}
            attrs = node.get("attributes", {})
            substitutability = payload.get("components", {}).get("substitutability", attrs.get("substitutability", 0.0))
            buffer_days = payload.get("components", {}).get("buffer_days", attrs.get("buffer_days", 0))
            reasons = []
            if substitutability <= 0.15:
                reasons.append("low substitutability")
            if buffer_days <= 10:
                reasons.append("tight buffer")
            community_label = payload.get("components", {}).get("community_label")
            if community_label:
                reasons.append(community_label)
            monthly_value = attrs.get("monthly_import_value_usd_millions", 0.0) or 0.0
            rows.append(
                {
                    "id": node_id,
                    "name": payload.get("name", node_id),
                    "type": payload.get("type", node.get("type")),
                    "risk_before": round(payload.get("risk_score", 0.0), 2),
                    "buffer_days": buffer_days,
                    "substitutability_pct": round(substitutability * 100),
                    "community_label": community_label,
                    "pagerank": payload.get("components", {}).get("pagerank", 0.0),
                    "monthly_import_value_usd_millions": round(float(monthly_value), 2),
                    "reasons": reasons,
                }
            )
        return rows

    def _aggregate_risk(self, rows: List[Dict[str, Any]], shock: Dict[str, Any]) -> float:
        top_score = rows[0]["risk_before"] if rows else 0.0
        multiplier = SEVERITY_RISK_BOOST.get(str(shock.get("severity", "MEDIUM")).upper(), 1.0)
        return round(min(98.0, top_score * multiplier), 1)

    def _stockout_days(self, shock: Dict[str, Any], rows: List[Dict[str, Any]], scenario: Optional[Dict[str, Any]]) -> int:
        if scenario and scenario.get("baseline_stockout_days"):
            return int(scenario["baseline_stockout_days"])
        sector = shock.get("sector", "pharma")
        severity = str(shock.get("severity", "MEDIUM")).upper()
        fallback = DEFAULT_STOCKOUT_DAYS.get((sector, severity), 14)
        if not rows:
            return fallback
        min_buffer = min(max(1, int(row.get("buffer_days") or 1)) for row in rows[:3])
        return max(fallback, min_buffer + (4 if sector == "pharma" else 8))

    def _exposure(self, rows: List[Dict[str, Any]], shock: Dict[str, Any]) -> float:
        import_values = [row["monthly_import_value_usd_millions"] for row in rows if row["monthly_import_value_usd_millions"] > 0]
        if import_values:
            return round(sum(import_values[:3]) * 0.05, 1)
        base = 6.0 if shock.get("sector") == "pharma" else 12.0
        severity_boost = {"CRITICAL": 1.35, "HIGH": 1.15, "MEDIUM": 0.9, "LOW": 0.7}
        return round(base * severity_boost.get(str(shock.get("severity", "MEDIUM")).upper(), 1.0), 1)

    def _evidence(self, shock: Dict[str, Any], scenario: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
        evidence = []

        for snippet in self.data_loader.get_policy_snippets():
            if len(evidence) >= 2:
                break
            evidence.append(
                {
                    "source": snippet.get("source", "Policy"),
                    "snippet": snippet.get("text", ""),
                    "url": snippet.get("source_url"),
                }
            )

        if scenario:
            for item in scenario.get("demo_citations", []):
                source = str(item.get("source", "")).strip()
                snippet = str(item.get("snippet", "")).strip()
                if source and snippet:
                    evidence.append({"source": source, "snippet": snippet, "url": None})

        if shock.get("data_mode") != "demo" and shock.get("source") and shock.get("summary"):
            evidence.append(
                {
                    "source": str(shock.get("source")),
                    "snippet": str(shock.get("summary")),
                    "url": shock.get("source_url"),
                }
            )

        deduped = []
        seen = set()
        for item in evidence:
            key = (item.get("source"), item.get("url"), item.get("snippet", "")[:120])
            if key in seen:
                continue
            seen.add(key)
            deduped.append(item)
            if len(deduped) == 4:
                break
        return deduped

    def _pick_profile(self, action_text: str) -> str:
        text = action_text.lower()
        if any(word in text for word in ["buy", "purchase", "rfq", "reserve", "pull", "advance-buy", "lock"]):
            return "procurement"
        if any(word in text for word in ["reallocate", "prioritize", "pause", "freeze", "hold", "re-sequence"]):
            return "reallocate"
        return "buffer"

    @staticmethod
    def _action_label(action_text: str, fallback: str) -> str:
        cleaned = (
            str(action_text)
            .replace("(", " ")
            .replace(")", " ")
            .replace(";", " ")
            .replace(",", " ")
            .replace(".", " ")
        )
        words = [word for word in cleaned.split() if word]
        if not words:
            return fallback
        short = " ".join(words[:4]).strip()
        return short if len(short) >= 8 else fallback

    def _default_action_texts(self, shock: Dict[str, Any], rows: List[Dict[str, Any]]) -> List[str]:
        names = ", ".join(row["name"] for row in rows[:3]) or "top exposed inputs"
        if shock.get("sector") == "rare_earth":
            return [
                f"Pull strategic stock for {names} and ring-fence it for priority domestic programs.",
                f"Reallocate current material cover away from low-margin export commitments for {names}.",
                f"Raise buffer targets for {names} and lock backup trader capacity for the next procurement cycle.",
            ]
        return [
            f"Secure emergency purchase cover for {names} within 72 hours.",
            f"Reallocate available inventory for {names} toward hospital and tender commitments first.",
            f"Raise safety stock targets for {names} to avoid a second-week allocation crunch.",
        ]

    def _actions(
        self,
        shock: Dict[str, Any],
        scenario: Optional[Dict[str, Any]],
        rows: List[Dict[str, Any]],
        exposure: float,
    ) -> List[Dict[str, Any]]:
        structured = (scenario or {}).get("structured_plan", {})
        source_texts = list(structured.get("immediate_actions", [])) + list(structured.get("medium_term_actions", []))
        if not source_texts:
            source_texts = self._default_action_texts(shock, rows)

        actions = []
        used_profiles = set()
        for idx, text in enumerate(source_texts):
            profile_key = self._pick_profile(text)
            profile = ACTION_PROFILES[profile_key]
            cost = round(max(0.3, exposure * profile["cost_ratio"]), 1)
            action = {
                "id": f"{profile_key}_{idx + 1}",
                "label": self._action_label(text, profile["label"]),
                "summary": str(text).strip(),
                "estimated_cost_usd_millions": cost,
                "lead_time_hours": profile["lead_time_hours"],
                "risk_multiplier": profile["risk_multiplier"],
                "stockout_days_delta": profile["stockout_days_delta"],
                "confidence": round(float(structured.get("confidence", scenario.get("confidence", 0.75) if scenario else 0.72)), 2),
            }
            actions.append(action)
            used_profiles.add(profile_key)
            if len(actions) == 3:
                break

        for profile_key, profile in ACTION_PROFILES.items():
            if len(actions) == 3:
                break
            if profile_key in used_profiles:
                continue
            actions.append(
                {
                    "id": f"{profile_key}_fallback",
                    "label": profile["label"],
                    "summary": self._default_action_texts(shock, rows)[len(actions)],
                    "estimated_cost_usd_millions": round(max(0.3, exposure * profile["cost_ratio"]), 1),
                    "lead_time_hours": profile["lead_time_hours"],
                    "risk_multiplier": profile["risk_multiplier"],
                    "stockout_days_delta": profile["stockout_days_delta"],
                    "confidence": round(float((scenario or {}).get("confidence", 0.72)), 2),
                }
            )

        return actions[:3]

    def build(self, shock: Dict[str, Any]) -> Dict[str, Any]:
        scenario = self._scenario_for_shock(shock)
        rows = self._risk_rows(shock)
        aggregate_risk = self._aggregate_risk(rows, shock)
        stockout_days = self._stockout_days(shock, rows, scenario)
        exposure = self._exposure(rows, shock)
        actions = self._actions(shock, scenario, rows, exposure)
        affected_drugs = shock.get("affected_drugs") or []
        if not affected_drugs and shock.get("province"):
            affected_drugs = self.graph_service.get_drugs_dependent_on_province(str(shock["province"]))[:8]

        return {
            "shock_id": shock.get("id"),
            "response_mode": shock.get("data_mode", "live"),
            "headline_metrics": {
                "aggregate_risk": aggregate_risk,
                "days_to_stockout": stockout_days,
                "at_risk_nodes": len(rows),
                "estimated_exposure_usd_millions": exposure,
                "affected_drugs_count": len(affected_drugs),
            },
            "war_room_summary": (scenario or {}).get("structured_plan", {}).get("summary") or shock.get("summary") or shock.get("title"),
            "patient_impact": (scenario or {}).get("patient_impact")
            or f"{len(affected_drugs)} tracked downstream inputs require active monitoring over the next {stockout_days} days.",
            "top_affected": rows,
            "action_options": actions,
            "evidence": self._evidence(shock, scenario),
            "generated_at": datetime.utcnow().isoformat(),
        }

    def simulate_action(self, shock: Dict[str, Any], action_id: str) -> Dict[str, Any]:
        war_room = self.build(shock)
        action = next((item for item in war_room["action_options"] if item["id"] == action_id), None)
        if action is None:
            raise KeyError(action_id)

        before = war_room["headline_metrics"]
        after_risk = round(max(5.0, before["aggregate_risk"] * action["risk_multiplier"]), 1)
        after_stockout = int(before["days_to_stockout"] + action["stockout_days_delta"])
        after_exposure = round(max(0.2, before["estimated_exposure_usd_millions"] * max(0.45, action["risk_multiplier"])), 1)

        top_affected = []
        for idx, row in enumerate(war_room["top_affected"][:5]):
            row_multiplier = min(0.92, action["risk_multiplier"] + (idx * 0.03))
            risk_after = round(max(3.0, row["risk_before"] * row_multiplier), 2)
            top_affected.append(
                {
                    **row,
                    "risk_after": risk_after,
                    "risk_delta": round(risk_after - row["risk_before"], 2),
                }
            )

        return {
            "shock_id": shock.get("id"),
            "action_id": action["id"],
            "action_label": action["label"],
            "response_mode": war_room["response_mode"],
            "before": before,
            "after": {
                "aggregate_risk": after_risk,
                "days_to_stockout": after_stockout,
                "estimated_exposure_usd_millions": after_exposure,
            },
            "delta": {
                "aggregate_risk": round(after_risk - before["aggregate_risk"], 1),
                "days_to_stockout": after_stockout - before["days_to_stockout"],
                "estimated_exposure_usd_millions": round(after_exposure - before["estimated_exposure_usd_millions"], 1),
            },
            "summary": (
                f"{action['label']} changes aggregate risk from {before['aggregate_risk']:.1f} to {after_risk:.1f} "
                f"and extends projected stockout from {before['days_to_stockout']} to {after_stockout} days."
            ),
            "top_affected": top_affected,
            "generated_at": datetime.utcnow().isoformat(),
        }
