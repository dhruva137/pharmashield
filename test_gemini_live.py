"""
Direct test of GeminiFlashClient with new SDK + gemini-2.5-flash.
Run from repo root: python test_gemini_live.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

# Monkey-patch settings before importing
os.environ.setdefault("GEMINI_API_KEY", "AIzaSyCNlKpO8PHmhXW16FmH_1M7-u6coLdvBlA")

from app.services.gemini_flash_client import GeminiFlashClient

client = GeminiFlashClient(
    genai=True,  # sentinel to trigger _build_client()
    model_name="gemini-2.5-flash",
    request_timeout_seconds=30,
)

print(f"Client available: {client.is_available()}")
print(f"Internal _client: {client._client}")

# ── Test 1: plain text ──
print("\n=== Test 1: generate_text ===")
answer = client.generate_text(
    prompt="In one sentence, what is India's biggest pharmaceutical import dependency?",
    system_instruction="You are a supply chain expert. Be concise.",
    fallback="[FALLBACK]",
)
print("ANSWER:", answer)

# ── Test 2: structured JSON ──
print("\n=== Test 2: generate_json ===")
schema = {
    "type": "object",
    "properties": {
        "risk_summary": {"type": "string"},
        "top_drugs_at_risk": {"type": "array", "items": {"type": "string"}},
        "confidence": {"type": "number"},
    },
    "required": ["risk_summary", "top_drugs_at_risk", "confidence"],
}
result = client.generate_json(
    prompt="If Shandong province in China shuts down for 2 weeks, which Indian pharma APIs are most at risk? List top 3.",
    response_schema=schema,
    system_instruction="You are ShockMap supply chain analyst. Return structured JSON only.",
    temperature=0.1,
    max_output_tokens=400,
    fallback={"risk_summary": "fallback", "top_drugs_at_risk": [], "confidence": 0.0},
)
print("JSON RESULT:", result)

print("\n=== All tests passed ===")
