import pytest
import os
from httpx import AsyncClient
from app.main import app

# Configuration for test environment
BASE_URL = "http://localhost:8080"
GEMINI_KEY_PRESENT = bool(os.getenv("GEMINI_API_KEY"))

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url=BASE_URL) as ac:
        yield ac

@pytest.mark.asyncio
async def test_healthz_ok(client):
    response = await client.get("/healthz")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert isinstance(data["gnn_loaded"], bool)

@pytest.mark.asyncio
async def test_graph_returns_nodes(client):
    response = await client.get("/api/v1/graph")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert len(data["nodes"]) > 20

@pytest.mark.asyncio
async def test_drugs_filter_tier_1(client):
    response = await client.get("/api/v1/drugs", params={"tier": 1})
    assert response.status_code == 200
    data = response.json()
    for drug in data["drugs"]:
        assert drug["nlem_tier"] == "TIER_1"

@pytest.mark.asyncio
async def test_drug_detail_paracetamol(client):
    response = await client.get("/api/v1/drug/paracetamol")
    assert response.status_code == 200
    data = response.json()
    assert data["drug"]["id"] == "paracetamol"
    assert "criticality_breakdown" in data

@pytest.mark.asyncio
async def test_alerts_critical(client):
    response = await client.get("/api/v1/alerts", params={"severity": "CRITICAL"})
    assert response.status_code == 200
    data = response.json()
    # Check if our known paracetamol alert is present
    alert_ids = [a["id"] for a in data["alerts"]]
    assert "alert_paracetamol_2024_q1" in alert_ids

@pytest.mark.asyncio
@pytest.mark.skipif(not GEMINI_KEY_PRESENT, reason="Gemini API key missing")
async def test_query_grounded(client):
    response = await client.post("/api/v1/query", json={
        "question": "Which drugs depend most on Hebei?"
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["answer"]) > 30
    assert len(data["citations"]) > 0

@pytest.mark.asyncio
async def test_simulate_hebei_paracetamol(client):
    response = await client.post("/api/v1/simulate", json={
        "province": "Hebei",
        "duration_days": 14,
        "severity": "full_shutdown"
    })
    assert response.status_code == 200
    data = response.json()
    affected_ids = [d["id"] for d in data["affected_drugs"]]
    assert "paracetamol" in affected_ids
