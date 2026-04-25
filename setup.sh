#!/bin/bash

# PharmaShield One-Shot Setup Script

set -e

echo "🛡️ Starting PharmaShield Setup..."

# 1. Verify Prerequisites
echo "🔍 Verifying prerequisites..."

# Python Check
if command -v python3.11 &> /dev/null; then
    PYTHON_CMD="python3.11"
elif command -v python3 &> /dev/null && [[ $(python3 --version) == *"3.11"* ]]; then
    PYTHON_CMD="python3"
else
    echo "❌ Error: Python 3.11 is required but not found."
    exit 1
fi
echo "✅ $PYTHON_CMD found."

# Flutter Check
if command -v flutter &> /dev/null; then
    FLUTTER_VERSION=$(flutter --version | head -n 1)
    echo "✅ Flutter found: $FLUTTER_VERSION"
else
    echo "❌ Error: Flutter is required but not found."
    exit 1
fi

# Node Check
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✅ Node found: $NODE_VERSION"
else
    echo "❌ Error: Node.js is required but not found."
    exit 1
fi

# 2. Backend Setup
echo "⚙️ Setting up Backend..."
cd backend
$PYTHON_CMD -m venv .venv
source .venv/bin/activate || source .venv/Scripts/activate
pip install --upgrade pip
pip install -r requirements.txt
cd ..

# 3. Frontend Setup
echo "⚙️ Setting up Frontend..."
cd frontend
flutter pub get
cd ..

echo ""
echo "🎉 Setup Complete!"
echo "--------------------------------------------------"
echo "🚀 Next Steps:"
echo "1. Configure Environment: cp .env.example .env and fill in your GEMINI_API_KEY and QDRANT_URL."
echo "2. Run Backend: cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8080"
echo "3. Run Frontend: cd frontend && flutter run -d chrome --dart-define=BACKEND_URL=http://localhost:8080"
echo "--------------------------------------------------"
