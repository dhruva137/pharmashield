"""
Dependency injection providers for the PharmaShield backend.
Uses cached singletons with lazy imports to prevent circular dependencies.
"""

from functools import lru_cache
import warnings
from .config import settings


@lru_cache()
def get_gemini():
    """Configures and returns the Google Generative AI module."""
    if not settings.GEMINI_API_KEY:
        return None
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", FutureWarning)
        import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai


@lru_cache()
def get_gemini_flash_client():
    """Returns a shared Flash-only Gemini client wrapper."""
    from .services.gemini_flash_client import GeminiFlashClient
    if not settings.GEMINI_API_KEY:
        return GeminiFlashClient(genai=None, model_name=settings.GEMINI_FLASH_MODEL)
    return GeminiFlashClient(
        genai=get_gemini(),
        model_name=settings.GEMINI_FLASH_MODEL,
    )


@lru_cache()
def get_qdrant():
    """Returns a singleton instance of the QdrantClient."""
    from qdrant_client import QdrantClient
    if not settings.QDRANT_URL:
        return QdrantClient(":memory:")
    return QdrantClient(
        url=settings.QDRANT_URL,
        api_key=settings.QDRANT_API_KEY,
    )


@lru_cache()
def get_data_loader():
    """Returns a singleton instance of the DataLoader."""
    from .data_loader import DataLoader
    return DataLoader(seed_dir=settings.SEED_DATA_DIR)


@lru_cache()
def get_graph_service():
    """Returns a singleton instance of the GraphService."""
    from .services.graph_service import GraphService
    data_loader = get_data_loader()
    if not data_loader.get_drugs():
        data_loader.load_all()
    return GraphService(data_loader=data_loader)


@lru_cache()
def get_demo_mode_service():
    """Returns a singleton instance of the curated demo-mode service."""
    from .services.demo_mode import DemoModeService
    data_loader = get_data_loader()
    if not data_loader.get_drugs():
        data_loader.load_all()
    return DemoModeService(
        data_loader=data_loader,
        graph_service=get_graph_service(),
    )


@lru_cache()
def get_war_room_service():
    """Returns a singleton instance of the war-room orchestration service."""
    from .services.war_room import WarRoomService
    return WarRoomService(
        graph_service=get_graph_service(),
        data_loader=get_data_loader(),
        demo_mode_service=get_demo_mode_service(),
    )


@lru_cache()
def get_retriever():
    """Returns a singleton instance of the Retriever."""
    from .services.retriever import Retriever
    return Retriever(
        qdrant_client=get_qdrant(),
        genai=get_gemini(),
        collection_name=settings.QDRANT_COLLECTION,
        data_loader=get_data_loader()
    )


@lru_cache()
def get_gnn():
    """Returns a singleton instance of the ShockPropagator (GNN)."""
    from .services.shock_propagation import ShockPropagator
    return ShockPropagator(
        weights_path=settings.GNN_WEIGHTS_PATH,
        graph_service=get_graph_service(),
        enable_gnn=settings.ENABLE_GNN,
    )


@lru_cache()
def get_gemini_analyst():
    """Returns a singleton instance of the GeminiAnalyst."""
    from .services.gemini_analyst import GeminiAnalyst
    return GeminiAnalyst(
        genai=get_gemini(),
        gemini_client=get_gemini_flash_client(),
        demo_mode_service=get_demo_mode_service(),
        retriever=get_retriever(),
        graph_service=get_graph_service(),
        data_loader=get_data_loader()
    )


# Alias used by simulate.py
def get_shock_propagator():
    """Alias for get_gnn — returns the ShockPropagator singleton."""
    return get_gnn()


@lru_cache()
def get_signal_intelligence():
    """Returns a singleton instance of the SignalIntelligence (Engine 1)."""
    from .services.signal_intelligence import SignalIntelligence
    if settings.GEMINI_API_KEY:
        return SignalIntelligence(
            genai=get_gemini(),
            gemini_client=get_gemini_flash_client(),
        )
    return SignalIntelligence(
        genai=None,
        gemini_client=get_gemini_flash_client(),
    )

