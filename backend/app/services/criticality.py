"""
Enhanced Criticality Scoring Engine.

Implements the multi-factor criticality formula:

  C_i = α·HHI_i + β·(1 - S_i) + γ·(1/B_i) + δ·P_i

Where:
  HHI_i = Herfindahl-Hirschman Index (supplier concentration, 0-1)
  S_i   = Substitutability score (0-1)
  B_i   = Buffer stock in days
  P_i   = NLEM / strategic priority weight
  α,β,γ,δ = 0.35, 0.25, 0.25, 0.15 (tunable weights)

When combined with live shock data:
  R_i = C_i × (1 + λ × ShockSeverity_i)
"""

import math
from typing import Dict, Any, Optional
from ..models.drug import Drug


# ─── Configuration ───────────────────────────────────────────────────────────
CRITICALITY_CONFIG = {
    "tier_base_scores": {"TIER_1": 75, "TIER_2": 50, "TIER_3": 25},
    "hhi_max_multiplier": 1.5,
    "hhi_normalizer": 10000,
    "population_log_divisor": 8,
    "no_substitute_penalty": 1.2,
    "score_max": 100.0,
}

# Multi-factor weights (tunable)
WEIGHTS = {
    "alpha": 0.35,  # HHI concentration
    "beta":  0.25,  # Non-substitutability
    "gamma": 0.25,  # Buffer vulnerability
    "delta": 0.15,  # Strategic priority
}

# Shock amplification factor
LAMBDA_SHOCK = 0.8


def clamp(value: float, min_val: float, max_val: float) -> float:
    """Helper to clamp a value between a minimum and maximum."""
    return max(min_val, min(value, max_val))


# ─── Legacy Scoring (preserved for backward compatibility) ───────────────────

def compute_score(drug: Drug, supplier_hhi: float) -> float:
    """
    Computes a weighted criticality score (0-100) for a drug.

    Factors considered:
    1. NLEM Tier (Base score)
    2. Geographic Concentration (HHI multiplier)
    3. Patient Population (Log-scaled factor)
    4. Substitution Availability (Penalty factor)
    """
    tier_val = drug.nlem_tier.value
    if tier_val not in CRITICALITY_CONFIG["tier_base_scores"]:
        raise ValueError(f"Invalid NLEM tier: {tier_val}")

    base = CRITICALITY_CONFIG["tier_base_scores"][tier_val]

    # HHI Multiplier: Scales from 1.0 (perfectly diversified) to 1.5 (monopoly)
    hhi_clamped = clamp(supplier_hhi, 0, CRITICALITY_CONFIG["hhi_normalizer"])
    hhi_mult = 1.0 + (hhi_clamped / CRITICALITY_CONFIG["hhi_normalizer"]) * 0.5
    hhi_mult = min(CRITICALITY_CONFIG["hhi_max_multiplier"], hhi_mult)

    # Population factor: Scales based on log10 of patients (clamped at 10^8)
    pop_count = max(1000, drug.patient_population_estimate)
    pop_factor = min(1.0, math.log10(pop_count) / CRITICALITY_CONFIG["population_log_divisor"])

    # Substitute penalty: 20% increase if no substitute available
    no_sub = CRITICALITY_CONFIG["no_substitute_penalty"] if not drug.has_substitute else 1.0

    # Final aggregation: Weighted by tier and scaled by pop/sub
    # 0.7 + 0.3 * pop_factor ensures even small populations have a baseline impact weight
    final = base * hhi_mult * (0.7 + 0.3 * pop_factor) * no_sub

    return float(clamp(final, 0.0, CRITICALITY_CONFIG["score_max"]))


def compute_breakdown(drug: Drug, supplier_hhi: float) -> Dict[str, float]:
    """
    Returns the individual components of the criticality calculation for visualization.
    """
    tier_val = drug.nlem_tier.value
    if tier_val not in CRITICALITY_CONFIG["tier_base_scores"]:
        raise ValueError(f"Invalid NLEM tier: {tier_val}")

    base = CRITICALITY_CONFIG["tier_base_scores"][tier_val]
    hhi_clamped = clamp(supplier_hhi, 0, CRITICALITY_CONFIG["hhi_normalizer"])
    hhi_mult = 1.0 + (hhi_clamped / CRITICALITY_CONFIG["hhi_normalizer"]) * 0.5

    pop_count = max(1000, drug.patient_population_estimate)
    pop_factor = min(1.0, math.log10(pop_count) / CRITICALITY_CONFIG["population_log_divisor"])

    no_sub = CRITICALITY_CONFIG["no_substitute_penalty"] if not drug.has_substitute else 1.0

    return {
        "nlem_tier_score": float(base),
        "hhi_multiplier": float(hhi_mult),
        "population_factor": float(pop_factor),
        "substitute_penalty": float(no_sub),
        "final_score": compute_score(drug, supplier_hhi),
    }


