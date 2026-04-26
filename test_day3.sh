#!/bin/bash

# PharmaShield Day 3 Infrastructure & ML Verification

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🧪 Starting Day 3 Integration Verification..."

EXIT_CODE=0

# 1. Verify Ingestion Outputs
echo -n "Checking epb_notices.json... "
if [ -f "data/seed/epb_notices.json" ] && [ $(jq 'length' data/seed/epb_notices.json) -ge 5 ]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL (Missing or < 5 entries)${NC}"
    EXIT_CODE=1
fi

echo -n "Checking fda_alerts.json... "
if [ -f "data/seed/fda_alerts.json" ] && [ $(jq 'length' data/seed/fda_alerts.json) -ge 1 ]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL (Missing or empty)${NC}"
    EXIT_CODE=1
fi

# 2. Verify ML Weights
echo "🔍 Checking ML artifacts..."
if [ -f "ml/weights/gnn_v1.pt" ]; then
    SIZE=$(du -m ml/weights/gnn_v1.pt | cut -f1)
    if [ $SIZE -lt 5 ]; then
        echo -e "  gnn_v1.pt: ${GREEN}PASS${NC} ($SIZE MB)"
    else
        echo -e "  gnn_v1.pt: ${RED}FAIL${NC} (Too large: $SIZE MB)"
        EXIT_CODE=1
    fi
else
    echo -e "  gnn_v1.pt: ${RED}FAIL${NC} (Missing)"
    EXIT_CODE=1
fi

if [ -f "ml/weights/gnn_v1.json" ] && jq '.' ml/weights/gnn_v1.json > /dev/null 2>&1; then
    echo -e "  gnn_v1.json: ${GREEN}PASS${NC}"
else
    echo -e "  gnn_v1.json: ${RED}FAIL (Missing or invalid JSON)${NC}"
    EXIT_CODE=1
fi

# 3. Backend Integration Check
echo "🚀 Restarting Backend for ML verification..."
# Kill existing uvicorn on 8080
PID=$(lsof -t -i:8080 || netstat -ano | grep 8080 | awk '{print $5}' | head -n 1)
if [ -n "$PID" ]; then
    kill -9 $PID 2>/dev/null || taskkill //F //PID $PID 2>/dev/null || true
fi

# Start uvicorn
cd backend
source .venv/bin/activate || source .venv/Scripts/activate
uvicorn app.main:app --host 127.0.0.1 --port 8080 > /dev/null 2>&1 &
BACKEND_PID=$!
cd ..

cleanup() {
    kill $BACKEND_PID 2>/dev/null || true
}
trap cleanup EXIT

echo "⏳ Waiting for startup (4s)..."
sleep 4

# Check health for GNN status
GNN_LOADED=$(curl -s http://localhost:8080/healthz | jq -r '.gnn_loaded')
if [ "$GNN_LOADED" == "true" ]; then
    echo -e "Backend GNN Integration: ${GREEN}PASS${NC}"
else
    echo -e "Backend GNN Integration: ${RED}FAIL (gnn_loaded is false)${NC}"
    EXIT_CODE=1
fi

# Check risk computation
DRUG_RISK=$(curl -s http://localhost:8080/api/v1/graph | jq -r '.nodes[] | select(.type == "drug") | .attributes.current_risk' | head -n 1)
if [ "$DRUG_RISK" != "null" ] && [ -n "$DRUG_RISK" ]; then
    echo -e "Graph Risk Computation: ${GREEN}PASS${NC}"
else
    echo -e "Graph Risk Computation: ${RED}FAIL (current_risk is null)${NC}"
    EXIT_CODE=1
fi

echo "--------------------------------------------------"
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Day 3 verification successful!${NC}"
else
    echo -e "${RED}❌ Day 3 verification failed.${NC}"
fi

exit $EXIT_CODE
