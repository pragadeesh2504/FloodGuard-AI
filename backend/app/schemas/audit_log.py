from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    user_id: Optional[int] = None
    username: str
    action_type: str
    description: str
    details: Optional[str] = None

    class Config:
        from_attributes = True
