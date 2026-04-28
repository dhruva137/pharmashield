from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from ..services.stock_service import StockService

router = APIRouter(prefix="/api/v1/stocks", tags=["Market Signals"])

def get_stock_service():
    return StockService()

@router.get("/pharma")
async def get_pharma_stocks(service: StockService = Depends(get_stock_service)):
    return service.get_pharma_stocks()

@router.get("/correlations")
async def get_correlations(service: StockService = Depends(get_stock_service)):
    return service.get_correlations()
