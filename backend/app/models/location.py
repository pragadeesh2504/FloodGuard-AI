from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    elevation = Column(Float, default=10.0)
    distance_from_river = Column(Float, default=1000.0) # meters
    population_density = Column(Integer, default=5000) # people/sq km
    historical_flood_frequency = Column(Float, default=0.1) # scale 0 to 1

    predictions = relationship("Prediction", back_populates="location")
    reports = relationship("CitizenReport", back_populates="location")
    weather_readings = relationship("WeatherReading", back_populates="location")
