import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add paths
backend_dir = os.path.dirname(__file__)
sys.path.insert(0, backend_dir)
root_dir = os.path.abspath(os.path.join(backend_dir, ".."))
sys.path.insert(0, os.path.join(root_dir, "ml_pipeline"))

from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.location import Location
from app.models.incident import Incident
from app.models.audit_log import AuditLog
from app.models.report import CitizenReport
from app.models.shelter import Shelter
from app.utils.security import create_access_token

client = TestClient(app)

@pytest.fixture(scope="module")
def admin_headers():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == "admin").first()
        assert admin is not None, "Admin user must exist"
        token = create_access_token(subject=admin.username, role=admin.role)
        return {"Authorization": f"Bearer {token}"}
    finally:
        db.close()

def test_1_incident_creation(admin_headers):
    """Test creating an operational incident with default NEW status."""
    db = SessionLocal()
    try:
        loc = db.query(Location).first()
        assert loc is not None
        loc_id = loc.id
    finally:
        db.close()

    payload = {
        "location_id": loc_id,
        "title": "Severe Water Surge in Adyar Basin",
        "severity": "HIGH",
        "contributing_factors": "Contributing risk factor: 7-day rainfall accumulation exceeded historical baseline by 85mm",
        "assigned_to": "NDRF Battalion 4",
        "action_plan": "Establish mobile pumps and inspect low-lying bridge underpasses.",
        "notes": "Automated alert triggered from high probability reading."
    }

    res = client.post("/api/incidents", json=payload, headers=admin_headers)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["id"] > 0
    assert data["lifecycle_status"] == "NEW"
    assert data["severity"] == "HIGH"
    assert "location_name" in data
    assert data["location_name"] is not None

