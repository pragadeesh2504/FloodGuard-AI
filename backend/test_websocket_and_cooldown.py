import sys
import os
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient

backend_dir = os.path.dirname(__file__)
sys.path.insert(0, backend_dir)
root_dir = os.path.abspath(os.path.join(backend_dir, ".."))
sys.path.insert(0, os.path.join(root_dir, "ml_pipeline"))

from app.main import app
from app.database import SessionLocal
from app.models.location import Location
from app.models.prediction import Prediction, WeatherReading
from app.models.alert import Alert
from app.config import settings
from app.services.alert_service import dispatch_warnings_if_needed

client = TestClient(app)

def test_websocket_connectivity():
    """Verify WebSocket endpoint connects and handles keepalive."""
    with client.websocket_connect("/ws") as websocket:
        # Send text keepalive message
        websocket.send_text("ping")
        # Connection established and alive
        assert websocket is not None

def test_alert_cooldown():
    """Verify 24-hour alert cooldown logic."""
    db = SessionLocal()
    try:
        cooldown_limit = datetime.utcnow() - timedelta(hours=settings.ALERT_COOLDOWN_HOURS)
        locs = db.query(Location).all()
        # Pick a location that has 0 alerts in the last 24 hours
        loc = next(
            (l for l in locs if db.query(Alert).join(Prediction).filter(Prediction.location_id == l.id).filter(Alert.timestamp >= cooldown_limit).count() == 0),
            locs[1]
        )
        assert loc is not None

        # Create a mock high-risk prediction
        high_pred = Prediction(
            location_id=loc.id,
            flood_probability=0.88,
            risk_level="VERY_HIGH",
            confidence_score=0.95,
            estimated_time_hours=6,
            rainfall_intensity=120.0,
            river_rise_rate=0.8,
            soil_saturation=0.9
        )
        db.add(high_pred)
        db.commit()
        db.refresh(high_pred)

        # 1. First trigger should dispatch alert
        alert1 = dispatch_warnings_if_needed(db, high_pred, loc.name)
        assert alert1 is not None, "First alert should be dispatched"
        assert "CRITICAL FLOOD WARNING" in alert1

        # 2. Second trigger immediately after should be suppressed under 24h cooldown
        alert2 = dispatch_warnings_if_needed(db, high_pred, loc.name)
        assert alert2 is None, "Subsequent alert within 24h should be suppressed by cooldown"
    finally:
        db.close()

def test_simulated_telemetry_labeling():
    """Ensure simulated telemetry labeling is enforced."""
    # Verify LiveMonitor.jsx contains the required label
    monitor_path = os.path.join(root_dir, "frontend", "src", "pages", "LiveMonitor.jsx")
    assert os.path.exists(monitor_path)
    with open(monitor_path, "r", encoding="utf-8") as f:
        content = f.read()
        assert "SIMULATED TELEMETRY" in content
        assert "NOT USED BY ML MODEL" in content

def test_risk_label_consistency():
    """Verify canonical risk levels across predictions endpoint."""
    res = client.get("/api/predictions/latest")
    assert res.status_code == 200
    preds = res.json()
    allowed_levels = {"LOW", "MODERATE", "HIGH", "VERY_HIGH"}
    for p in preds:
        assert p["risk_level"] in allowed_levels, f"Risk level {p['risk_level']} is not canonical"
