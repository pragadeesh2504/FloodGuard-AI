from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    status = Column(String, default="Pending") # Pending, Sent, Failed
    channel = Column(String, nullable=False) # Dashboard, SMS, Email, Push
    recipient_info = Column(String, nullable=True) # Mobile number or email address
    alert_content = Column(String, nullable=False)

    prediction = relationship("Prediction", back_populates="alerts")
