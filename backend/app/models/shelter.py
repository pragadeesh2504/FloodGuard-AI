from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Shelter(Base):
    __tablename__ = "shelters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity = Column(Integer, nullable=False)
    current_occupancy = Column(Integer, default=0)
    contact_number = Column(String, nullable=False)
    status = Column(String, default="Open") # Open, Closed, Full
    amenities = Column(String, nullable=True) # Comma separated list (e.g. "Food,Medical,Water")
