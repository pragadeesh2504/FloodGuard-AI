from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=True)

    title = Column(String, nullable=False)
    severity = Column(String, nullable=False)  # LOW, MODERATE, HIGH, CRITICAL
    lifecycle_status = Column(String, default="NEW", nullable=False)  # NEW, INVESTIGATING, ACTIVE, ESCALATED, RESOLVED
    contributing_factors = Column(Text, nullable=True)  # e.g., "Contributing risk factor: 7-day rainfall accumulation"
    assigned_to = Column(String, default="NDRF Unit / TN-SDRF Rapid Response", nullable=False)
    action_plan = Column(Text, default="Deploy rapid assessment team, review nearest shelter readiness, monitor gauge levels.", nullable=False)
    notes = Column(Text, default="", nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    location = relationship("Location")
    prediction = relationship("Prediction")
