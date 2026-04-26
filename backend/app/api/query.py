"""
Endpoints for natural language querying of the supply chain knowledge base.
"""

import logging
import unicodedata
from uuid import uuid4
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..deps import get_gemini_analyst
from ..services.gemini_analyst import GeminiAnalyst
from ..models.graph import QueryResponse

# Setup Logging
logger = logging.getLogger("backend.query")

router = APIRouter(prefix="/api/v1", tags=["query"])


class QueryRequest(BaseModel):
    """Request schema for the AI analyst query endpoint."""
    question: str = Field(..., max_length=500, description="The natural language question to ask the analyst")
    context_filters: dict = Field(default_factory=dict, description="Optional filters to narrow down the search context")


@router.post("/query", response_model=QueryResponse)
async def post_query(
    request: QueryRequest,
    analyst: Annotated[GeminiAnalyst, Depends(get_gemini_analyst)]
) -> QueryResponse:
    """
    Asks a natural language question to the PharmaShield AI Analyst.
    
    The analyst uses Retrieval-Augmented Generation (RAG) to ground its answers in 
    policy documents, current supply chain telemetry, and recent alerts.
    
    Example Question:
    "Which drugs are at risk if Hebei has a 2-week shutdown?"
    """
    request_id = str(uuid4())
    
    # 1. Normalize and validate question
    question = unicodedata.normalize("NFC", request.question.strip())
    
    if not question:
        raise HTTPException(status_code=422, detail="Question cannot be empty.")
        
    try:
        # 2. Call Analyst
        response = await analyst.answer(question, request.context_filters)
        
        # 3. Log results
        logger.info(
            f"[{request_id}] query='{question[:80]}...' "
            f"confidence={response.confidence:.2f} "
            f"citations={len(response.citations)}"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"[{request_id}] Error processing query: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "internal",
                "request_id": request_id,
                "message": "An unexpected error occurred while processing your query."
            }
        )
