from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class WeatherReading(Base):
    __tablename__ = "weather_readings"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    rainfall_intensity = Column(Float, nullable=False) # mm/h
    rainfall_24h = Column(Float, nullable=False) # mm
    rainfall_48h = Column(Float, nullable=False) # mm
    wind_speed = Column(Float, nullable=False) # km/h
    pressure = Column(Float, nullable=False) # hPa
    river_level = Column(Float, nullable=False) # m
    soil_moisture = Column(Float, nullable=False) # %

    location = relationship("Location", back_populates="weather_readings")

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    flood_probability = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False) # Safe, Low, Moderate, High, Severe
    confidence_score = Column(Float, nullable=False)
    estimated_time_hours = Column(Integer, nullable=True) # Hours until potential flood

    # Snapshot of parameters at prediction time
    rainfall_intensity = Column(Float, nullable=False)
    river_rise_rate = Column(Float, nullable=False)
    soil_saturation = Column(Float, nullable=False)

    # Explainable AI results (List of strings)
    ai_explanation = Column(JSON, nullable=True)

    model_version = Column(String, default="1.0.0")

    location = relationship("Location", back_populates="predictions")
    alerts = relationship("Alert", back_populates="prediction")
