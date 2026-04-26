import pytest
from app.services.criticality import compute_score, compute_breakdown
from app.models.drug import Drug, NLEMTier

@pytest.fixture
def drug_factory():
    def _create_drug(
        id="test-drug",
        name="Test Drug",
        generic_name="Generic",
        nlem_tier=NLEMTier.TIER_1,
        patient_population_estimate=1000000,
        primary_apis=None,
        has_substitute=True,
        therapeutic_class="Analgesic"
    ):
        return Drug(
            id=id,
            name=name,
            generic_name=generic_name,
            nlem_tier=nlem_tier,
            patient_population_estimate=patient_population_estimate,
            primary_apis=primary_apis or [],
            has_substitute=has_substitute,
            therapeutic_class=therapeutic_class
        )
    return _create_drug

def test_tier_1_monopoly_high_pop_no_substitute_in_high_range(drug_factory):
    # Paracetamol-like scenario: Tier 1, 200M pop, Monopoly (10000 HHI), No substitute
    drug = drug_factory(
        nlem_tier=NLEMTier.TIER_1,
        patient_population_estimate=200_000_000,
        has_substitute=False
    )
    score = compute_score(drug, 10000)
    # Expected: 75 (tier) * 1.5 (hhi) * (0.7 + 0.3 * 1.0) (pop) * 1.2 (sub) = 75 * 1.5 * 1.0 * 1.2 = 135
    # Clamped at 100
    assert 85 <= score <= 100

def test_tier_3_diversified_substitute(drug_factory):
    # Specialized drug: Tier 3, 10k pop, Diversified (1000 HHI), Has substitute
    drug = drug_factory(
        nlem_tier=NLEMTier.TIER_3,
        patient_population_estimate=10_000,
        has_substitute=True
    )
    score = compute_score(drug, 1000)
    # Expected: 25 * 1.05 * (0.7 + 0.3 * 0.5) * 1.0 = 25 * 1.05 * 0.85 = 22.3
    assert 15 <= score <= 35

def test_zero_population_handled(drug_factory):
    drug = drug_factory(patient_population_estimate=0)
    score = compute_score(drug, 5000)
    assert isinstance(score, float)
    assert score > 0

def test_hhi_above_10000_clamped(drug_factory):
    drug = drug_factory()
    score_10k = compute_score(drug, 10000)
    score_15k = compute_score(drug, 15000)
    assert score_10k == score_15k

def test_invalid_tier_raises(drug_factory):
    drug = drug_factory()
    # Manually bypass pydantic validation for testing logic in service
    drug.nlem_tier = type('Enum', (), {'value': 'INVALID'})
    with pytest.raises(ValueError, match="Invalid NLEM tier"):
        compute_score(drug, 5000)

def test_breakdown_keys(drug_factory):
    drug = drug_factory()
    breakdown = compute_breakdown(drug, 5000)
    expected_keys = {
        "nlem_tier_score", 
        "hhi_multiplier", 
        "population_factor", 
        "substitute_penalty", 
        "final_score"
    }
    assert set(breakdown.keys()) == expected_keys
