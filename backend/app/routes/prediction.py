from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import sys

from app.database import get_db
from app.models.prediction import Prediction, WeatherReading
from app.models.location import Location
from app.models.alert import Alert
from app.schemas.prediction import (
    PredictionResponse, WeatherReadingResponse, PredictionRequest,
    PredictionAPIResponse, OperatingModeResponse, OperatingModeRequest
)
from app.config import settings

try:
    from predict import predict_risk
except ImportError:
    if settings.MODELS_DIR not in sys.path:
        sys.path.append(settings.MODELS_DIR)
    from predict import predict_risk


from app.utils.websocket_manager import manager
from app.utils.audit import log_audit

router = APIRouter(prefix="/predictions", tags=["Predictions & Weather"])

@router.get("/mode", response_model=OperatingModeResponse)
def get_operating_mode():
    """
    Returns current active operational mode (Standard Monitoring vs High-Sensitivity Emergency Mode)
    along with corresponding threshold and academic disclaimers.
    """
    current_mode = str(settings.OPERATING_MODE).upper()
    thresh = settings.get_current_threshold()

    if current_mode == "EMERGENCY":
        desc = (
            "High-Sensitivity Emergency Mode (Threshold 0.33, Recall 97.06%, Accuracy 71.24%). "
            "Deliberately prioritizes life-safety recall and does NOT satisfy the >=80% accuracy constraint."
        )
        status = "Active - Life Safety Priority (High False Alarm Burden: 28.84% FPR)"
    else:
        desc = (
            "Standard Monitoring Mode (Threshold 0.58, Accuracy 83.14%, Recall 85.29%, PR-AUC 0.0873). "
            "Satisfies the project >=80% Accuracy requirement with controlled operational false alarms."
        )
        status = "Active - Standard Operational Surveillance (FPR: 16.87%)"

    return OperatingModeResponse(
        operating_mode=current_mode,
        threshold=thresh,
        standard_threshold=settings.STANDARD_THRESHOLD,
        emergency_threshold=settings.EMERGENCY_THRESHOLD,
        status=status,
        description=desc
    )

@router.post("/mode", response_model=OperatingModeResponse)
async def set_operating_mode(req: OperatingModeRequest, db: Session = Depends(get_db)):
    """
    Toggles the active operating mode between STANDARD (0.58) and EMERGENCY (0.33).
    Logs audit trail and broadcasts mode update.
    """
    target = req.mode.strip().upper()
    if target not in ["STANDARD", "EMERGENCY"]:
        raise HTTPException(status_code=400, detail="Invalid mode. Must be 'STANDARD' or 'EMERGENCY'.")

    old_mode = settings.OPERATING_MODE
    settings.OPERATING_MODE = target
    thresh = settings.get_current_threshold()

    log_audit(
        db,
        action_type="MODE_CHANGE",
        description=f"Operating mode toggled: {old_mode} -> {target} (Threshold: {thresh})",
        username="operator",
        details=f"Target: {target}, Threshold: {thresh}"
    )

    await manager.broadcast({
        "type": "OPERATING_MODE_CHANGED",
        "operating_mode": target,
        "threshold": thresh
    })

    return get_operating_mode()


@router.get("/latest", response_model=List[PredictionResponse])
def get_latest_predictions(db: Session = Depends(get_db)):
    """
    Returns the latest risk prediction for all monitored locations.
    """
    locations = db.query(Location).all()
    latest_preds = []

    for loc in locations:
        pred = (
            db.query(Prediction)
            .filter(Prediction.location_id == loc.id)
            .order_by(Prediction.timestamp.desc())
            .first()
        )
        if pred:
            latest_preds.append(pred)

    return latest_preds

@router.get("/{location_id}/history", response_model=List[PredictionResponse])
def get_prediction_history(location_id: int, limit: int = 50, db: Session = Depends(get_db)):
    """
    Returns historical risk predictions for a specific location.
    """
    preds = (
        db.query(Prediction)
        .filter(Prediction.location_id == location_id)
        .order_by(Prediction.timestamp.desc())
        .limit(limit)
        .all()
    )
    return preds

@router.get("/{location_id}/weather-history", response_model=List[WeatherReadingResponse])
def get_weather_history(location_id: int, limit: int = 50, db: Session = Depends(get_db)):
    """
    Returns historical weather readings for a specific location (useful for trend charts).
    """
    readings = (
        db.query(WeatherReading)
        .filter(WeatherReading.location_id == location_id)
        .order_by(WeatherReading.timestamp.desc())
        .limit(limit)
        .all()
    )
    # Reverse to chronological order for line charts
    readings.reverse()
    return readings

