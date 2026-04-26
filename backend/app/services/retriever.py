"""
Service for vector-based search and retrieval using Qdrant and Gemini embeddings.
"""

import atexit
import logging
import hashlib
import re
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from functools import partial
from typing import List, Dict, Optional, Any
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from qdrant_client.models import PointStruct

from ..models.graph import Citation
from ..data_loader import DataLoader

# Setup Logging
logger = logging.getLogger("backend.retriever")


class Retriever:
    """
    Handles knowledge retrieval from Qdrant vector store.
    Uses Gemini text-embedding-004 for semantic mapping.
    """

    def __init__(
        self, 
        qdrant_client: QdrantClient, 
        genai: Any, 
        collection_name: str, 
        data_loader: DataLoader
    ):
        self.qdrant = qdrant_client
        self.genai = genai
        self.collection_name = collection_name
        self.data_loader = data_loader
        from ..config import settings
        self.embedding_model = settings.EMBEDDING_MODEL
        self._enabled = bool(settings.GEMINI_API_KEY and settings.QDRANT_URL)
        self.request_timeout_seconds = 3
        self._executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="retriever")
        atexit.register(self.close)

    VECTOR_SIZE = 3072  # gemini-embedding-001 output dimensions

    def _run_with_timeout(self, func, *args, timeout: Optional[int] = None, **kwargs):
        future = self._executor.submit(partial(func, *args, **kwargs))
        try:
            return future.result(timeout=timeout or self.request_timeout_seconds)
        except FutureTimeout as exc:
            future.cancel()
            raise TimeoutError(f"Retriever operation timed out after {timeout or self.request_timeout_seconds}s") from exc

    @staticmethod
    def _tokenize(text: str) -> set[str]:
        return set(re.findall(r"[a-z0-9_]+", (text or "").lower()))

    def _keyword_fallback_search(self, query: str, top_k: int = 5) -> List[Citation]:
        """Local lexical fallback so RAG still works when Qdrant or embeddings are unavailable."""
        tokens = self._tokenize(query)
        query_lower = (query or "").lower()
        ranked = []

        for snippet in self.data_loader.get_policy_snippets():
            source = str(snippet.get("source", "Unknown"))
            text = str(snippet.get("text", ""))
            keywords = [str(item).lower() for item in snippet.get("keywords", [])]
            haystack = f"{source} {text} {' '.join(keywords)}".lower()

            score = 0
            for keyword in keywords:
                if keyword and keyword in query_lower:
                    score += 4
            for token in tokens:
                if token and token in haystack:
                    score += 1

            if score > 0:
                ranked.append((score, snippet))

        if not ranked:
            ranked = [(0, snippet) for snippet in self.data_loader.get_policy_snippets()[:top_k]]

        ranked.sort(key=lambda item: item[0], reverse=True)
        citations = []
        seen = set()
        for _, snippet in ranked:
            key = (
                str(snippet.get("source", "")),
                str(snippet.get("source_url", "")),
                str(snippet.get("text", ""))[:100],
            )
            if key in seen:
                continue
            seen.add(key)
            citations.append(
                Citation(
                    source=str(snippet.get("source", "Unknown")),
                    snippet=str(snippet.get("text", ""))[:300],
                    url=snippet.get("source_url"),
                )
            )
            if len(citations) >= top_k:
                break
        return citations

    @staticmethod
    def _dedupe_citations(items: List[Citation], top_k: int) -> List[Citation]:
        deduped: List[Citation] = []
        seen = set()
        for item in items:
            key = (item.source, item.url or "", item.snippet[:100])
            if key in seen:
                continue
            seen.add(key)
            deduped.append(item)
            if len(deduped) >= top_k:
                break
        return deduped

    def ensure_collection(self) -> None:
        """
        Idempotent creation of the vector collection.
        Recreates if vector dimensions changed. Populates from seed if empty.
        """
        if not self._enabled:
            logger.info("Retriever disabled (missing GEMINI_API_KEY or QDRANT_URL).")
            return
        try:
            if self.qdrant.collection_exists(self.collection_name):
                info = self.qdrant.get_collection(self.collection_name)
                existing_size = info.config.params.vectors.size
                if existing_size != self.VECTOR_SIZE:
                    logger.info(
                        f"Vector size mismatch ({existing_size} vs {self.VECTOR_SIZE}). "
                        "Recreating collection."
                    )
                    self.qdrant.delete_collection(self.collection_name)
                else:
                    if info.points_count == 0:
                        logger.info("Collection is empty. Populating from policy snippets...")
                        self._populate_from_seed()
                    return

            logger.info(f"Creating Qdrant collection: {self.collection_name} (size={self.VECTOR_SIZE})")
            self.qdrant.create_collection(
                collection_name=self.collection_name,
                vectors_config=qmodels.VectorParams(
                    size=self.VECTOR_SIZE,
                    distance=qmodels.Distance.COSINE
                )
            )
            logger.info("Populating from policy snippets...")
            self._populate_from_seed()

        except Exception as e:
            logger.error(f"Error ensuring Qdrant collection: {e}")

    @retry(
        stop=stop_after_attempt(1),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(Exception)
    )
    def embed_text(self, text: str) -> List[float]:
        """Generates a single vector embedding for the given text."""
        if not self._enabled:
            raise RuntimeError("Retriever disabled")
        result = self._run_with_timeout(
            self.genai.embed_content,
            model=self.embedding_model,
            content=text,
        )
        return result["embedding"]

    def embed_batch(self, texts: List[str], batch_size: int = 50) -> List[List[float]]:
        """Generates embeddings for a batch of texts."""
        if not self._enabled:
            raise RuntimeError("Retriever disabled")
        embeddings = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            result = self._run_with_timeout(
                self.genai.embed_content,
                model=self.embedding_model,
                content=batch,
            )
            embeddings.extend(result["embedding"])
        return embeddings

    def _populate_from_seed(self) -> None:
        """Embeds and upserts policy snippets from the data loader into Qdrant."""
        if not self._enabled:
            return
        snippets = self.data_loader.get_policy_snippets()
        if not snippets:
            logger.warning("No policy snippets found to populate retriever.")
            return

        texts = [s.get("text", "") for s in snippets]
        embeddings = self.embed_batch(texts)

        points = []
        for i, snippet in enumerate(snippets):
            s_id = snippet.get("id", str(i))
            # Consistent hash for ID
            point_id = int(hashlib.sha256(s_id.encode()).hexdigest()[:16], 16)
            
            points.append(PointStruct(
                id=point_id,
                vector=embeddings[i],
                payload={
                    "id": s_id,
                    "source": snippet.get("source"),
                    "source_url": snippet.get("source_url"),
                    "text": snippet.get("text"),
                    "keywords": snippet.get("keywords", [])
                }
            ))

        self.qdrant.upsert(
            collection_name=self.collection_name,
            points=points
        )
        logger.info(f"Successfully indexed {len(points)} snippets.")

    def search(
        self, 
        query: str, 
        top_k: int = 5, 
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Citation]:
        """
        Performs a semantic search against the vector store.
        Returns a list of Citation models.
        """
        if not self._enabled:
            return self._keyword_fallback_search(query, top_k)
        try:
            vector = self.embed_text(query)
            hits = self._run_with_timeout(
                self.qdrant.search,
                collection_name=self.collection_name,
                query_vector=vector,
                limit=top_k,
            )

            citations = []
            for hit in hits:
                p = hit.payload
                citations.append(Citation(
                    source=p.get("source", "Unknown"),
                    snippet=p.get("text", "")[:300], # Keep snippets concise
                    url=p.get("source_url")
                ))
            fallback = self._keyword_fallback_search(query, top_k)
            return self._dedupe_citations(citations + fallback, top_k)
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return self._keyword_fallback_search(query, top_k)

    def close(self) -> None:
        try:
            self._executor.shutdown(wait=False, cancel_futures=True)
        except Exception:
            pass
