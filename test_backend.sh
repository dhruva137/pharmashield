#!/bin/bash

# PharmaShield Backend Test Suite

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🧪 Starting Backend Integration Tests..."

# 1. Setup Environment
if [ -d "backend/.venv" ]; then
    source backend/.venv/bin/activate || source backend/.venv/Scripts/activate
else
    echo "⚠️ .venv not found. Running with system python..."
fi

# 2. Start Uvicorn in Background
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8080 > /dev/null 2>&1 &
UVICORN_PID=$!
cd ..

# Ensure uvicorn is killed on script exit
cleanup() {
    echo "🧹 Cleaning up..."
    kill $UVICORN_PID 2>/dev/null || true
}
trap cleanup EXIT

# 3. Wait for Startup
echo "⏳ Waiting for server to spin up (3s)..."
sleep 3

EXIT_CODE=0

# 4. Run Tests
test_endpoint() {
    local url=$1
    local expected_status=$2
    local name=$3
    local check_json=$4

    echo -n "Checking $name ($url)... "
    
    RESPONSE=$(curl -s -w "%{http_code}" "$url")
    STATUS=${RESPONSE: -3}
    BODY=${RESPONSE:0:${#RESPONSE}-3}

    if [ "$STATUS" -eq "$expected_status" ]; then
        if [ -n "$check_json" ]; then
            if echo "$BODY" | grep -q "$check_json"; then
                echo -e "${GREEN}PASS${NC}"
            else
                echo -e "${RED}FAIL (JSON mismatch)${NC}"
                EXIT_CODE=1
            fi
        else
            echo -e "${GREEN}PASS${NC}"
        fi
    else
        echo -e "${RED}FAIL (Status: $STATUS)${NC}"
        EXIT_CODE=1
    fi
}

# Test 1: Health Check
test_endpoint "http://localhost:8080/healthz" 200 "Health Check" '"status":"ok"'

# Test 2: Root Info
test_endpoint "http://localhost:8080/" 200 "Root Info"

# Test 3: API Documentation
test_endpoint "http://localhost:8080/docs" 200 "Swagger Docs"

# 5. Final Report
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✅ All backend tests passed!${NC}"
else
    echo -e "\n${RED}❌ Some tests failed. Check logs.${NC}"
fi

exit $EXIT_CODE
