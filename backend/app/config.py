"""
Configuration management for the PharmaShield backend using Pydantic Settings.
"""

import json
import logging
from pathlib import Path
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _discover_base_dir() -> Path:
    """
    Find the project base directory by looking for bundled seed data.

    Local development usually has ``repo_root/data``.
    Backend-only serverless deployments use ``backend/data``.
    """
    config_path = Path(__file__).resolve()

    for candidate in reversed(config_path.parents):
        if (candidate / "data" / "seed" / "drugs.json").exists():
            return candidate

    # Fallback to the backend root if no data bundle is found yet.
    return config_path.parent.parent


BASE_DIR = _discover_base_dir()


class Settings(BaseSettings):
    """
    Application settings and environment variables.
    Defaults are provided where safe; sensitive keys must be provided in .env or environment.
    """

    # API Keys & Endpoints
    GEMINI_API_KEY: str = ""
    QDRANT_URL: str = ""
    QDRANT_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: str = ""

    # Project Info
    FIREBASE_PROJECT_ID: str = ""
    BACKEND_URL: str = "http://localhost:8080"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "https://pharmashield.web.app",
    ]

    # Paths
    SEED_DATA_DIR: str = str(BASE_DIR / "data" / "seed")
    GNN_WEIGHTS_PATH: str = str(BASE_DIR / "ml" / "weights" / "gnn_v1.pt")
    ENABLE_GNN: bool = False
    DEMO_MODE: bool = True
    DEMO_SCENARIOS_PATH: str = str(BASE_DIR / "data" / "seed" / "demo_scenarios.json")

    # Model & Database Configurations
    QDRANT_COLLECTION: str = "pharmashield_kb"
    GEMINI_FLASH_MODEL: str = "gemini-2.0-flash"
    GEMINI_PRO_MODEL: str = "gemini-2.5-pro"
    EMBEDDING_MODEL: str = "models/gemini-embedding-001"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value):
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return []
            if text.startswith("["):
                try:
                    parsed = json.loads(text)
                except json.JSONDecodeError:
                    parsed = None
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
            return [item.strip() for item in text.split(",") if item.strip()]
        return value

    model_config = SettingsConfigDict(
        env_file=(
            BASE_DIR / "backend" / ".env",
            BASE_DIR / ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )


try:
    settings = Settings()

    if not settings.GEMINI_API_KEY or not settings.QDRANT_URL:
        missing = []
        if not settings.GEMINI_API_KEY:
            missing.append("GEMINI_API_KEY")
        if not settings.QDRANT_URL:
            missing.append("QDRANT_URL")

        logging.warning(
            "Missing non-critical configuration: %s. Some features may be disabled.",
            ", ".join(missing),
        )
except Exception as e:
    if isinstance(e, RuntimeError):
        raise e
    raise RuntimeError(f"Failed to load application settings: {str(e)}")
