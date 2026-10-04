from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class IncidentBase(BaseModel):
    location_id: int
    prediction_id: Optional[int] = None
    title: str
    severity: str  # LOW, MODERATE, HIGH, CRITICAL
    contributing_factors: Optional[str] = None
    assigned_to: Optional[str] = "NDRF Unit / TN-SDRF Rapid Response"
    action_plan: Optional[str] = "Deploy rapid assessment team, review nearest shelter readiness, monitor gauge levels."
    notes: Optional[str] = ""

class IncidentCreate(IncidentBase):
    pass

class IncidentStatusUpdate(BaseModel):
    lifecycle_status: str  # NEW, INVESTIGATING, ACTIVE, ESCALATED, RESOLVED
    notes: Optional[str] = None

class IncidentResponse(IncidentBase):
    id: int
    lifecycle_status: str
    created_at: datetime
    updated_at: datetime
    location_name: Optional[str] = None

    class Config:
        from_attributes = True
