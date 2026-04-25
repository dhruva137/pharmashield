"""
Dependency injection providers for the PharmaShield backend.
Uses cached singletons with lazy imports to prevent circular dependencies.
"""

from functools import lru_cache
from .config import settings


@lru_cache()
def get_gemini():
    """Configures and returns the Google Generative AI module."""
    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai


@lru_cache()
def get_qdrant():
    """Returns a singleton instance of the QdrantClient."""
    from qdrant_client import QdrantClient
    return QdrantClient(
        url=settings.QDRANT_URL,
        api_key=settings.QDRANT_API_KEY
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
    return GraphService(data_loader=get_data_loader())


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
        graph_service=get_graph_service()
    )


@lru_cache()
def get_gemini_analyst():
    """Returns a singleton instance of the GeminiAnalyst."""
    from .services.gemini_analyst import GeminiAnalyst
    return GeminiAnalyst(
        genai=get_gemini(),
        retriever=get_retriever(),
        graph_service=get_graph_service(),
        data_loader=get_data_loader()
    )
