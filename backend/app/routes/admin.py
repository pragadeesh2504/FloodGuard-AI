from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.models.prediction import Prediction
from app.models.alert import Alert
from app.models.audit_log import AuditLog
from app.schemas.auth import UserResponse
from app.schemas.audit_log import AuditLogResponse
from app.routes.auth import get_current_admin
from app.utils.websocket_manager import manager
from app.utils.audit import log_audit

router = APIRouter(prefix="/admin", tags=["Admin Control Portal"])

@router.get("/users", response_model=List[UserResponse])
def get_all_users(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """
    Returns all registered platform users.
    """
    return db.query(User).all()

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """
    Deletes a user account from the platform.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")

    username_del = user.username
    db.delete(user)
    db.commit()

    log_audit(
        db,
        action_type="USER_DELETE",
        description=f"User deleted: {username_del} (ID: {user_id})",
        user_id=admin.id,
        username=admin.username
    )

    return None

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = 100,
    action_type: Optional[str] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Retrieves system audit trail recording real operator actions.
    """
    query = db.query(AuditLog)
    if action_type:
        query = query.filter(AuditLog.action_type == action_type.upper())
    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return logs

@router.post("/broadcast-alert")
async def broadcast_manual_alert(
    title: str,
    message: str,
    location_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Allows admin users to manually broadcast a public warning alert.
    """
    from app.models.location import Location

    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    # Find latest prediction to link the alert to
    pred = (
        db.query(Prediction)
        .filter(Prediction.location_id == location_id)
        .order_by(Prediction.timestamp.desc())
        .first()
    )

    if not pred:
        raise HTTPException(status_code=400, detail="Cannot link manual alert: No predictions exist for this location yet.")

    full_message = f"[MANUAL BROADCAST: {title.upper()}] {message} - Location: {loc.name}"

    alert = Alert(
        prediction_id=pred.id,
        status="Sent",
        channel="Broadcast",
        recipient_info="All Citizens",
        alert_content=full_message
    )
    db.add(alert)
    db.commit()

    log_audit(
        db,
        action_type="ALERT_BROADCAST",
        description=f"Manual broadcast: {title} in {loc.name}",
        user_id=admin.id,
        username=admin.username,
        details=full_message
    )

    # Broadcast alert immediately via WebSocket
    await manager.broadcast({
        "type": "MANUAL_BROADCAST_ALERT",
        "title": title,
        "message": full_message,
        "location_name": loc.name
    })

    return {"message": "Manual alert broadcasted successfully", "alert_content": full_message}