def test_2_status_transition(admin_headers):
    """Test incident status transitions: NEW -> INVESTIGATING -> ACTIVE -> ESCALATED."""
    db = SessionLocal()
    try:
        inc = db.query(Incident).order_by(Incident.id.desc()).first()
        assert inc is not None
        inc_id = inc.id
    finally:
        db.close()

    # Transition to INVESTIGATING
    res = client.put(f"/api/incidents/{inc_id}/status", json={"lifecycle_status": "INVESTIGATING", "notes": "Recon team dispatched"}, headers=admin_headers)
    assert res.status_code == 200, res.text
    assert res.json()["lifecycle_status"] == "INVESTIGATING"

    # Transition to ACTIVE
    res = client.put(f"/api/incidents/{inc_id}/status", json={"lifecycle_status": "ACTIVE", "notes": "Water level rising rapidly at culvert"}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["lifecycle_status"] == "ACTIVE"

    # Transition to ESCALATED
    res = client.put(f"/api/incidents/{inc_id}/status", json={"lifecycle_status": "ESCALATED", "notes": "Evacuation order recommended for sector 3"}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["lifecycle_status"] == "ESCALATED"

def test_3_incident_resolution(admin_headers):
    """Test incident resolution to RESOLVED."""
    db = SessionLocal()
    try:
        inc = db.query(Incident).order_by(Incident.id.desc()).first()
        inc_id = inc.id
    finally:
        db.close()

    res = client.put(f"/api/incidents/{inc_id}/status", json={"lifecycle_status": "RESOLVED", "notes": "Flood waters receded. Pumps cleared."}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["lifecycle_status"] == "RESOLVED"

def test_4_report_escalation(admin_headers):
    """Test escalating a verified citizen report into an active incident."""
    db = SessionLocal()
    try:
        loc = db.query(Location).first()
        report = CitizenReport(
            location_id=loc.id,
            latitude=loc.latitude,
            longitude=loc.longitude,
            description="Submerged underpass blocking state highway 49",
            severity="Severe",
            category="road blocked",
            is_verified=False,
            verification_status="NEW"
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        rep_id = report.id
    finally:
        db.close()

    # Escalate to incident
    res = client.post(f"/api/reports/{rep_id}/escalate", headers=admin_headers)
    assert res.status_code == 200, res.text
    inc_data = res.json()
    assert inc_data["id"] > 0
    assert inc_data["lifecycle_status"] == "ACTIVE"
    assert "Road Blocked" in inc_data["title"] or "road blocked" in inc_data["title"].lower()

    # Verify report status in DB
    db = SessionLocal()
    try:
        rep_check = db.query(CitizenReport).filter(CitizenReport.id == rep_id).first()
        assert rep_check.verification_status == "ESCALATED"
        assert rep_check.is_verified is True
    finally:
        db.close()

def test_5_shelter_evacuation_advisor():
    """Test shelter evacuation decision support endpoint."""
    res = client.get("/api/shelters/evacuation-plan")
    assert res.status_code == 200, res.text
    data = res.json()
    assert "summary" in data
    assert "district_evacuation_recommendations" in data
    summary = data["summary"]
    assert summary["total_shelters"] >= 4
    assert summary["total_capacity"] > 0
    assert "occupancy_rate_percent" in summary
    assert len(data["district_evacuation_recommendations"]) == 10

    # Check recommendation format
    rec0 = data["district_evacuation_recommendations"][0]
    assert "district_name" in rec0
    assert "risk_level" in rec0
    assert "recommended_shelter" in rec0
    assert "nearby_shelters" in rec0
    if rec0["recommended_shelter"]:
        assert "distance_km" in rec0["recommended_shelter"]
        assert "available_capacity" in rec0["recommended_shelter"]

def test_6_audit_log_creation_and_retrieval(admin_headers):
    """Test audit log creation and retrieval."""
    res = client.get("/api/admin/audit-logs", headers=admin_headers)
    assert res.status_code == 200, res.text
    logs = res.json()
    assert isinstance(logs, list)
    assert len(logs) > 0, "Audit logs should have captured incident transitions and escalations"

    actions = [l["action_type"] for l in logs]
    assert any("INCIDENT" in a or "REPORT" in a for a in actions)

def test_7_replay_endpoints():
    """Test historical flood replay events and data sequence."""
    # 1. Events list
    res = client.get("/api/replay/events")
    assert res.status_code == 200, res.text
    events = res.json()
    assert len(events) >= 3
    event_ids = [e["id"] for e in events]
    assert "cuddalore_2021" in event_ids
    assert "south_tn_2023" in event_ids
    assert "chennai_2015" in event_ids

    # Verify methodology labels
    cuddalore = next(e for e in events if e["id"] == "cuddalore_2021")
    assert cuddalore["methodology_label"] == "OUT-OF-SAMPLE HISTORICAL MODEL REPLAY"
    assert cuddalore["is_out_of_sample"] is True

    chennai = next(e for e in events if e["id"] == "chennai_2015")
    assert chennai["methodology_label"] == "RETROSPECTIVE HISTORICAL CONTEXT"
    assert chennai["is_out_of_sample"] is False

    # 2. Detailed sequence replay
    res_seq = client.get("/api/replay/cuddalore_2021")
    assert res_seq.status_code == 200, res_seq.text
    seq_data = res_seq.json()
    assert seq_data["total_days"] > 0
    assert seq_data["peak_rainfall"] > 0
    assert seq_data["peak_probability"] > 0

    first_day = seq_data["sequence"][0]
    assert "date" in first_day
    assert "rainfall_1d" in first_day
    assert "flood_probability" in first_day
    assert "risk_level" in first_day
    assert "standard_breached" in first_day
    assert "emergency_breached" in first_day

def test_8_authorization():
    """Test authorization boundaries on protected endpoints."""
    # Without token, audit logs should return 401
    res = client.get("/api/admin/audit-logs")
    assert res.status_code == 401

    # Without token, broadcast-alert should return 401
    res = client.post("/api/admin/broadcast-alert?title=Test&message=Test&location_id=1")
    assert res.status_code == 401

def test_9_database_persistence():
    """Ensure database records are properly persisted in backend/floodguard.db."""
    db = SessionLocal()
    try:
        u_count = db.query(User).count()
        l_count = db.query(Location).count()
        s_count = db.query(Shelter).count()
        assert u_count >= 12
        assert l_count == 10
        assert s_count == 4
    finally:
        db.close()

def test_10_operating_mode_toggle_and_metrics(admin_headers):
    """Verify operating mode toggle, threshold change, and verified ML metrics."""
    # 1. Get current mode
    res = client.get("/api/predictions/mode")
    assert res.status_code == 200
    orig_mode = res.json()["operating_mode"]

    # 2. Toggle to EMERGENCY
    res_em = client.post("/api/predictions/mode", json={"mode": "EMERGENCY"})
    assert res_em.status_code == 200
    assert res_em.json()["operating_mode"] == "EMERGENCY"
    assert res_em.json()["threshold"] == 0.33

    # 3. Toggle back to STANDARD (Default)
    res_std = client.post("/api/predictions/mode", json={"mode": "STANDARD"})
    assert res_std.status_code == 200
    assert res_std.json()["operating_mode"] == "STANDARD"
    assert res_std.json()["threshold"] == 0.58

    # 4. Verify analytics metrics
    res_an = client.get("/api/analytics")
    assert res_an.status_code == 200
    an_data = res_an.json()
    assert round(an_data["model_accuracy"], 4) == 0.8314
    assert round(an_data["model_recall"], 4) == 0.8529
    assert round(an_data["model_roc_auc"], 4) == 0.9314
    assert round(an_data["model_pr_auc"], 4) == 0.0873
