#!/bin/bash

# PharmaShield API Endpoint Functional Test Suite
# Requires: curl, jq

BACKEND_URL=${BACKEND_URL:-"http://localhost:8080"}
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🧪 Testing PharmaShield API at $BACKEND_URL..."

EXIT_CODE=0

check() {
    local name=$1
    local path=$2
    local filter=$3
    local expected=$4
    
    echo -n "Checking $name... "
    
    RESPONSE=$(curl -s "$BACKEND_URL$path")
    RESULT=$(echo "$RESPONSE" | jq -r "$filter" 2>/dev/null)
    
    if [[ "$RESULT" == "$expected" ]]; then
        echo -e "${GREEN}PASS${NC}"
    else
        echo -e "${RED}FAIL${NC}"
        echo "  Expected: $expected"
        echo "  Got: $RESULT"
        # echo "  Full Response: $RESPONSE" # Uncomment for debugging
        EXIT_CODE=1
    fi
}

check_logic() {
    local name=$1
    local path=$2
    local logic=$3
    
    echo -n "Checking $name... "
    
    RESPONSE=$(curl -s "$BACKEND_URL$path")
    VALID=$(echo "$RESPONSE" | jq -e "$logic" > /dev/null 2>&1 && echo "true" || echo "false")
    
    if [[ "$VALID" == "true" ]]; then
        echo -e "${GREEN}PASS${NC}"
    else
        echo -e "${RED}FAIL (Logic check failed)${NC}"
        EXIT_CODE=1
    fi
}

# 1. Infrastructure
check "Health Check" "/healthz" ".status == \"ok\" and (.loaded_drugs > 0)" "true"

# 2. Graph Endpoints
check "Graph structure" "/api/v1/graph" ".nodes | length > 20" "true"
check "State aggregates count" "/api/v1/graph/states" "length == 6" "true"

# 3. Drugs Endpoints
check "Drugs list non-empty" "/api/v1/drugs" ".total > 0" "true"
check_logic "Tier 1 filtering" "/api/v1/drugs?tier=1" "all(.drugs[]; .nlem_tier == \"TIER_1\")"
check_logic "Critical severity filtering" "/api/v1/drugs?severity=critical" "all(.drugs[]; .current_risk > 80)"

# 4. Drug Detail
check "Drug detail: paracetamol" "/api/v1/drug/paracetamol" ".drug.name == \"paracetamol\" and (.supplier_hhi != null)" "true"
check "Drug detail: 404 handler" "/api/v1/drug/nonexistent" ".detail != null" "true"

# 5. Alerts Endpoints
check_logic "Alerts list contains paracetamol alert" "/api/v1/alerts" "any(.alerts[]; .id == \"alert_paracetamol_2024_q1\")"
check_logic "Alert severity filtering" "/api/v1/alerts?severity=CRITICAL" ".total > 0 and all(.alerts[]; .severity == \"CRITICAL\")"
check "Alert detail" "/api/v1/alert/alert_paracetamol_2024_q1" ".id == \"alert_paracetamol_2024_q1\"" "true"

echo "--------------------------------------------------"
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All endpoints passed validation!${NC}"
else
    echo -e "${RED}❌ Functional testing failed.${NC}"
fi

exit $EXIT_CODE
