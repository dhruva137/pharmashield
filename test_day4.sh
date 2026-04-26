#!/bin/bash

# PharmaShield Day 4 Integration & Intelligence Verification

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🧪 Starting Day 4 Intelligence Verification..."

EXIT_CODE=0

# 1. Verify Intelligence Ready
echo -n "Checking healthz for GNN... "
GNN_STATUS=$(curl -s http://localhost:8080/healthz | jq -r '.gnn_loaded')
if [ "$GNN_STATUS" == "true" ]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL (gnn_loaded is false)${NC}"
    EXIT_CODE=1
fi

# 2. Test RAG Analyst
echo -n "Testing POST /api/v1/query... "
QUERY_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/query -H "Content-Type: application/json" -d '{"question":"Which drugs depend most on Hebei?"}')
ANSWER_LEN=$(echo "$QUERY_RESPONSE" | jq -r '.answer | length')

if [ $ANSWER_LEN -gt 30 ]; then
    echo -e "${GREEN}PASS${NC} (Length: $ANSWER_LEN)"
else
    echo -e "${RED}FAIL (Answer too short or error)${NC}"
    EXIT_CODE=1
fi

# 3. Test Simulation
echo -n "Testing POST /api/v1/simulate... "
SIM_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/simulate -H "Content-Type: application/json" -d '{"province":"Hebei","duration_days":14,"severity":"full_shutdown"}')
AFFECTED_COUNT=$(echo "$SIM_RESPONSE" | jq -r '.affected_drugs | length')

if [ $AFFECTED_COUNT -gt 0 ]; then
    echo -e "${GREEN}PASS${NC} (Affected: $AFFECTED_COUNT)"
else
    echo -e "${RED}FAIL (No drugs affected by Hebei shutdown)${NC}"
    EXIT_CODE=1
fi

echo "--------------------------------------------------"
echo "🚀 Backend Intelligence Verified."
echo ""
echo "📱 Next steps for Frontend Validation:"
echo "1. Run: cd frontend && flutter run -d chrome --dart-define=BACKEND_URL=http://localhost:8080"
echo "2. Verify Dashboard loads with India map."
echo "3. Verify Alerts feed populates on the right."
echo "4. Test NL Query Bar (e.g. ask 'What is the risk for Paracetamol?')"
echo ""

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Day 4 automated checks successful!${NC}"
else
    echo -e "${RED}❌ Day 4 checks failed.${NC}"
fi

exit $EXIT_CODE
