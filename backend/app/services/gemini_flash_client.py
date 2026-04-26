"""
Flash-only Gemini wrapper with retries, caching, schema ordering, and fast failover.
"""

from __future__ import annotations

import atexit
import copy
import hashlib
import json
import logging
import re
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger("shockmap.gemini_flash")


class GeminiFlashClient:
    """
    Centralized Gemini client for Flash-only generation paths.

    Notes:
    - Uses a short execution timeout so the app degrades quickly instead of hanging.
    - Adds property ordering to JSON schema objects for more stable structured output.
    """

    def __init__(
        self,
        genai: Any = None,
        model_name: str = "gemini-2.0-flash",
        cache_ttl_seconds: int = 1800,
        request_timeout_seconds: int = 4,
    ):
        self.genai = genai
        self.model_name = model_name
        self.cache_ttl_seconds = cache_ttl_seconds
        self.request_timeout_seconds = request_timeout_seconds
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._model_cache: Dict[str, Any] = {}
        self._executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="gemini_flash")
        atexit.register(self.close)

    def is_available(self) -> bool:
        return self.genai is not None

    def _make_cache_key(self, namespace: str, payload: Dict[str, Any]) -> str:
        blob = json.dumps(payload, sort_keys=True, default=str)
        return f"{namespace}:{hashlib.sha256(blob.encode('utf-8')).hexdigest()}"

    def _get_cached(self, key: str) -> Optional[Any]:
        entry = self._cache.get(key)
        if not entry:
            return None
        if entry["expiry"] <= datetime.now():
            self._cache.pop(key, None)
            return None
        return copy.deepcopy(entry["value"])

    def _set_cached(self, key: str, value: Any) -> None:
        self._cache[key] = {
            "value": copy.deepcopy(value),
            "expiry": datetime.now() + timedelta(seconds=self.cache_ttl_seconds),
        }

    def _coerce_json(self, raw_text: str) -> Dict[str, Any]:
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        try:
            data = json.loads(cleaned)
            if isinstance(data, dict):
                return data
        except Exception:
            pass

        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if match:
            data = json.loads(match.group(0))
            if isinstance(data, dict):
                return data

        raise ValueError("Gemini response is not valid JSON object")

    def _normalize_schema(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively normalize nested schema objects for the current SDK."""
        normalized = copy.deepcopy(schema)
        schema_type = normalized.get("type")
        if schema_type == "object":
            properties = normalized.get("properties", {}) or {}
            normalized["properties"] = {
                key: self._normalize_schema(value) if isinstance(value, dict) else value
                for key, value in properties.items()
            }
        elif schema_type == "array" and isinstance(normalized.get("items"), dict):
            normalized["items"] = self._normalize_schema(normalized["items"])
        return normalized

    def close(self) -> None:
        try:
            self._executor.shutdown(wait=False, cancel_futures=True)
        except Exception:
            pass

    def _get_model(self, system_instruction: Optional[str]) -> Any:
        if not self.is_available():
            raise RuntimeError("Gemini unavailable")

        key = system_instruction or "__default__"
        if key in self._model_cache:
            return self._model_cache[key]

        if system_instruction:
            model = self.genai.GenerativeModel(
                self.model_name,
                system_instruction=system_instruction,
            )
        else:
            model = self.genai.GenerativeModel(self.model_name)
        self._model_cache[key] = model
        return model

    def _invoke_model(
        self,
        prompt: str,
        generation_config: Dict[str, Any],
        system_instruction: Optional[str] = None,
    ) -> Any:
        model = self._get_model(system_instruction=system_instruction)
        return model.generate_content(prompt, generation_config=generation_config)

    @retry(stop=stop_after_attempt(1), wait=wait_exponential(multiplier=1, min=1, max=4), reraise=True)
    def _generate(
        self,
        prompt: str,
        generation_config: Dict[str, Any],
        system_instruction: Optional[str] = None,
    ) -> Any:
        future = self._executor.submit(
            self._invoke_model,
            prompt,
            generation_config,
            system_instruction,
        )
        try:
            return future.result(timeout=self.request_timeout_seconds)
        except FutureTimeout as exc:
            future.cancel()
            raise TimeoutError(f"Gemini request timed out after {self.request_timeout_seconds}s") from exc

    def generate_json(
        self,
        prompt: str,
        response_schema: Dict[str, Any],
        system_instruction: Optional[str] = None,
        temperature: float = 0.1,
        max_output_tokens: int = 1024,
        min_confidence: Optional[float] = None,
        fallback: Optional[Dict[str, Any]] = None,
        cache_namespace: str = "json",
    ) -> Dict[str, Any]:
        safe_fallback: Dict[str, Any] = copy.deepcopy(fallback) if fallback else {}
        normalized_schema = self._normalize_schema(response_schema)

        key = self._make_cache_key(
            cache_namespace,
            {
                "prompt": prompt,
                "schema": normalized_schema,
                "system_instruction": system_instruction,
                "temperature": temperature,
                "max_output_tokens": max_output_tokens,
                "min_confidence": min_confidence,
                "model": self.model_name,
            },
        )
        cached = self._get_cached(key)
        if cached is not None:
            return cached

        if not self.is_available():
            return safe_fallback

        gen_config = {
            "response_mime_type": "application/json",
            "response_schema": normalized_schema,
            "temperature": temperature,
            "max_output_tokens": max_output_tokens,
        }

        try:
            response = self._generate(
                prompt=prompt,
                generation_config=gen_config,
                system_instruction=system_instruction,
            )
            parsed = self._coerce_json(getattr(response, "text", "") or "")
            if min_confidence is not None:
                confidence = float(parsed.get("confidence", 0.0))
                if confidence < min_confidence:
                    return safe_fallback or parsed

            self._set_cached(key, parsed)
            return parsed
        except Exception as exc:
            logger.warning("Gemini JSON generation failed: %s", exc)
            return safe_fallback

    def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.2,
        max_output_tokens: int = 1500,
        fallback: str = "",
        cache_namespace: str = "text",
    ) -> str:
        key = self._make_cache_key(
            cache_namespace,
            {
                "prompt": prompt,
                "system_instruction": system_instruction,
                "temperature": temperature,
                "max_output_tokens": max_output_tokens,
                "model": self.model_name,
            },
        )
        cached = self._get_cached(key)
        if cached is not None:
            return str(cached)

        if not self.is_available():
            return fallback

        gen_config = {
            "temperature": temperature,
            "max_output_tokens": max_output_tokens,
        }
        try:
            response = self._generate(
                prompt=prompt,
                generation_config=gen_config,
                system_instruction=system_instruction,
            )
            text = (getattr(response, "text", "") or "").strip()
            self._set_cached(key, text)
            return text
        except Exception as exc:
            logger.warning("Gemini text generation failed: %s", exc)
            return fallback
