from typing import Optional
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

def log_audit(
    db: Session,
    action_type: str,
    description: str,
    user_id: Optional[int] = None,
    username: str = "system",
    details: Optional[str] = None
) -> AuditLog:
    """
    Persists an immutable audit log entry for system governance.
    """
    audit = AuditLog(
        user_id=user_id,
        username=username or "system",
        action_type=action_type,
        description=description,
        details=details
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit
