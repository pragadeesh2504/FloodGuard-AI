from pydantic import BaseModel
from typing import Optional

class ShelterCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    capacity: int
    current_occupancy: Optional[int] = 0
    contact_number: str
    status: Optional[str] = "Open"
    amenities: Optional[str] = None

class ShelterResponse(ShelterCreate):
    id: int

    class Config:
        from_attributes = True
