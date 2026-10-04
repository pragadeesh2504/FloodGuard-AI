from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.incident import Incident
from app.models.location import Location
from app.models.prediction import Prediction
from app.models.alert import Alert
from app.schemas.incident import IncidentCreate, IncidentStatusUpdate, IncidentResponse
from app.routes.auth import get_current_user
from app.models.user import User
from app.utils.websocket_manager import manager
from app.utils.audit import log_audit

router = APIRouter(prefix="/incidents", tags=["Alerts & Incidents"])

VALID_STATUSES = ["NEW", "INVESTIGATING", "ACTIVE", "ESCALATED", "RESOLVED"]
VALID_SEVERITIES = ["LOW", "MODERATE", "HIGH", "CRITICAL"]

def format_incident(inc: Incident) -> IncidentResponse:
    loc_name = inc.location.name if inc.location else "Unknown"
    return IncidentResponse(
        id=inc.id,
        location_id=inc.location_id,
        prediction_id=inc.prediction_id,
        title=inc.title,
        severity=inc.severity,
        lifecycle_status=inc.lifecycle_status,
        contributing_factors=inc.contributing_factors,
        assigned_to=inc.assigned_to,
        action_plan=inc.action_plan,
        notes=inc.notes or "",
        created_at=inc.created_at,
        updated_at=inc.updated_at,
        location_name=loc_name
    )

@router.get("", response_model=List[IncidentResponse])
def get_incidents(
    lifecycle_status: Optional[str] = None,
    severity: Optional[str] = None,
    location_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Retrieves operational incidents, optionally filtered by lifecycle status, severity, or location.
    """
    query = db.query(Incident)
    if lifecycle_status:
        query = query.filter(Incident.lifecycle_status == lifecycle_status.upper())
    if severity:
        query = query.filter(Incident.severity == severity.upper())
    if location_id:
        query = query.filter(Incident.location_id == location_id)

    incidents = query.order_by(Incident.created_at.desc()).all()
    return [format_incident(inc) for inc in incidents]

@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    req: IncidentCreate,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new operational incident and dispatches WebSocket notification.
    """
    loc = db.query(Location).filter(Location.id == req.location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    severity = req.severity.upper()
    if severity not in VALID_SEVERITIES:
        severity = "MODERATE"

    inc = Incident(
        location_id=req.location_id,
        prediction_id=req.prediction_id,
        title=req.title,
        severity=severity,
        lifecycle_status="NEW",
        contributing_factors=req.contributing_factors,
        assigned_to=req.assigned_to or "NDRF Unit / TN-SDRF Rapid Response",
        action_plan=req.action_plan or "Deploy rapid assessment team, review nearest shelter readiness.",
        notes=req.notes or ""
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)

    username = current_user.username if current_user else "operator"
    user_id = current_user.id if current_user else None

    # Log audit entry
    log_audit(
        db,
        action_type="INCIDENT_CREATE",
        description=f"Incident #{inc.id} created: {inc.title} ({severity}) in {loc.name}",
        user_id=user_id,
        username=username,
        details=f"Status: NEW, Assigned: {inc.assigned_to}"
    )

    formatted = format_incident(inc)

    # Broadcast WebSocket
    await manager.broadcast({
        "type": "INCIDENT_CREATED",
        "incident": {
            "id": inc.id,
            "title": inc.title,
            "severity": inc.severity,
            "lifecycle_status": inc.lifecycle_status,
            "location_name": loc.name,
            "created_at": inc.created_at.isoformat() if inc.created_at else None
        }
    })

    return formatted

@router.put("/{incident_id}/status", response_model=IncidentResponse)
async def update_incident_status(
    incident_id: int,
    req: IncidentStatusUpdate,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates the lifecycle status of an operational incident (NEW -> INVESTIGATING -> ACTIVE -> ESCALATED -> RESOLVED).
    """
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    new_status = req.lifecycle_status.upper()
    if new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid lifecycle status '{req.lifecycle_status}'. Allowed: {', '.join(VALID_STATUSES)}"
        )

    old_status = inc.lifecycle_status
    inc.lifecycle_status = new_status
    if req.notes:
        inc.notes = f"{inc.notes}\n[{datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] {req.notes}".strip()

    db.commit()
    db.refresh(inc)

    username = current_user.username if current_user else "operator"
    user_id = current_user.id if current_user else None

    # Log audit entry
    log_audit(
        db,
        action_type="INCIDENT_STATUS_CHANGE",
        description=f"Incident #{inc.id} transition: {old_status} -> {new_status}",
        user_id=user_id,
        username=username,
        details=f"Notes added: {req.notes or 'None'}"
    )

    loc_name = inc.location.name if inc.location else "Unknown"

    # Broadcast WebSocket
    await manager.broadcast({
        "type": "INCIDENT_STATUS_CHANGED",
        "incident": {
            "id": inc.id,
            "title": inc.title,
            "severity": inc.severity,
            "old_status": old_status,
            "lifecycle_status": inc.lifecycle_status,
            "location_name": loc_name
        }
    })

    return format_incident(inc)

@router.post("/{incident_id}/broadcast")
async def broadcast_incident_alert(
    incident_id: int,
    custom_message: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Dispatches an emergency broadcast for an active incident and logs audit record.
    """
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    loc_name = inc.location.name if inc.location else "Monitored District"
    content = custom_message or f"EMERGENCY ADVISORY: {inc.title}. Severity: {inc.severity}. Immediate flood precautions active in {loc_name}."

    # If linked to prediction or has location, create alert entry
    pred = None
    if inc.prediction_id:
        pred = db.query(Prediction).filter(Prediction.id == inc.prediction_id).first()
    if not pred:
        pred = db.query(Prediction).filter(Prediction.location_id == inc.location_id).order_by(Prediction.timestamp.desc()).first()

    if pred:
        alert = Alert(
            prediction_id=pred.id,
            status="Sent",
            channel="Broadcast",
            recipient_info="All Regional Responders",
            alert_content=content
        )
        db.add(alert)
        db.commit()

    username = current_user.username if current_user else "operator"
    user_id = current_user.id if current_user else None

    log_audit(
        db,
        action_type="ALERT_BROADCAST",
        description=f"Emergency broadcast for Incident #{inc.id} ({inc.severity}) in {loc_name}",
        user_id=user_id,
        username=username,
        details=content
    )

    await manager.broadcast({
        "type": "MANUAL_BROADCAST_ALERT",
        "title": f"INCIDENT ALERT: {inc.title}",
        "message": content,
        "location_name": loc_name
    })

    return {
        "status": "success",
        "message": "Incident broadcast dispatched successfully",
        "incident_id": inc.id,
        "content": content
    }
