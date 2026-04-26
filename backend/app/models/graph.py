"""
Models for graph representation, simulations, and natural language queries.
"""

from datetime import datetime
from enum import Enum
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

from .drug import Drug


class NodeType(str, Enum):
    """Types of nodes in the supply chain knowledge graph."""
    DRUG = "drug"
    API = "api"
    INPUT = "input"
    KSM = "ksm"
    PROVINCE = "province"
    MANUFACTURER = "manufacturer"


class GraphNode(BaseModel):
    """A generic node in the supply chain graph."""
    id: str = Field(..., description="Unique identifier for the node")
    type: NodeType = Field(..., description="The classification of the node")
    name: str = Field(..., description="Display name of the node")
    attributes: Dict[str, Any] = Field(default_factory=dict, description="Metadata specific to the node type")


class GraphEdge(BaseModel):
    """A directed relationship between two nodes in the graph."""
    source: str = Field(..., description="ID of the source node")
    target: str = Field(..., description="ID of the target node")
    weight: float = Field(..., description="Numerical strength or importance of the connection")
    edge_type: str = Field(..., description="Type of relationship (e.g., 'MANUFACTURES', 'CONTAINS', 'LOCATED_IN')")


class StateRiskAggregate(BaseModel):
    """Aggregated risk data for an Indian state based on its healthcare needs."""
    state_id: str = Field(..., description="Unique identifier for the Indian state")
    state_name: str = Field(..., description="Name of the Indian state")
    risk_score: float = Field(..., description="Calculated supply chain risk score for this state (0-100)")
    top_at_risk_drugs: List[str] = Field(..., description="List of IDs for the most vulnerable drugs in this state")


class GraphResponse(BaseModel):
    """Full representation of the supply chain graph and associated risks."""
    nodes: List[GraphNode] = Field(..., description="All nodes in the current graph view")
    edges: List[GraphEdge] = Field(..., description="All relationships between nodes")
    state_risk_aggregates: List[StateRiskAggregate] = Field(..., description="Geospatial risk breakdown for India")
    generated_at: datetime = Field(..., description="Timestamp when this graph snapshot was computed")


class SimulationRequest(BaseModel):
    """Parameters for running a supply chain shock simulation."""
    province: str = Field(..., description="The Chinese province experiencing a lockdown or disruption")
    duration_days: int = Field(default=30, ge=1, le=180, description="Duration of the simulated disruption in days")
    severity: str = Field(..., description="Intensity of the disruption (e.g., 'TOTAL_LOCKDOWN', 'PARTIAL_RESTRICTION')")


class SimulationResult(BaseModel):
    """Output analysis of a supply chain shock simulation."""
    affected_drugs: List[Drug] = Field(..., description="List of drugs whose supply is compromised in this scenario")
    propagation_explanation: str = Field(..., description="AI-generated explanation of how the shock propagates through the network")
    simulated_at: datetime = Field(..., description="Timestamp when the simulation was executed")


class QueryRequest(BaseModel):
    """A natural language query request for the AI analyst."""
    question: str = Field(..., max_length=500, description="The user's question about supply chain dependencies")
    context_filters: Optional[Dict[str, Any]] = Field(None, description="Optional filters to restrict the search context")


class Citation(BaseModel):
    """Reference to a data source used to generate an AI answer."""
    source: str = Field(..., description="Name of the source document or database")
    snippet: str = Field(..., description="Relevant text snippet from the source")
    url: Optional[str] = Field(None, description="Link to the source material")


class QueryResponse(BaseModel):
    """AI-generated answer with citations and suggestions."""
    answer: str = Field(..., description="The generated natural language answer")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score of the AI in its answer")
    citations: List[Citation] = Field(..., description="Supporting evidence for the answer")
    suggested_drugs_to_inspect: List[str] = Field(..., description="List of drug IDs relevant to the query for further drill-down")
    response_mode: str = Field(default="live", description="Indicates whether the response came from live or demo mode")
    matched_scenarios: List[str] = Field(default_factory=list, description="Matched curated scenarios in demo mode")
