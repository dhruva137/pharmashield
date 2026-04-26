"""
Endpoints for pharmaceutical supply chain alerts and monitoring.
"""

from datetime import datetime
from typing import List, Optional, Annotated, Any
from fastapi import APIRouter, Depends, Query, HTTPException, Response

from ..deps import get_data_loader
from ..models.alert import Alert, AlertSeverity, AlertSource, AlertListResponse


router = APIRouter(prefix="/api/v1", tags=["alerts"])


@router.get("/alerts", response_model=AlertListResponse)
async def get_alerts(
    response: Response,
    severity: Optional[AlertSeverity] = None,
    drug_id: Optional[str] = None,
    source: Optional[AlertSource] = None,
    since: Optional[datetime] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    data_loader: Annotated[Any, Depends(get_data_loader)] = None
) -> AlertListResponse:
    """
    Returns a paginated list of supply chain alerts with multi-dimensional filtering.
    
    Caching: The response includes a 10-second Cache-Control header to facilitate polling.
    """
    # 1. Fetch filtered alerts from DataLoader (handles severity and drug_id)
    # We use a higher limit to pull enough for secondary local filtering
    raw_alerts = data_loader.get_alerts(
        severity=severity,
        drug_id=drug_id,
        limit=1000
    )
    
    # 2. Apply secondary filters (source, since) and sort
    filtered_alerts = []
    for alert in raw_alerts:
        if source and alert.source != source:
            continue
        if since and alert.created_at < since:
            continue
        filtered_alerts.append(alert)
        
    # Sort by created_at descending (newest first)
    sorted_alerts = sorted(filtered_alerts, key=lambda x: x.created_at, reverse=True)
    
    # 3. Paginate
    total = len(sorted_alerts)
    paginated = sorted_alerts[offset : offset + limit]
    
    # 4. Set Cache-Control header
    response.headers["Cache-Control"] = "max-age=10"
    
    return AlertListResponse(
        alerts=paginated,
        total=total,
        page=(offset // limit) + 1,
        page_size=limit
    )


@router.get("/alert/{alert_id}", response_model=Alert)
async def get_alert_detail(
    alert_id: str,
    data_loader: Annotated[Any, Depends(get_data_loader)] = None
) -> Alert:
    """
    Returns full details for a specific alert by its ID.
    """
    alert = data_loader.get_alert(alert_id)
    if not alert:
        raise HTTPException(
            status_code=404, 
            detail=f"Alert with ID '{alert_id}' not found"
        )
        
    return alert
