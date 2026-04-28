"""
Gemini client using the new google-genai SDK (google.genai).
Replaces deprecated google.generativeai with proper structured output support.
"""

from __future__ import annotations

import copy
import hashlib
import json
import logging
import re
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

logger = logging.getLogger("shockmap.gemini_flash")


class GeminiFlashClient:
    """
    Centralized Gemini client using the new google.genai SDK.

    Key fixes vs legacy implementation:
    - Uses google.genai instead of deprecated google.generativeai
    - Synchronous generate_content (no ThreadPoolExecutor hack needed)
    - Proper timeout via http_options
    - Defaults to gemini-2.5-flash which has active free quota
    """

    def __init__(
        self,
        genai: Any = None,
        model_name: str = "gemini-2.5-flash",
        cache_ttl_seconds: int = 1800,
        request_timeout_seconds: int = 30,
    ):
        self.genai = genai          # kept for legacy compat check
        self.model_name = model_name
        self.cache_ttl_seconds = cache_ttl_seconds
        self.request_timeout_seconds = request_timeout_seconds
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._client: Optional[Any] = None

        # Build the new-SDK client eagerly if genai is available
        if genai is not None:
            self._client = self._build_client()

    def _build_client(self) -> Optional[Any]:
        """Construct a google.genai.Client using the configured API key."""
        try:
            from google import genai as new_genai
            from google.genai import types as genai_types
            from ..config import settings
            if settings.GEMINI_API_KEY:
                http_options = genai_types.HttpOptions(
                    timeout=self.request_timeout_seconds * 1000  # ms
                )
                return new_genai.Client(
                    api_key=settings.GEMINI_API_KEY,
                    http_options=http_options,
                )
        except Exception as exc:
            logger.warning("Failed to build new genai client: %s", exc)
        return None

    def is_available(self) -> bool:
        return self._client is not None or self.genai is not None

    # ── Cache helpers ─────────────────────────────────────────────────────
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

    # ── JSON coercion ─────────────────────────────────────────────────────
    def _coerce_json(self, raw_text: str) -> Dict[str, Any]:
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        try:
            data = json.loads(cleaned)
            if isinstance(data, dict):
                return data
            # Gemini sometimes returns a JSON array — take first element if dict
            if isinstance(data, list) and data and isinstance(data[0], dict):
                return data[0]
        except Exception:
            pass

        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(0))
                if isinstance(data, dict):
                    return data
            except Exception:
                pass

        raise ValueError(f"Gemini response is not valid JSON object: {raw_text[:200]}")

    # ── Core generation ───────────────────────────────────────────────────
    def _generate_text_raw(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.1,
        max_output_tokens: int = 1024,
        response_mime_type: Optional[str] = None,
        response_schema: Optional[Dict[str, Any]] = None,
        disable_thinking: bool = False,
    ) -> str:
        """
        Single call to Gemini using the new google.genai SDK.
        Falls back to legacy SDK if new client unavailable.
        disable_thinking=True sets thinking_budget=0 which prevents token truncation
        in structured JSON mode on gemini-2.5-flash.
        """
        # ── New SDK path ──────────────────────────────────────────────────
        if self._client is not None:
            try:
                from google.genai import types as genai_types

                config_kwargs: Dict[str, Any] = {
                    "temperature": temperature,
                    "max_output_tokens": max_output_tokens,
                }
                if system_instruction:
                    config_kwargs["system_instruction"] = system_instruction
                if response_mime_type:
                    config_kwargs["response_mime_type"] = response_mime_type
                if response_schema is not None:
                    config_kwargs["response_schema"] = response_schema
                # Disable thinking for structured output — prevents truncation
                if disable_thinking:
                    config_kwargs["thinking_config"] = genai_types.ThinkingConfig(
                        thinking_budget=0
                    )

                config = genai_types.GenerateContentConfig(**config_kwargs)
                response = self._client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=config,
                )
                return (response.text or "").strip()
            except Exception as exc:
                logger.warning("New genai SDK call failed: %s", exc)
                raise

        # ── Legacy SDK path (google.generativeai) ────────────────────────
        if self.genai is not None:
            gen_config: Dict[str, Any] = {
                "temperature": temperature,
                "max_output_tokens": max_output_tokens,
            }
            if response_mime_type:
                gen_config["response_mime_type"] = response_mime_type
            if response_schema is not None:
                gen_config["response_schema"] = response_schema

            if system_instruction:
                model = self.genai.GenerativeModel(
                    self.model_name,
                    system_instruction=system_instruction,
                )
            else:
                model = self.genai.GenerativeModel(self.model_name)

            response = model.generate_content(prompt, generation_config=gen_config)
            return (getattr(response, "text", "") or "").strip()

        raise RuntimeError("No Gemini client available")

    # ── Public API ────────────────────────────────────────────────────────
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

        cache_key = self._make_cache_key(
            cache_namespace,
            {
                "prompt": prompt,
                "schema": response_schema,
                "system_instruction": system_instruction,
                "temperature": temperature,
                "max_output_tokens": max_output_tokens,
                "model": self.model_name,
            },
        )
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached

        if not self.is_available():
            logger.warning("Gemini not available — returning fallback")
            return safe_fallback

        try:
            # Inject required field names so Gemini uses the correct keys
            required_fields = response_schema.get("required", [])
            if required_fields:
                schema_hint = (
                    f"\n\nRESPONSE FORMAT: Return a JSON object with EXACTLY these keys: "
                    f"{', '.join(required_fields)}. Do not use any other key names."
                )
                augmented_prompt = prompt + schema_hint
            else:
                augmented_prompt = prompt

            raw = self._generate_text_raw(
                prompt=augmented_prompt,
                system_instruction=system_instruction,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
                response_mime_type="application/json",
                disable_thinking=True,
            )
            parsed = self._coerce_json(raw)
            logger.info("Gemini JSON keys: %s", list(parsed.keys()))

            if min_confidence is not None:
                raw_conf = parsed.get("confidence", 0.0)
                # Gemini sometimes returns strings like "High" or "0.85"
                try:
                    confidence = float(raw_conf)
                except (TypeError, ValueError):
                    confidence_map = {"high": 0.8, "medium": 0.5, "low": 0.2}
                    confidence = confidence_map.get(str(raw_conf).lower(), 0.5)
                parsed["confidence"] = confidence  # normalise in-place

                if confidence < min_confidence:
                    logger.info(
                        "Gemini confidence %.2f < min %.2f — returning fallback",
                        confidence, min_confidence,
                    )
                    return safe_fallback or parsed

            self._set_cached(cache_key, parsed)
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
        cache_key = self._make_cache_key(
            cache_namespace,
            {
                "prompt": prompt,
                "system_instruction": system_instruction,
                "temperature": temperature,
                "max_output_tokens": max_output_tokens,
                "model": self.model_name,
            },
        )
        cached = self._get_cached(cache_key)
        if cached is not None:
            return str(cached)

        if not self.is_available():
            return fallback

        try:
            text = self._generate_text_raw(
                prompt=prompt,
                system_instruction=system_instruction,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
            )
            self._set_cached(cache_key, text)
            return text
        except Exception as exc:
            logger.warning("Gemini text generation failed: %s", exc)
            return fallback

    def close(self) -> None:
        """No-op — kept for interface compat."""
        pass
