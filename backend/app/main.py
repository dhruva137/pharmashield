"""
PharmaShield API - FastAPI Entry Point.
National Pharma-Import Dependency Intelligence.
"""

import json
import logging
import traceback
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timedelta

import asyncio
from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .config import BASE_DIR, settings
from .deps import (
    get_data_loader, 
    get_graph_service, 
    get_retriever, 
    get_gnn,
    get_gemini_flash_client,
    get_demo_mode_service,
)

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s"
)
logger = logging.getLogger("pharmashield")

LIVE_SHOCK_PATHS = (
    BASE_DIR / "data" / "shocks.json",
    BASE_DIR / "data" / "seed" / "live_shocks.json",
)

app = FastAPI(
    title="ShockMap API",
    version="1.0.0",
    description="National Supply Chain Security Intelligence",
    docs_url="/docs",
    redoc_url=None
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Status Cache
_health_cache = {
    "data": None,
    "expiry": datetime.min
}

def _load_live_shock_count():
    """Count deduplicated live shocks from current and legacy feed files."""
    seen_ids = set()
    total = 0

    for path in LIVE_SHOCK_PATHS:
        if not path.exists():
            continue
        try:
            items = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue

        for item in items:
            item_id = str(item.get("id", "")).strip()
            if item_id:
                if item_id in seen_ids:
                    continue
                seen_ids.add(item_id)
            total += 1

    return total


def get_health_status():
    """Returns cached health status, rebuilds every 60 seconds."""
    global _health_cache
    now = datetime.now()
    
    if _health_cache["data"] and _health_cache["expiry"] > now:
        return _health_cache["data"]
    
    dl = get_data_loader()
    if not dl.get_drugs():
        try:
            dl.load_all()
        except Exception:
            pass

    gemini_client = get_gemini_flash_client()
    gemini_ready = gemini_client.is_available()
    gnn_ready = False
    try:
        gnn = get_gnn()
        gnn_ready = gnn.is_available()
    except Exception:
        pass
    
    retriever = get_retriever()
    qdrant_ready = bool(getattr(retriever, "_enabled", False))
    demo_service = get_demo_mode_service()
    live_shock_count = _load_live_shock_count()

    if settings.DEMO_MODE and live_shock_count > 0:
        shock_feed_mode = "hybrid_demo_live"
    elif settings.DEMO_MODE:
        shock_feed_mode = "demo"
    else:
        shock_feed_mode = "live"

    status = {
        "status": "ok",
        "version": "1.0.0",
        "loaded_drugs": len(dl.get_drugs()),
        "loaded_alerts": len(dl.get_alerts()),
        "gemini_ready": gemini_ready,
        "qdrant_ready": qdrant_ready,
        "demo_mode": settings.DEMO_MODE,
        "demo_scenarios": demo_service.count(),
        "live_shocks": live_shock_count,
        "shock_feed_mode": shock_feed_mode,
        "gnn_enabled": settings.ENABLE_GNN,
        "gnn_loaded": gnn_ready,
        "propagation_mode": "gnn" if gnn_ready else "pagerank",
    }
    
    _health_cache["data"] = status
    _health_cache["expiry"] = now + timedelta(seconds=60)
    return status

@app.on_event("startup")
async def startup_event():
    """Initializes system services and loads data on startup."""
    logger.info("ShockMap starting...")
    
    # Load Data
    dl = get_data_loader()
    dl.load_all()
    
    # Initialize Graph
    get_graph_service()
    
    # Initialize Vector Store
    if settings.DEMO_MODE:
        logger.info("Demo mode enabled; skipping Qdrant warmup.")
    else:
        try:
            get_retriever().ensure_collection()
        except Exception as e:
            logger.warning(f"Qdrant collection initialization failed: {e}")
        
    # Initialize GNN
    try:
        get_gnn()
    except Exception as e:
        logger.warning(f"GNN loading failed: {e}")

    # Start Background Shock Detector — optional; never crash the server if unavailable
    try:
        import sys, os
        # Ensure the project root is on sys.path so 'ingestion' is importable
        project_root = str(Path(__file__).resolve().parent.parent.parent)
        if project_root not in sys.path:
            sys.path.insert(0, project_root)

        if settings.DEMO_MODE:
            from ingestion.shock_detector import run_once
            loop = asyncio.get_event_loop()
            loop.run_in_executor(None, run_once)
            logger.info("Background detector triggered once (Demo Mode).")
        else:
            from ingestion.shock_detector import run_scheduler
            import threading
            thread = threading.Thread(target=run_scheduler, daemon=True)
            thread.start()
            logger.info("Background detector thread started (Live Mode).")
    except Exception as e:
        logger.warning(f"Shock detector could not start (non-fatal): {e}")

    logger.info("ShockMap startup sequence complete.")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global handler for uncaught exceptions."""
    request_id = str(uuid4())
    logger.error(f"Request ID: {request_id} - Global error: {exc}")
    logger.error(traceback.format_exc())
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal",
            "request_id": request_id,
            "message": f"An unexpected error occurred: {exc}\n{traceback.format_exc()}"
        }
    )

@app.get("/")
async def root():
    """Root endpoint info."""
    return {"name": "ShockMap API", "docs": "/docs"}

@app.get("/healthz")
async def healthz():
    """System health and status check."""
    return get_health_status()

# Router Mounting
# All routers are now implemented and ready for production use
from .api import graph, drugs, alerts, query, simulate, sectors, engines, map, hormuz, stocks, energy, domestic

app.include_router(graph.router)
app.include_router(drugs.router)
app.include_router(alerts.router)
app.include_router(query.router)
app.include_router(simulate.router)
app.include_router(sectors.router)
app.include_router(engines.router)
app.include_router(map.router)
app.include_router(hormuz.router)
app.include_router(stocks.router)
app.include_router(energy.router)
app.include_router(domestic.router)

# ── Static file serving for production (HF Spaces / Docker) ──────────
# Serves the built React frontend from /app/static if it exists.
import os
_static_dir = Path("/app/static")
if not _static_dir.exists():
    _static_dir = BASE_DIR / "frontend" / "dist"

if _static_dir.exists():
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    # Serve assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=str(_static_dir / "assets")), name="assets")

    # SPA catch-all: any non-API route returns index.html
    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        file_path = _static_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(_static_dir / "index.html"))

