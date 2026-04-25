"""
Models for pharmaceutical drugs and their components in the supply chain.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class NLEMTier(str, Enum):
    """Tier classification based on the National List of Essential Medicines."""
    TIER_1 = "TIER_1"
    TIER_2 = "TIER_2"
    TIER_3 = "TIER_3"


class APINode(BaseModel):
    """Represents an Active Pharmaceutical Ingredient in the supply chain."""
    id: str = Field(..., description="Unique identifier for the API")
    name: str = Field(..., description="Common name of the API")
    china_share: float = Field(..., ge=0, le=1, description="Percentage of market share controlled by China (0-1)")
    primary_provinces: List[str] = Field(default_factory=list, description="Chinese provinces where this API is primarily produced")
    top_3_factories: List[str] = Field(default_factory=list, description="Top 3 manufacturing facilities for this API")
    monthly_import_value_usd_millions: float = Field(0.0, description="Average monthly import value to India in USD millions")


class KSMNode(BaseModel):
    """Represents a Key Starting Material used to synthesize APIs."""
    id: str = Field(..., description="Unique identifier for the KSM")
    name: str = Field(..., description="Name of the KSM")
    primary_country: str = Field(..., description="Main country of origin for this KSM")


class ProvinceNode(BaseModel):
    """Represents a geographic province involved in the supply chain."""
    id: str = Field(..., description="Unique identifier for the province")
    name: str = Field(..., description="Name of the province")
    country: str = Field(..., description="Country where the province is located")


class ManufacturerNode(BaseModel):
    """Represents a manufacturing company in the pharmaceutical network."""
    id: str = Field(..., description="Unique identifier for the manufacturer")
    name: str = Field(..., description="Legal name of the manufacturer")
    country: str = Field(..., description="Country where the manufacturer is headquartered")


class Drug(BaseModel):
    """Represents a finished pharmaceutical product (FPP)."""
    id: str = Field(..., description="Unique identifier for the drug")
    name: str = Field(..., description="Brand name or common name of the drug")
    generic_name: str = Field(..., description="International Nonproprietary Name (INN)")
    nlem_tier: NLEMTier = Field(..., description="NLEM criticality tier")
    patient_population_estimate: int = Field(..., description="Estimated number of patients in India dependent on this drug")
    primary_apis: List[str] = Field(..., description="List of IDs for APIs used in this drug")
    has_substitute: bool = Field(..., description="Whether therapeutic substitutes are readily available in India")
    therapeutic_class: str = Field(..., description="Medical category of the drug (e.g., Antibiotic, Cardiovascular)")
    criticality_score: Optional[float] = Field(None, description="System-calculated importance score (0-100)")
    current_risk: Optional[float] = Field(None, description="Real-time risk score based on supply chain alerts (0-1)")
