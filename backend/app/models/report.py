from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class CitizenReport(Base):
    __tablename__ = "citizen_reports"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Optional link to registered user

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    severity = Column(String, nullable=False) # Low, Moderate, High, Severe
    category = Column(String, default="waterlogging", nullable=True) # waterlogging, river overflow, road blocked, drain overflow, house flooding, bridge risk, other
    image_url = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    verification_status = Column(String, default="NEW", nullable=True) # NEW, VERIFIED, REJECTED, DUPLICATE, ESCALATED
    verified_by = Column(String, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    location = relationship("Location", back_populates="reports")
    user = relationship("User")