@router.get("/alerts", response_model=List[dict])
def get_active_alerts(db: Session = Depends(get_db)):
    """
    Returns recent critical dashboard alert warnings.
    """
    # Fetch alerts created in the last 24 hours
    since = datetime.utcnow() - timedelta(hours=24)
    alerts = (
        db.query(Alert)
        .filter(Alert.timestamp >= since)
        .order_by(Alert.timestamp.desc())
        .all()
    )

    result = []
    for a in alerts:
        # Get location information
        loc = None
        if a.prediction:
            loc = a.prediction.location

        result.append({
            "id": a.id,
            "prediction_id": a.prediction_id,
            "timestamp": a.timestamp,
            "status": a.status,
            "channel": a.channel,
            "alert_content": a.alert_content,
            "location_name": loc.name if loc else "Unknown"
        })
    return result

@router.post("/predict", response_model=PredictionAPIResponse)
def post_prediction(req: PredictionRequest):
    """
    Accepts daily weather snapshot features and computes flood risk percentage.
    """
    month = req.month or datetime.utcnow().month

    # Month-Aware Season Mapping (0: Winter, 1: Summer, 2: Southwest Monsoon, 3: Northeast Monsoon)
    season = req.season
    if season is None:
        if month in [1, 2]:
            season = 0
        elif month in [3, 4, 5]:
            season = 1
        elif month in [6, 7, 8, 9]:
            season = 2
        else:
            season = 3

    # Trend Features Calculation
    rainfall_14d = req.rainfall_14d if req.rainfall_14d is not None else (req.rainfall_7d * 1.5)
    rainfall_change_1d = req.rainfall_change_1d if req.rainfall_change_1d is not None else 0.0
    rainfall_change_3d = req.rainfall_change_3d if req.rainfall_change_3d is not None else 0.0
    rainfall_rate_3d = req.rainfall_rate_3d if req.rainfall_rate_3d is not None else (rainfall_change_3d / 3.0)

    input_dict = {
        "rainfall_1d": req.rainfall_1d,
        "rainfall_3d": req.rainfall_3d,
        "rainfall_7d": req.rainfall_7d,
        "rainfall_14d": rainfall_14d,
        "rainfall_change_1d": rainfall_change_1d,
        "rainfall_change_3d": rainfall_change_3d,
        "rainfall_rate_3d": rainfall_rate_3d,
        "rainfall_deviation": req.rainfall_deviation or 0.0,
        "temperature": req.temperature,
        "humidity": req.humidity,
        "pressure": req.pressure,
        "wind_speed": req.wind_speed,
        "latitude": req.latitude,
        "longitude": req.longitude,
        "month": month,
        "season": season
    }

    if req.rainfall_deviation is None:
        from app.services.ml_service import get_climatology_baseline
        baseline = get_climatology_baseline()

        # Coordinates mapping for closest district lookup
        COORDINATES = {
            "chennai": (13.0827, 80.2707),
            "coimbatore": (11.0168, 76.9558),
            "cuddalore": (11.7480, 79.7714),
            "nagapattinam": (10.7672, 79.8449),
            "thanjavur": (10.7870, 79.1378),
            "tiruvallur": (13.1438, 79.9077),
            "kancheepuram": (12.8342, 79.7036),
            "thoothukudi": (8.7974, 78.1348),
            "tirunelveli": (8.7139, 77.7567),
            "kanyakumari": (8.0883, 77.5385)
        }

        closest_dist = "chennai"
        min_d = float('inf')
        for d, (lat, lon) in COORDINATES.items():
            dist = (req.latitude - lat)**2 + (req.longitude - lon)**2
            if dist < min_d:
                min_d = dist
                closest_dist = d

        baseline_val = baseline.get(closest_dist, {}).get(str(month), 0.0)
        input_dict["rainfall_deviation"] = req.rainfall_1d - baseline_val

    try:
        res = predict_risk(input_dict, settings.MODELS_DIR)
        prob = res["flood_probability"]
        current_threshold = settings.get_current_threshold()
        prediction_val = 1 if prob >= current_threshold else 0

        return PredictionAPIResponse(
            prediction=prediction_val,
            probability=prob,
            risk_level=res["risk_level"],
            threshold_used=current_threshold,
            operating_mode=settings.OPERATING_MODE,
            explanation=res["ai_explanation"],
            model_name=res["model_name"],
            model_version=res["model_version"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
