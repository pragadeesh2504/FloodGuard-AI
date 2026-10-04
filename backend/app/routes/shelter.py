import math
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.shelter import Shelter
from app.models.location import Location
from app.models.prediction import Prediction
from app.schemas.shelter import ShelterCreate, ShelterResponse
from app.routes.auth import get_current_user, get_current_admin
from app.models.user import User
from app.utils.websocket_manager import manager
from app.utils.audit import log_audit

router = APIRouter(prefix="/shelters", tags=["Emergency Shelters & Evacuation"])

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 1)

@router.get("", response_model=List[ShelterResponse])
def get_shelters(db: Session = Depends(get_db)):
    """
    Retrieves all emergency shelters.
    """
    return db.query(Shelter).all()

@router.get("/evacuation-plan")
def get_evacuation_plan(db: Session = Depends(get_db)):
    """
    Evacuation Decision Support: Matches high-risk districts with nearest safe shelters having available capacity.
    Uses real geographic distance from district headquarters.
    """
    locations = db.query(Location).all()
    shelters = db.query(Shelter).all()

    # Calculate overall capacity metrics
    total_capacity = sum(s.capacity for s in shelters)
    total_occupied = sum(s.current_occupancy for s in shelters)
    total_available = total_capacity - total_occupied

    district_recommendations = []

    for loc in locations:
        # Get latest prediction
        latest_pred = (
            db.query(Prediction)
            .filter(Prediction.location_id == loc.id)
            .order_by(Prediction.timestamp.desc())
            .first()
        )
        risk_lvl = latest_pred.risk_level if latest_pred else "LOW"
        prob = latest_pred.flood_probability if latest_pred else 0.0

        # Find matching shelters
        candidate_shelters = []
        for s in shelters:
            avail = s.capacity - s.current_occupancy
            dist_km = haversine_km(loc.latitude, loc.longitude, s.latitude, s.longitude)
            is_open = s.status.lower() == "open"
            candidate_shelters.append({
                "shelter_id": s.id,
                "shelter_name": s.name,
                "distance_km": dist_km,
                "capacity": s.capacity,
                "current_occupancy": s.current_occupancy,
                "available_capacity": max(0, avail),
                "status": s.status,
                "contact_number": s.contact_number,
                "amenities": s.amenities or "Food, Water, First Aid",
                "is_recommended": is_open and avail > 0
            })

        # Sort candidate shelters by distance
        candidate_shelters.sort(key=lambda x: (not x["is_recommended"], x["distance_km"]))
        primary_shelter = next((s for s in candidate_shelters if s["is_recommended"]), None)

        is_priority = risk_lvl in ["HIGH", "VERY_HIGH", "CRITICAL"]

        district_recommendations.append({
            "location_id": loc.id,
            "district_name": loc.name,
            "risk_level": risk_lvl,
            "flood_probability": prob,
            "is_priority_zone": is_priority,
            "recommended_shelter": primary_shelter,
            "nearby_shelters": candidate_shelters[:3]
        })

    # Sort so priority zones appear first
    district_recommendations.sort(
        key=lambda x: (not x["is_priority_zone"], -x["flood_probability"])
    )

    return {
        "summary": {
            "total_shelters": len(shelters),
            "open_shelters": sum(1 for s in shelters if s.status.lower() == "open"),
            "total_capacity": total_capacity,
            "total_occupied": total_occupied,
            "total_available": total_available,
            "occupancy_rate_percent": round((total_occupied / total_capacity * 100.0) if total_capacity > 0 else 0, 1)
        },
        "district_evacuation_recommendations": district_recommendations,
        "methodology_note": "Distances calculated as direct geodesic distance from district centroid coordinates. Road routing is not claimed."
    }

@router.post("", response_model=ShelterResponse, status_code=status.HTTP_201_CREATED)
async def create_shelter(
    shelter_in: ShelterCreate,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Registers a new evacuation shelter (requires admin access).
    """
    if db.query(Shelter).filter(Shelter.name == shelter_in.name).first():
        raise HTTPException(status_code=400, detail="Shelter with this name already exists")

    db_shelter = Shelter(**shelter_in.dict())
    db.add(db_shelter)
    db.commit()
    db.refresh(db_shelter)

    log_audit(
        db,
        action_type="SHELTER_UPDATE",
        description=f"New shelter registered: {db_shelter.name} (Capacity: {db_shelter.capacity})",
        user_id=admin_user.id,
        username=admin_user.username,
        details=f"Status: {db_shelter.status}, Contact: {db_shelter.contact_number}"
    )

    # Broadcast shelter additions
    await manager.broadcast({
        "type": "NEW_SHELTER",
        "shelter": {
            "id": db_shelter.id,
            "name": db_shelter.name,
            "latitude": db_shelter.latitude,
            "longitude": db_shelter.longitude,
            "capacity": db_shelter.capacity,
            "current_occupancy": db_shelter.current_occupancy,
            "status": db_shelter.status,
            "amenities": db_shelter.amenities
        }
    })

    return db_shelter

@router.put("/{shelter_id}/occupancy", response_model=ShelterResponse)
async def update_occupancy(
    shelter_id: int,
    occupancy: int,
    status: str = "Open",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates the current occupancy of a shelter (requires authorized role) and logs audit entry.
    """
    shelter = db.query(Shelter).filter(Shelter.id == shelter_id).first()
    if not shelter:
        raise HTTPException(status_code=404, detail="Shelter not found")

    if occupancy < 0 or occupancy > shelter.capacity:
        raise HTTPException(status_code=400, detail="Occupancy must be between 0 and maximum capacity")

    old_occ = shelter.current_occupancy
    old_status = shelter.status

    shelter.current_occupancy = occupancy
    shelter.status = status
    db.commit()
    db.refresh(shelter)

    log_audit(
        db,
        action_type="SHELTER_UPDATE",
        description=f"Shelter '{shelter.name}' occupancy updated: {old_occ}/{shelter.capacity} -> {occupancy}/{shelter.capacity} ({status})",
        user_id=current_user.id,
        username=current_user.username,
        details=f"Available: {shelter.capacity - occupancy}"
    )

    # Broadcast occupancy update
    await manager.broadcast({
        "type": "SHELTER_OCCUPANCY_UPDATE",
        "shelter_id": shelter.id,
        "current_occupancy": shelter.current_occupancy,
        "status": shelter.status
    })

    return shelter
