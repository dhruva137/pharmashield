"""
Configuration management for the PharmaShield backend using Pydantic Settings.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings and environment variables.
    Defaults are provided where safe; sensitive keys must be provided in .env or environment.
    """
    # API Keys & Endpoints
    GEMINI_API_KEY: str = ""
    QDRANT_URL: str = ""
    QDRANT_API_KEY: str = ""
    
    # Project Info
    FIREBASE_PROJECT_ID: str = ""
    BACKEND_URL: str = "http://localhost:8080"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "https://pharmashield.web.app"
    ]
    
    # Paths
    SEED_DATA_DIR: str = "data/seed"
    GNN_WEIGHTS_PATH: str = "ml/weights/gnn_v1.pt"
    
    # Model & Database Configurations
    QDRANT_COLLECTION: str = "pharmashield_kb"
    GEMINI_FLASH_MODEL: str = "gemini-2.5-flash"
    GEMINI_PRO_MODEL: str = "gemini-2.5-pro"
    EMBEDDING_MODEL: str = "text-embedding-004"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


# Instantiate settings
try:
    settings = Settings()
    
    # Validation check for critical environment variables
    if not settings.GEMINI_API_KEY or not settings.QDRANT_URL:
        missing = []
        if not settings.GEMINI_API_KEY: missing.append("GEMINI_API_KEY")
        if not settings.QDRANT_URL: missing.append("QDRANT_URL")
        
        raise RuntimeError(
            f"❌ Missing critical configuration: {', '.join(missing)}. "
            "Please ensure these are set in your .env file."
        )
except Exception as e:
    # Re-raise if it's already our RuntimeError, otherwise wrap it
    if isinstance(e, RuntimeError):
        raise e
    raise RuntimeError(f"Failed to load application settings: {str(e)}")
