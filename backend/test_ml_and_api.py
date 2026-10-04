import os
import sys
import json
import joblib
import pytest
import pandas as pd
from fastapi.testclient import TestClient

# Make sure backend app is importable
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.append(project_root)
if current_dir not in sys.path:
    sys.path.append(current_dir)

from app.main import app
from app.config import settings
from app.services.ml_service import get_climatology_baseline
from ml_pipeline.predict import predict_risk

client = TestClient(app)

# 1. Dataset Loading test
def test_dataset_loading():
    labeled_path = os.path.join(project_root, "data", "processed", "weather_labeled.csv")
    assert os.path.exists(labeled_path), f"Processed labeled weather file missing: {labeled_path}"
    df = pd.read_csv(labeled_path)
    assert len(df) > 0, "Dataset is empty!"
    assert "city" in df.columns or "district" in df.columns
    assert "is_flood" in df.columns

# 2. Preprocessing & Splitting tests
def test_preprocessing_and_splits():
    train_path = os.path.join(project_root, "data", "processed", "train_features.csv")
    test_path = os.path.join(project_root, "data", "processed", "test_features.csv")

    assert os.path.exists(train_path)
    assert os.path.exists(test_path)

    train_df = pd.read_csv(train_path)
    test_df = pd.read_csv(test_path)

    # Chronological validation
    assert train_df['date'].max() < test_df['date'].min(), "Leakage: Chronological split boundary violated!"
    # Excluded buffer check
    assert not train_df['is_buffer'].any(), "Error: Excluded buffer dates found in training split!"
    assert not test_df['is_buffer'].any(), "Error: Excluded buffer dates found in testing split!"

# 3. Feature Generation test
def test_feature_generation():
    train_path = os.path.join(project_root, "data", "processed", "train_features.csv")
    df = pd.read_csv(train_path)
    # Check that engineered rolling precipitation columns are computed
    assert "rainfall_3d" in df.columns
    assert "rainfall_7d" in df.columns
    assert "rainfall_14d" in df.columns
    assert "rainfall_change_1d" in df.columns
    assert "rainfall_change_3d" in df.columns
    assert "rainfall_rate_3d" in df.columns
    assert "rainfall_deviation" in df.columns
    # Rolling calculations check
    assert (df["rainfall_3d"] >= df["rainfall_1d"] - 1e-5).all(), "Feature computation mismatch: 3d sum less than 1d!"

# 4. Model Loading test
def test_model_loading():
    pipeline_path = os.path.join(project_root, "models", "best_model.joblib")
    metadata_path = os.path.join(project_root, "models", "model_metadata.json")
    baseline_path = os.path.join(project_root, "models", "rainfall_baseline.json")

    assert os.path.exists(pipeline_path)
    assert os.path.exists(metadata_path)
    assert os.path.exists(baseline_path)

    # Test loading
    pipeline = joblib.load(pipeline_path)
    assert hasattr(pipeline, "predict_proba"), "Loaded joblib is not a Scikit-Learn prediction pipeline!"

# 5. Prediction Inference test
def test_prediction_inference():
    test_input = {
        "rainfall_1d": 12.0, "rainfall_3d": 25.0, "rainfall_7d": 40.0, "rainfall_14d": 80.0,
        "rainfall_change_1d": 2.0, "rainfall_change_3d": 5.0, "rainfall_rate_3d": 1.67,
        "rainfall_deviation": 5.0, "temperature": 28.0, "humidity": 80.0, "pressure": 1008.0,
        "wind_speed": 12.0, "latitude": 13.0827, "longitude": 80.2707, "month": 11, "season": 3
    }
    res = predict_risk(test_input, os.path.join(project_root, "models"))
    assert "flood_probability" in res
    assert "risk_level" in res
    assert "ai_explanation" in res
    assert 0.0 <= res["flood_probability"] <= 1.0


# 6. API Prediction Endpoint tests
def test_api_predict_valid():
    payload = {
        "rainfall_1d": 120.0,
        "rainfall_3d": 280.0,
        "rainfall_7d": 410.0,
        "rainfall_deviation": 180.0,
        "temperature": 28.5,
        "humidity": 91.0,
        "latitude": 13.0827,
        "longitude": 80.2707
    }
    res = client.post("/api/predictions/predict", json=payload)
    assert res.status_code == 200, f"API failed: {res.text}"
    data = res.json()
    assert "prediction" in data
    assert "probability" in data
    assert "risk_level" in data
    assert "explanation" in data
    assert "threshold_used" in data
    assert "operating_mode" in data

def test_api_predict_invalid():
    # Passing string for rainfall
    payload = {
        "rainfall_1d": "extreme_rain",
        "rainfall_3d": 280.0,
        "rainfall_7d": 410.0,
        "temperature": 28.5,
        "humidity": 91.0,
        "latitude": 13.0827,
        "longitude": 80.2707
    }
    res = client.post("/api/predictions/predict", json=payload)
    assert res.status_code == 422 # Pydantic validation error

def test_api_predict_missing():
    # Missing required coordinates fields (latitude, longitude)
    payload = {
        "rainfall_1d": 120.0,
        "rainfall_3d": 280.0,
        "rainfall_7d": 410.0,
        "temperature": 28.5,
        "humidity": 91.0
    }
    res = client.post("/api/predictions/predict", json=payload)
    assert res.status_code == 422

# 7. Operating Mode Tests
def test_operating_mode_get_and_toggle():
    # GET mode
    res = client.get("/api/predictions/mode")
    assert res.status_code == 200
    data = res.json()
    assert data["standard_threshold"] == 0.58
    assert data["emergency_threshold"] == 0.33

    # Toggle to EMERGENCY
    res_toggle = client.post("/api/predictions/mode", json={"mode": "EMERGENCY"})
    assert res_toggle.status_code == 200
    assert res_toggle.json()["operating_mode"] == "EMERGENCY"
    assert res_toggle.json()["threshold"] == 0.33

    # Toggle back to STANDARD
    res_back = client.post("/api/predictions/mode", json={"mode": "STANDARD"})
    assert res_back.status_code == 200
    assert res_back.json()["operating_mode"] == "STANDARD"
    assert res_back.json()["threshold"] == 0.58

# 8. Database Prediction storage
def test_db_prediction_storage():
    from app.database import SessionLocal
    from app.models.prediction import Prediction

    db = SessionLocal()
    try:
        preds = db.query(Prediction).limit(5).all()
        for p in preds:
            assert p.flood_probability is not None
            assert p.risk_level in ["LOW", "MODERATE", "HIGH", "VERY_HIGH", "VERY HIGH", "CRITICAL", "Safe", "Low Risk", "Moderate Risk", "High Risk", "Severe Flood Risk"]
            assert p.model_version is not None
    finally:
        db.close()
