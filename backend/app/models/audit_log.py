from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String, default="system", nullable=False)
    action_type = Column(String, nullable=False)  # MODE_CHANGE, INCIDENT_CREATE, INCIDENT_STATUS_CHANGE, ALERT_BROADCAST, REPORT_VERIFY, REPORT_ESCALATE, SHELTER_UPDATE, SYSTEM_SETTING
    description = Column(String, nullable=False)
    details = Column(Text, nullable=True)  # JSON or structured context

    user = relationship("User")
