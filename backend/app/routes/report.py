from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.report import CitizenReport
from app.models.location import Location
from app.models.incident import Incident
from app.schemas.report import CitizenReportCreate, CitizenReportResponse, CitizenReportStatusUpdate
from app.schemas.incident import IncidentResponse
from app.routes.auth import get_current_user, get_current_admin
from app.models.user import User
from app.utils.websocket_manager import manager
from app.utils.audit import log_audit

router = APIRouter(prefix="/reports", tags=["Citizen Reports"])

VALID_CATEGORIES = [
    "waterlogging", "river overflow", "road blocked",
    "drain overflow", "house flooding", "bridge risk", "other"
]
VALID_STATUSES = ["NEW", "VERIFIED", "REJECTED", "DUPLICATE", "ESCALATED"]

def format_report(r: CitizenReport) -> CitizenReportResponse:
    loc_name = r.location.name if r.location else "Unknown District"
    return CitizenReportResponse(
        id=r.id,
        location_id=r.location_id,
        user_id=r.user_id,
        latitude=r.latitude,
        longitude=r.longitude,
        description=r.description,
        severity=r.severity,
        category=r.category or "waterlogging",
        image_url=r.image_url,
        is_verified=bool(r.is_verified),
        verification_status=r.verification_status or ("VERIFIED" if r.is_verified else "NEW"),
        verified_by=r.verified_by,
        verified_at=r.verified_at,
        created_at=r.created_at,
        location_name=loc_name
    )

@router.get("", response_model=List[CitizenReportResponse])
def get_all_reports(
    verified_only: bool = False,
    verification_status: Optional[str] = None,
    category: Optional[str] = None,
    location_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Retrieves citizen flood reports with optional filters for verification status, category, or location.
    """
    query = db.query(CitizenReport)
    if verified_only:
        query = query.filter(CitizenReport.is_verified == True)
    if verification_status:
        query = query.filter(CitizenReport.verification_status == verification_status.upper())
    if category:
        query = query.filter(CitizenReport.category == category.lower())
    if location_id:
        query = query.filter(CitizenReport.location_id == location_id)

    reports = query.order_by(CitizenReport.created_at.desc()).all()
    return [format_report(r) for r in reports]

@router.post("", response_model=CitizenReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    report_in: CitizenReportCreate,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new citizen flood report. Attaches user ID if authenticated.
    Broadcasts report update via WebSockets in real time.
    """
    loc = db.query(Location).filter(Location.id == report_in.location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    cat = (report_in.category or "waterlogging").lower().strip()
    if cat not in VALID_CATEGORIES:
        cat = "waterlogging"

    db_report = CitizenReport(
        location_id=report_in.location_id,
        user_id=current_user.id if current_user else None,
        latitude=report_in.latitude,
        longitude=report_in.longitude,
        description=report_in.description,
        severity=report_in.severity,
        category=cat,
        image_url=report_in.image_url,
        is_verified=False,
        verification_status="NEW"
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    # Broadcast to dashboard clients
    await manager.broadcast({
        "type": "NEW_CITIZEN_REPORT",
        "report": {
            "id": db_report.id,
            "location_name": loc.name,
            "latitude": db_report.latitude,
            "longitude": db_report.longitude,
            "description": db_report.description,
            "severity": db_report.severity,
            "category": db_report.category,
            "is_verified": db_report.is_verified,
            "verification_status": db_report.verification_status,
            "created_at": db_report.created_at.isoformat() if db_report.created_at else None
        }
    })

    return format_report(db_report)

@router.put("/{report_id}/status", response_model=CitizenReportResponse)
async def update_report_status(
    report_id: int,
    req: CitizenReportStatusUpdate,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Allows administrator or emergency staff to update citizen report verification status.
    """
    report = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    st = req.verification_status.upper().strip()
    if st not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid verification status. Must be one of: {', '.join(VALID_STATUSES)}")

    old_status = report.verification_status
    report.verification_status = st
    report.is_verified = (st in ["VERIFIED", "ESCALATED"])
    report.verified_by = admin_user.username
    report.verified_at = datetime.utcnow()

    db.commit()
    db.refresh(report)

    # Log audit entry
    log_audit(
        db,
        action_type="REPORT_VERIFY",
        description=f"Citizen report #{report.id} verification: {old_status} -> {st}",
        user_id=admin_user.id,
        username=admin_user.username,
        details=f"Category: {report.category}, Notes: {req.notes or 'None'}"
    )

    await manager.broadcast({
        "type": "REPORT_STATUS_CHANGED",
        "report_id": report.id,
        "verification_status": report.verification_status,
        "is_verified": report.is_verified
    })

    return format_report(report)

@router.put("/{report_id}/verify", response_model=CitizenReportResponse)
async def verify_report(
    report_id: int,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Backward-compatible verification endpoint.
    """
    req = CitizenReportStatusUpdate(verification_status="VERIFIED")
    return await update_report_status(report_id, req, admin_user, db)

@router.post("/{report_id}/escalate", response_model=IncidentResponse)
async def escalate_report_to_incident(
    report_id: int,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Converts a verified citizen report into an active operational incident in the disaster response workflow.
    """
    report = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Citizen report not found")

    loc = db.query(Location).filter(Location.id == report.location_id).first()
    loc_name = loc.name if loc else "Monitored District"

    # Map severity
    sev_map = {"Low": "LOW", "Moderate": "MODERATE", "High": "HIGH", "Severe": "CRITICAL"}
    incident_sev = sev_map.get(report.severity, "HIGH")

    # Create new operational incident
    inc = Incident(
        location_id=report.location_id,
        title=f"Citizen Escallation: {str(report.category).title()} in {loc_name}",
        severity=incident_sev,
        lifecycle_status="ACTIVE",
        contributing_factors=f"Citizen Report #{report.id}: {report.description} (Category: {report.category})",
        assigned_to="NDRF Unit / TN-SDRF Rapid Response",
        action_plan="Field verification team dispatched. Review regional shelter availability and pump drainage.",
        notes=f"Escalated from Citizen Report #{report.id} by {admin_user.username} on {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}."
    )
    db.add(inc)

    # Update report status to ESCALATED
    report.verification_status = "ESCALATED"
    report.is_verified = True
    report.verified_by = admin_user.username
    report.verified_at = datetime.utcnow()

    db.commit()
    db.refresh(inc)
    db.refresh(report)

    # Log audit entry
    log_audit(
        db,
        action_type="REPORT_ESCALATE",
        description=f"Citizen report #{report.id} escalated to Incident #{inc.id} ({inc.severity})",
        user_id=admin_user.id,
        username=admin_user.username,
        details=f"Incident title: {inc.title}"
    )

    # Broadcast WebSocket
    await manager.broadcast({
        "type": "REPORT_ESCALATED",
        "report_id": report.id,
        "incident_id": inc.id,
        "incident_title": inc.title,
        "severity": inc.severity,
        "location_name": loc_name
    })

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
        notes=inc.notes,
        created_at=inc.created_at,
        updated_at=inc.updated_at,
        location_name=loc_name
    )
