from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.location import Location
from app.schemas.prediction import LocationCreate, LocationResponse
from app.routes.auth import get_current_admin
from app.models.user import User

router = APIRouter(prefix="/locations", tags=["Locations"])

@router.get("", response_model=List[LocationResponse])
def get_locations(db: Session = Depends(get_db)):
    """
    Retrieves all monitored locations.
    """
    return db.query(Location).all()

@router.post("", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
def create_location(
    loc_in: LocationCreate,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Registers a new location to be monitored by the continuous climate engine.
    """
    # Check if location name already exists
    existing = db.query(Location).filter(Location.name == loc_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Location name already registered")

    db_loc = Location(**loc_in.dict())
    db.add(db_loc)
    db.commit()
    db.refresh(db_loc)
    return db_loc
