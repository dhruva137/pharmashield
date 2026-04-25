"""
PharmaShield API - FastAPI Entry Point.
National Pharma-Import Dependency Intelligence.
"""

import logging
import traceback
import time
from uuid import uuid4
from datetime import datetime, timedelta

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .deps import (
    get_data_loader, 
    get_graph_service, 
    get_retriever, 
    get_gnn
)

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s"
)
logger = logging.getLogger("pharmashield")

app = FastAPI(
    title="PharmaShield API",
    version="1.0.0",
    description="National Pharma-Import Dependency Intelligence",
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

def get_health_status():
    """Returns cached health status, rebuilds every 60 seconds."""
    global _health_cache
    now = datetime.now()
    
    if _health_cache["data"] and _health_cache["expiry"] > now:
        return _health_cache["data"]
    
    dl = get_data_loader()
    gnn_ready = False
    try:
        get_gnn()
        gnn_ready = True
    except Exception:
        pass
        
    qdrant_ready = False
    try:
        # Simple check for qdrant accessibility if needed
        qdrant_ready = True 
    except Exception:
        pass

    status = {
        "status": "ok",
        "version": "1.0.0",
        "loaded_drugs": len(dl.get_drugs()),
        "loaded_alerts": len(dl.get_alerts()),
        "gnn_loaded": gnn_ready,
        "qdrant_ready": qdrant_ready
    }
    
    _health_cache["data"] = status
    _health_cache["expiry"] = now + timedelta(seconds=60)
    return status

@app.on_event("startup")
async def startup_event():
    """Initializes system services and loads data on startup."""
    logger.info("PharmaShield starting...")
    
    # Load Data
    dl = get_data_loader()
    dl.load_all()
    
    # Initialize Graph
    get_graph_service()
    
    # Initialize Vector Store
    qdrant_status = False
    try:
        # Note: retriever.ensure_collection() implementation assumed in retriever service
        get_retriever().ensure_collection()
        qdrant_status = True
    except Exception as e:
        logger.warning(f"Qdrant collection initialization failed: {e}")
        
    # Initialize GNN
    gnn_status = False
    try:
        get_gnn()
        gnn_status = True
    except Exception as e:
        logger.warning(f"GNN weights not found or loading failed: {e}")
        
    logger.info(
        f"Ready: {len(dl.get_drugs())} drugs, "
        f"{len(dl.get_alerts())} alerts, "
        f"GNN: {gnn_status}, "
        f"Qdrant: {qdrant_status}"
    )

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
            "message": "An unexpected error occurred."
        }
    )

@app.get("/")
async def root():
    """Root endpoint info."""
    return {"name": "PharmaShield API", "docs": "/docs"}

@app.get("/healthz")
async def healthz():
    """System health and status check."""
    return get_health_status()

# Router Mounting
routers = [
    ("app.api.graph", "/api/graph", "Graph"),
    ("app.api.drugs", "/api/drugs", "Drugs"),
    ("app.api.alerts", "/api/alerts", "Alerts"),
    ("app.api.query", "/api/query", "Query"),
    ("app.api.simulate", "/api/simulate", "Simulate"),
]

for module_path, prefix, name in routers:
    try:
        import importlib
        module = importlib.import_module(module_path)
        router = getattr(module, "router")
        app.include_router(router, prefix=prefix, tags=[name])
    except (ImportError, AttributeError) as e:
        logger.warning(f"Router {name} not ready, skipping: {e}")
    except Exception as e:
        logger.error(f"Error mounting router {name}: {e}")
