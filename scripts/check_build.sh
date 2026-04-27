#!/bin/bash
# scripts/check_build.sh
# Final deployment check for ShockMap

echo "🔍 Starting ShockMap Deployment Audit..."

# 1. Backend check
echo "🐍 Auditing Backend..."
cd backend
if python -c "from app.main import app; print('✅ Backend imports successful')" ; then
    echo "   - Backend imports: OK"
else
    echo "   ❌ Backend imports: FAILED"
    exit 1
fi
cd ..

# 2. Frontend check
echo "⚛️ Auditing Frontend..."
cd frontend
if npm run build ; then
    echo "   - Frontend build: OK"
else
    echo "   ❌ Frontend build: FAILED"
    exit 1
fi
cd ..

# 3. Deployment files check
echo "🚀 Auditing Deployment Configs..."
if [ -f "render.yaml" ] && [ -f "netlify.toml" ] && [ -f "ingestion/Dockerfile" ]; then
    echo "   - Deployment manifests: OK"
else
    echo "   ❌ Deployment manifests: MISSING"
    exit 1
fi

echo "✅ SHOCKMAP READY FOR DEPLOYMENT"
echo "--------------------------------"
echo "Backend: Render (using render.yaml)"
echo "Frontend: Netlify (set VITE_BACKEND_URL to your Render URL)"
echo "Worker: Shock Detector (using ingestion/Dockerfile)"
