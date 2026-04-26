"""
Service for loading seed data from JSON files and providing in-memory access.
"""

import json
import logging
import os
from typing import List, Dict, Any, Optional
from .models.drug import Drug, APINode
from .models.alert import Alert, AlertSeverity
from .models.graph import GraphEdge

logger = logging.getLogger(__name__)


class DataLoader:
    """
    Handles the ingestion and validation of seed data files.
    Serves as the primary in-memory data store for the application.
    """

    def __init__(self, seed_dir: str):
        self.seed_dir = seed_dir
        self._drugs: List[Drug] = []
        self._apis: List[APINode] = []
        self._dependencies: List[GraphEdge] = []
        self._alerts: List[Alert] = []
        self._epb_notices: List[Dict[str, Any]] = []
        self._fda_alerts: List[Dict[str, Any]] = []
        self._historical_disruptions: List[Dict[str, Any]] = []
        self._policy_snippets: List[Dict[str, Any]] = []

    def _load_json(self, filename: str) -> Any:
        """Helper to load a JSON file from the seed directory."""
        path = os.path.join(self.seed_dir, filename)
        if not os.path.exists(path):
            raise RuntimeError(f"Required seed file missing: {path}")
        
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Failed to parse JSON file {path}: {str(e)}")

    def load_all(self):
        """
        Loads all required seed files into memory and validates them against Pydantic models.
        This should be called during application startup.
        """
        # Load and validate models
        self._drugs = [Drug(**item) for item in self._load_json("drugs.json")]
        self._apis = [APINode(**item) for item in self._load_json("apis.json")]
        self._dependencies = [GraphEdge(**item) for item in self._load_json("dependencies.json")]
        self._alerts = [Alert(**item) for item in self._load_json("alerts.json")]

        # Load raw data dictionaries
        self._epb_notices = self._load_json("epb_notices.json")
        self._fda_alerts = self._load_json("fda_alerts.json")
        self._historical_disruptions = self._load_json("historical_disruptions.json")
        self._policy_snippets = self._load_json("policy_snippets.json")

        logger.info(
            f"🚀 Loaded {len(self._drugs)} drugs, {len(self._apis)} APIs, "
            f"{len(self._dependencies)} edges, {len(self._alerts)} alerts, "
            f"{len(self._policy_snippets)} policy snippets."
        )

    def get_drugs(self) -> List[Drug]:
        """Returns the full list of drugs."""
        return self._drugs

    def get_drug(self, drug_id: str) -> Optional[Drug]:
        """Returns a specific drug by its ID."""
        return next((d for d in self._drugs if d.id == drug_id), None)

    def get_apis(self) -> List[APINode]:
        """Returns the full list of API nodes."""
        return self._apis

    def get_dependencies(self) -> List[GraphEdge]:
        """Returns the full list of graph edges (dependencies)."""
        return self._dependencies

    def get_alerts(
        self, 
        severity: Optional[AlertSeverity] = None, 
        drug_id: Optional[str] = None, 
        limit: int = 50, 
        offset: int = 0
    ) -> List[Alert]:
        """
        Filters and returns alerts with optional severity and drug filtering.
        Supports pagination via limit and offset.
        """
        filtered = self._alerts
        
        if severity:
            filtered = [a for a in filtered if a.severity == severity]
        
        if drug_id:
            filtered = [a for a in filtered if drug_id in a.affected_drugs]
            
        return filtered[offset : offset + limit]

    def get_alert(self, alert_id: str) -> Optional[Alert]:
        """Returns a specific alert by its ID."""
        return next((a for a in self._alerts if a.id == alert_id), None)

    def get_policy_snippets(self) -> List[Dict[str, Any]]:
        """Returns the list of parsed policy snippets."""
        return self._policy_snippets

    def get_historical_disruptions(self) -> List[Dict[str, Any]]:
        """Returns historical disruption event logs."""
        return self._historical_disruptions

    def get_epb_notices(self) -> List[Dict[str, Any]]:
        """Returns raw Hebei EPB notices."""
        return self._epb_notices

    def get_fda_alerts(self) -> List[Dict[str, Any]]:
        """Returns raw FDA import/warning alerts."""
        return self._fda_alerts
