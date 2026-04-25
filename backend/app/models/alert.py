"""
Models for supply chain alerts and early-warning notifications.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class AlertSeverity(str, Enum):
    """Severity levels for pharmaceutical supply chain alerts."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertSource(str, Enum):
    """Origin of the alert data."""
    HEBEI_EPB = "HEBEI_EPB"
    FDA_IMPORT_ALERT = "FDA_IMPORT_ALERT"
    FDA_WARNING_LETTER = "FDA_WARNING_LETTER"
    TRADE_ANOMALY = "TRADE_ANOMALY"
    NEWS = "NEWS"
    MANUAL = "MANUAL"


class Alert(BaseModel):
    """A specific alert regarding a potential supply chain disruption."""
    id: str = Field(..., description="Unique identifier for the alert")
    created_at: datetime = Field(..., description="Timestamp when the alert was generated")
    severity: AlertSeverity = Field(..., description="Impact severity of the alert")
    source: AlertSource = Field(..., description="The primary source that triggered this alert")
    source_url: Optional[str] = Field(None, description="URL to the original source document or evidence")
    summary: str = Field(..., description="Brief human-readable summary of the alert")
    affected_drugs: List[str] = Field(..., description="List of Drug IDs impacted by this alert")
    expected_weeks_to_shortage: Optional[int] = Field(None, description="Estimated time until clinical shortage is felt in India")
    gemini_explainer: str = Field(..., description="AI-generated detailed analysis of the alert's implications")
    evidence_snippet: Optional[str] = Field(None, description="Text snippet from the source providing direct evidence")


class AlertListResponse(BaseModel):
    """Paginated response containing a list of alerts."""
    alerts: List[Alert] = Field(..., description="The list of alerts for the requested page")
    total: int = Field(..., description="Total number of alerts available across all pages")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of alerts per page")
