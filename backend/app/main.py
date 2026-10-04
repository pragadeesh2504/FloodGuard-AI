import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.utils.websocket_manager import manager
from app.services.monitoring_engine import start_continuous_monitoring

# Import routers
from app.routes import auth, prediction, report, shelter, locations, admin, analytics, incident, replay

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FloodGuard AI",
    description="Enterprise disaster management & early warning platform",
    version="1.0.0"
)

# Set CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth, prefix="/api")
app.include_router(prediction, prefix="/api")
app.include_router(report, prefix="/api")
app.include_router(shelter, prefix="/api")
app.include_router(locations, prefix="/api")
app.include_router(admin, prefix="/api")
app.include_router(analytics, prefix="/api")
app.include_router(incident, prefix="/api")
app.include_router(replay, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "FloodGuard AI API Service is online and monitoring climate indices."}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Keep connection alive
        while True:
            # Wait for any message (not strictly needed, but keeps link alive)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Seed database on startup
def seed_database():
    db = SessionLocal()
    try:
        from app.models.location import Location
        from app.models.shelter import Shelter
        from app.models.user import User
        from app.utils.security import get_password_hash

        # 1. Seed Locations if empty or containing old data
        existing_names = [l.name for l in db.query(Location).all()]
        if len(existing_names) == 0 or "Chennai Metro" in existing_names:
            db.query(Location).delete()
            db.query(Shelter).delete()

            locations = [
                Location(name="Chennai", latitude=13.0827, longitude=80.2707, elevation=6.0, distance_from_river=150.0, population_density=26553, historical_flood_frequency=0.85),
                Location(name="Coimbatore", latitude=11.0168, longitude=76.9558, elevation=411.0, distance_from_river=2500.0, population_density=1000, historical_flood_frequency=0.30),
                Location(name="Cuddalore", latitude=11.7480, longitude=79.7714, elevation=6.0, distance_from_river=800.0, population_density=800, historical_flood_frequency=0.65),
                Location(name="Nagapattinam", latitude=10.7672, longitude=79.8449, elevation=4.0, distance_from_river=300.0, population_density=700, historical_flood_frequency=0.70),
                Location(name="Thanjavur", latitude=10.7870, longitude=79.1378, elevation=57.0, distance_from_river=600.0, population_density=900, historical_flood_frequency=0.55),
                Location(name="Tiruvallur", latitude=13.1438, longitude=79.9077, elevation=38.0, distance_from_river=1200.0, population_density=1100, historical_flood_frequency=0.50),
                Location(name="Kancheepuram", latitude=12.8342, longitude=79.7036, elevation=83.0, distance_from_river=1400.0, population_density=1300, historical_flood_frequency=0.45),
                Location(name="Thoothukudi", latitude=8.7974, longitude=78.1348, elevation=4.0, distance_from_river=500.0, population_density=1200, historical_flood_frequency=0.40),
                Location(name="Tirunelveli", latitude=8.7139, longitude=77.7567, elevation=47.0, distance_from_river=400.0, population_density=1000, historical_flood_frequency=0.50),
                Location(name="Kanyakumari", latitude=8.0883, longitude=77.5385, elevation=13.0, distance_from_river=900.0, population_density=1100, historical_flood_frequency=0.35)
            ]
            db.add_all(locations)
            db.commit()
            print("[DB SEED] 10 Tamil Nadu districts registered successfully.")

        # 2. Seed Emergency Shelters if empty
        if db.query(Shelter).count() == 0:
            shelters = [
                Shelter(name="Chennai Municipal School Shelter", latitude=13.0900, longitude=80.2600, capacity=500, current_occupancy=42, contact_number="+91-44-25384510", status="Open", amenities="Food,Water,Medical"),
                Shelter(name="Cuddalore Community Hall Shelter", latitude=11.7500, longitude=79.7700, capacity=300, current_occupancy=12, contact_number="+91-41-42230005", status="Open", amenities="Food,Water,Medical"),
                Shelter(name="Nagapattinam Coastal Relief Shelter", latitude=10.7700, longitude=79.8400, capacity=400, current_occupancy=0, contact_number="+91-43-65224105", status="Open", amenities="Water,Beds"),
                Shelter(name="Thanjavur Delta Safety Camp", latitude=10.7900, longitude=79.1300, capacity=350, current_occupancy=15, contact_number="+91-43-62230122", status="Open", amenities="Food,Water")
            ]
            db.add_all(shelters)
            db.commit()
            print("[DB SEED] Tamil Nadu shelters seeded successfully.")


        # 3. Seed Default Admin if empty
        if db.query(User).filter(User.role == "admin").count() == 0:
            import secrets
            admin_username = settings.ADMIN_USERNAME or "admin"
            admin_email = settings.ADMIN_EMAIL or "admin@floodguard.gov.in"

            if settings.ADMIN_INITIAL_PASSWORD and settings.ADMIN_INITIAL_PASSWORD.strip():
                admin_password = settings.ADMIN_INITIAL_PASSWORD.strip()
                admin_user = User(
                    username=admin_username,
                    email=admin_email,
                    hashed_password=get_password_hash(admin_password),
                    role="admin"
                )
                db.add(admin_user)
                db.commit()
                print(f"[SECURITY] Administrator user '{admin_username}' initialized using configured environment password.")
            else:
                bootstrap_password = secrets.token_urlsafe(24)
                admin_user = User(
                    username=admin_username,
                    email=admin_email,
                    hashed_password=get_password_hash(bootstrap_password),
                    role="admin"
                )
                db.add(admin_user)
                db.commit()
                print("=" * 70)
                print("[SECURITY] INITIAL FIRST-RUN ADMINISTRATOR SETUP")
                print(f"[SECURITY] Administrator username : {admin_username}")
                print(f"[SECURITY] One-time bootstrap key : {bootstrap_password}")
                print("[SECURITY] Save this credential immediately. It will NOT be shown again.")
                print("=" * 70)

    finally:
        db.close()

@app.on_event("startup")
async def startup_event():
    seed_database()
    # Run continuous monitoring task in the background
    asyncio.create_task(start_continuous_monitoring())