# ─── New: Multi-Factor Criticality Score ─────────────────────────────────────

def compute_multifactor_criticality(
    hhi_normalized: float,
    substitutability: float,
    buffer_days: int,
    strategic_priority: float,
) -> Dict[str, float]:
    """
    Computes the new multi-factor criticality score:

      C_i = α·HHI_i + β·(1 - S_i) + γ·(1/B_i) + δ·P_i

    Args:
        hhi_normalized: HHI on 0-1 scale (divide raw HHI by 10000)
        substitutability: How replaceable is this input (0=no alternatives, 1=many)
        buffer_days: Days of inventory/stockpile
        strategic_priority: NLEM/strategic weight (0-1, where 1=critical)

    Returns:
        Dict with score and component breakdown
    """
    hhi_component = WEIGHTS["alpha"] * clamp(hhi_normalized, 0, 1)
    sub_component = WEIGHTS["beta"] * (1.0 - clamp(substitutability, 0, 1))
    buf_component = WEIGHTS["gamma"] * (1.0 / max(1, buffer_days))
    pri_component = WEIGHTS["delta"] * clamp(strategic_priority, 0, 1)

    raw_score = hhi_component + sub_component + buf_component + pri_component

    # Normalize to 0-100 scale
    # Max possible raw score ≈ 0.35 + 0.25 + 0.25 + 0.15 = 1.0
    normalized_score = clamp(raw_score * 100, 0, 100)

    return {
        "criticality_score": round(normalized_score, 2),
        "components": {
            "hhi_concentration": round(hhi_component * 100, 2),
            "non_substitutability": round(sub_component * 100, 2),
            "buffer_vulnerability": round(buf_component * 100, 2),
            "strategic_priority": round(pri_component * 100, 2),
        },
        "weights": WEIGHTS,
    }


def compute_live_risk(
    criticality_score: float,
    shock_severity: float = 0.0,
) -> float:
    """
    Combines static criticality with live shock severity:

      R_i = C_i × (1 + λ × ShockSeverity_i)

    Args:
        criticality_score: Static criticality (0-100)
        shock_severity: Live shock severity (0-1)

    Returns:
        Final risk score (0-100)
    """
    return clamp(
        criticality_score * (1 + LAMBDA_SHOCK * clamp(shock_severity, 0, 1)),
        0,
        100,
    )


def compute_node_criticality(
    graph_service: Any,
    node_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Computes the full multi-factor criticality for any node in the graph.
    Works for drugs, APIs, and rare earth inputs.
    """
    node = graph_service.get_node(node_id)
    if not node:
        return None

    attrs = node.get("attributes", {})
    node_type = node.get("type", "")

    # Compute HHI (normalized to 0-1)
    if node_type == "drug":
        raw_hhi = graph_service.compute_concentration_hhi(node_id)
        hhi_normalized = raw_hhi / 10000.0
    elif node_type in ("api", "input"):
        hhi_normalized = attrs.get("china_share", 0.5)
    else:
        hhi_normalized = 0

    substitutability = attrs.get("substitutability", 0.3)
    buffer_days = attrs.get("buffer_days", 15)
    strategic_priority = attrs.get("strategic_priority", 0.5)

    result = compute_multifactor_criticality(
        hhi_normalized=hhi_normalized,
        substitutability=substitutability,
        buffer_days=buffer_days,
        strategic_priority=strategic_priority,
    )

    # Add node context
    result["node_id"] = node_id
    result["node_name"] = node.get("name", node_id)
    result["node_type"] = node_type

    # Add community info
    community_id = graph_service.get_node_community(node_id)
    if community_id is not None:
        result["community_id"] = community_id

    return result
