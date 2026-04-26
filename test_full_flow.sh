#!/bin/bash

# PharmaShield End-to-End Technical Smoke Test (Day 1-5)

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Configurable backend URL
URL=${BACKEND_URL:-"http://localhost:8080"}

echo "🧪 Starting PharmaShield Full Flow Verification against: $URL"
echo "--------------------------------------------------------"

EXIT_CODE=0

# Helper function for checks
check_endpoint() {
    local label=$1
    local endpoint=$2
    local query=$3
    local expected=$4
    
    echo -n "Checking $label... "
    local response=$(curl -s "$URL$endpoint")
    local result=$(echo "$response" | jq -r "$query")
    
    if [[ "$result" == "$expected" ]]; then
        echo -e "${GREEN}PASS${NC}"
    else
        echo -e "${RED}FAIL${NC} (Got: $result, Expected: $expected)"
        EXIT_CODE=1
    fi
}

# 1. Health & Infrastructure
check_endpoint "System Health" "/healthz" ".status" "ok"
check_endpoint "GNN Status" "/healthz" ".gnn_loaded" "true"

# 2. Graph Connectivity
check_endpoint "Graph Node Count" "/api/v1/graph" ".nodes | length > 20" "true"
check_endpoint "State Risk Coverage" "/api/v1/graph" ".state_risk_aggregates | length" "6"

# 3. Data & Filtering
check_endpoint "NLEM Tier 1 Filter" "/api/v1/drugs?tier=1" ".drugs | length >= 5" "true"

# 4. Dependency Logic
echo -n "Checking Dependency Tracing (Paracetamol)... "
PARA_DEP=$(curl -s "$URL/api/v1/drug/paracetamol" | jq -r '.dependency_chain | length > 0')
if [ "$PARA_DEP" == "true" ]; then echo -e "${GREEN}PASS${NC}"; else echo -e "${RED}FAIL${NC}"; EXIT_CODE=1; fi

# 5. Alert System
echo -n "Checking Critical Alerts... "
CRIT_ALERT=$(curl -s "$URL/api/v1/alerts?severity=CRITICAL" | jq -r '.alerts[] | select(.id == "alert_paracetamol_2024_q1") | .id')
if [ "$CRIT_ALERT" == "alert_paracetamol_2024_q1" ]; then echo -e "${GREEN}PASS${NC}"; else echo -e "${RED}FAIL${NC}"; EXIT_CODE=1; fi

# 6. RAG Analyst (POST)
echo -n "Testing RAG Analyst (POST /query)... "
QUERY_RES=$(curl -s -X POST "$URL/api/v1/query" -H "Content-Type: application/json" -d '{"question":"What is the status of Paracetamol?"}' | jq -r '.confidence > 0')
if [ "$QUERY_RES" == "true" ]; then echo -e "${GREEN}PASS${NC}"; else echo -e "${RED}FAIL${NC}"; EXIT_CODE=1; fi

# 7. GNN Simulator (POST)
echo -n "Testing GNN Simulator (POST /simulate)... "
SIM_RES=$(curl -s -X POST "$URL/api/v1/simulate" -H "Content-Type: application/json" -d '{"province":"Hebei","duration_days":14,"severity":"full_shutdown"}' | jq -r '.affected_drugs[] | select(.id == "paracetamol") | .id')
if [ "$SIM_RES" == "paracetamol" ]; then echo -e "${GREEN}PASS${NC}"; else echo -e "${RED}FAIL${NC}"; EXIT_CODE=1; fi

echo "--------------------------------------------------------"
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ ALL BACKEND SYSTEMS NOMINAL${NC}"
else
    echo -e "${RED}❌ SYSTEM VERIFICATION FAILED${NC}"
fi

echo ""
echo "📱 MANUAL FRONTEND CHECKLIST:"
echo "1. Open https://pharmashield.web.app"
echo "2. India map renders within 5 sec"
echo "3. Alert feed shows 8 alerts including paracetamol critical"
echo "4. Click any state — verify no crashes, check logs"
echo "5. Click 'Replay 2024' — 30-sec retrospective animates cleanly"
echo "6. Click any alert — navigates to drug detail"
echo "7. Type 'Which drugs depend most on Hebei?' in NL bar — returns grounded answer"
echo "8. From drug detail, run 'What-if simulation' — modal works, results returned"

exit $EXIT_CODE
