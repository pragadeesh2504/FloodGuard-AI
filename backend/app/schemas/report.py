from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.schemas.auth import UserResponse

class CitizenReportCreate(BaseModel):
    location_id: int
    latitude: float
    longitude: float
    description: str
    severity: str # Low, Moderate, High, Severe
    category: Optional[str] = "waterlogging" # waterlogging, river overflow, road blocked, drain overflow, house flooding, bridge risk, other
    image_url: Optional[str] = None

class CitizenReportStatusUpdate(BaseModel):
    verification_status: str # NEW, VERIFIED, REJECTED, DUPLICATE, ESCALATED
    notes: Optional[str] = None

class CitizenReportResponse(BaseModel):
    id: int
    location_id: int
    user_id: Optional[int] = None
    latitude: float
    longitude: float
    description: str
    severity: str
    category: Optional[str] = "waterlogging"
    image_url: Optional[str] = None
    is_verified: bool
    verification_status: Optional[str] = "NEW"
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    location_name: Optional[str] = None
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True
