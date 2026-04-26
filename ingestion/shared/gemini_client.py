"""
Google Gemini API client wrapper for structured extraction and text generation.
"""

import os
import logging
import json
import time
from typing import List, Dict, Any, Optional, Union
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

import google.generativeai as genai
from google.api_core import exceptions

# Setup Logging
logger = logging.getLogger("ingestion.gemini")


class GeminiClient:
    """
    Wrapper for Gemini Pro/Flash models providing structured JSON extraction,
    translation, and embedding capabilities.
    """

    def __init__(self, api_key: str):
        """Initializes the Gemini module with the provided API key."""
        if not api_key:
            logger.warning("GEMINI_API_KEY is empty. API calls will fail.")
        genai.configure(api_key=api_key)
        self.api_key = api_key

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((exceptions.ResourceExhausted, exceptions.InternalServerError, exceptions.ServiceUnavailable))
    )
    def generate_structured(
        self, 
        prompt: str, 
        response_schema: dict, 
        model_name: str = "gemini-2.5-flash", 
        temperature: float = 0.2
    ) -> dict:
        """
        Calls Gemini to generate a structured JSON response matching the provided schema.
        """
        logger.debug(f"Generating structured data. Prompt snippet: {prompt[:200]}...")
        
        model = genai.GenerativeModel(model_name)
        
        # Configure model for JSON response
        generation_config = {
            "response_mime_type": "application/json",
            "response_schema": response_schema,
            "temperature": temperature
        }
        
        response = model.generate_content(prompt, generation_config=generation_config)
        
        try:
            return json.loads(response.text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini JSON response: {response.text}")
            raise e

    def translate_zh_to_en(self, mandarin_text: str) -> str:
        """Translates Mandarin text to English using a simple prompt."""
        prompt = f"Translate the following Chinese text to English:\n\n{mandarin_text}"
        return self.generate_text(prompt)

    def embed(self, texts: Union[str, List[str]], model: str = "models/text-embedding-004") -> List[List[float]]:
        """
        Generates vector embeddings for the provided text(s).
        Returns a list of vectors.
        """
        if isinstance(texts, str):
            texts = [texts]
            
        result = genai.embed_content(
            model=model,
            content=texts,
            task_type="retrieval_document"
        )
        
        # Result is {'embedding': [[...], [...]]}
        return result["embedding"]

    def generate_text(self, prompt: str, model_name: str = "gemini-2.5-flash") -> str:
        """Generates plain text from a prompt."""
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        return response.text


# Global instance
gemini = GeminiClient(api_key=os.getenv("GEMINI_API_KEY", ""))
