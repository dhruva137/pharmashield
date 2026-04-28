from fastapi import APIRouter, Depends, Query
from typing import List, Dict, Any
from ..services.hormuz_service import HormuzService
from ..deps import get_data_loader

router = APIRouter(prefix="/api/v1/hormuz", tags=["Intelligence"])

def get_hormuz_service():
    return HormuzService(data_loader=get_data_loader())

@router.get("/status")
async def get_status(service: HormuzService = Depends(get_hormuz_service)):
    return service.get_status()

@router.get("/impact")
async def get_impact(service: HormuzService = Depends(get_hormuz_service)):
    return service.get_impact_metrics()

@router.get("/affected-apis")
async def get_affected_apis(service: HormuzService = Depends(get_hormuz_service)):
    return service.get_affected_apis()

@router.get("/timeline")
async def get_timeline(service: HormuzService = Depends(get_hormuz_service)):
    return service.get_timeline()

@router.post("/predict")
def predict_shortage(
    days: int = Query(90, description="Predicted duration of closure"),
    service: HormuzService = Depends(get_hormuz_service)
):
    prediction = service.predict_shortage(days_closed=days)
    return {"prediction": prediction}
