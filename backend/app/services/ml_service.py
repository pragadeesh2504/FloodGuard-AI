import sys
import os
import json
import pandas as pd
from datetime import datetime, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.config import settings

# Global cache for baseline parameters
_BASELINE_CACHE = None

def get_climatology_baseline() -> dict:
    global _BASELINE_CACHE
    if _BASELINE_CACHE is not None:
        return _BASELINE_CACHE

    baseline_path = os.path.join(settings.MODELS_DIR, "rainfall_baseline.json")
    if os.path.exists(baseline_path):
        try:
            with open(baseline_path, 'r', encoding='utf-8') as f:
                _BASELINE_CACHE = json.load(f)
                return _BASELINE_CACHE
        except Exception as e:
            print(f"Error loading climatology baseline from {baseline_path}: {e}")

    # Fallback default baseline values if file missing
    _BASELINE_CACHE = {
        "chennai": {"1": 1.0, "2": 0.5, "3": 0.5, "4": 1.0, "5": 2.0, "6": 3.0, "7": 4.0, "8": 5.0, "9": 6.0, "10": 10.0, "11": 15.0, "12": 8.0},
        "coimbatore": {"1": 0.5, "2": 0.5, "3": 1.0, "4": 2.0, "5": 3.0, "6": 2.0, "7": 3.0, "8": 3.0, "9": 4.0, "10": 8.0, "11": 7.0, "12": 3.0}
    }
    return _BASELINE_CACHE

# Make sure models directory is on path
if settings.MODELS_DIR not in sys.path:
    sys.path.append(settings.MODELS_DIR)
if settings.ML_MODEL_DIR not in sys.path:
    sys.path.append(settings.ML_MODEL_DIR)

try:
    from predict import predict_risk
except ImportError:
    parent_dir = os.path.dirname(settings.ML_MODEL_DIR)
    if parent_dir not in sys.path:
        sys.path.append(parent_dir)
    from ml_pipeline.predict import predict_risk

def run_ml_prediction(db: Session, location, current_weather: dict) -> dict:
    """
    Computes rolling rainfall metrics and climatological deviations from the database
    logs history, and queries the best-trained ML model for flood risk prediction.
    """
    from app.models.prediction import WeatherReading

    # 1. Map location name to canonical district ID (e.g. "Chennai Municipal School" -> "chennai")
    loc_name = location.name.lower()
    district_id = "chennai"
    districts = [
        "chennai", "coimbatore", "cuddalore", "nagapattinam", "thanjavur",
        "tiruvallur", "kancheepuram", "thoothukudi", "tirunelveli", "kanyakumari"
    ]
    for d in districts:
        if d in loc_name:
            district_id = d
            break

    # 2. Get current daily values
    rainfall_1d = float(current_weather.get("rainfall_24h", 0.0))
    current_time = datetime.utcnow()
    month = current_time.month

    # Month-Aware Season Mapping (0: Winter, 1: Summer, 2: Southwest Monsoon, 3: Northeast Monsoon)
    if month in [1, 2]:
        season = 0
    elif month in [3, 4, 5]:
        season = 1
    elif month in [6, 7, 8, 9]:
        season = 2
    else:
        season = 3

    # 3. Calculate climatological baseline deviation
    baseline = get_climatology_baseline()
    baseline_val = baseline.get(district_id, {}).get(str(month), 0.0)
    rainfall_deviation = rainfall_1d - baseline_val

    # 4. Calculate rolling features from past WeatherReadings in DB
    # Query daily historical values
    past_readings = (
        db.query(
            func.date(WeatherReading.timestamp).label("day"),
            func.max(WeatherReading.rainfall_24h).label("max_rain")
        )
        .filter(WeatherReading.location_id == location.id)
        .filter(WeatherReading.timestamp < current_time.date())
        .group_by(func.date(WeatherReading.timestamp))
        .order_by(func.date(WeatherReading.timestamp).desc())
        .limit(14)
        .all()
    )

    # Map past daily values
    past_days = {r.day: float(r.max_rain) for r in past_readings if r.day and r.max_rain is not None}
    sorted_past_vals = [past_days[d] for d in sorted(past_days.keys())]

    # Fallback to heuristics if database history is sparse
    if len(sorted_past_vals) >= 2:
        rainfall_3d = sum(sorted_past_vals[-2:]) + rainfall_1d
    else:
        rainfall_3d = rainfall_1d * 1.5

    if len(sorted_past_vals) >= 6:
        rainfall_7d = sum(sorted_past_vals[-6:]) + rainfall_1d
    else:
        rainfall_7d = rainfall_1d * 2.5

    if len(sorted_past_vals) >= 13:
        rainfall_14d = sum(sorted_past_vals[-13:]) + rainfall_1d
    else:
        rainfall_14d = rainfall_1d * 4.0

    # 5. Trend and rate features (Section 8)
    yesterday_rainfall = sorted_past_vals[-1] if len(sorted_past_vals) >= 1 else 0.0
    rainfall_change_1d = rainfall_1d - yesterday_rainfall

    if len(sorted_past_vals) >= 3:
        yesterday_3d = sum(sorted_past_vals[-3:])
    else:
        yesterday_3d = rainfall_3d * 0.9
    rainfall_change_3d = rainfall_3d - yesterday_3d
    rainfall_rate_3d = rainfall_change_3d / 3.0

    # 6. Pack variables for ML predict pipeline matching exactly model_metadata.json
    ml_input = {
        "rainfall_1d": rainfall_1d,
        "rainfall_3d": rainfall_3d,
        "rainfall_7d": rainfall_7d,
        "rainfall_14d": rainfall_14d,
        "rainfall_change_1d": rainfall_change_1d,
        "rainfall_change_3d": rainfall_change_3d,
        "rainfall_rate_3d": rainfall_rate_3d,
        "rainfall_deviation": rainfall_deviation,
        "temperature": current_weather["temperature"],
        "humidity": current_weather["humidity"],
        "pressure": current_weather["pressure"],
        "wind_speed": current_weather["wind_speed"],
        "latitude": location.latitude,
        "longitude": location.longitude,
        "month": month,
        "season": season
    }

    # 7. Execute ML prediction using the best-trained classifier
    pred_res = predict_risk(ml_input, settings.MODELS_DIR)

    # Calculate mock telemetry for river rise rate
    prev_reading = (
        db.query(WeatherReading)
        .filter(WeatherReading.location_id == location.id)
        .order_by(WeatherReading.timestamp.desc())
        .first()
    )

    river_rise_rate = 0.0
    if prev_reading:
        delta_level = current_weather["river_level"] - prev_reading.river_level
        td = current_time - prev_reading.timestamp
        time_diff = max(0.01, td.total_seconds() / 3600.0) if hasattr(td, "total_seconds") else 0.0833
        river_rise_rate = delta_level / time_diff
        river_rise_rate = max(-2.0, min(5.0, river_rise_rate))

    # Append mock telemetries with labels
    pred_res["river_rise_rate"] = river_rise_rate
    pred_res["rainfall_intensity"] = current_weather["rainfall_intensity"]
    pred_res["soil_saturation"] = current_weather["soil_moisture"] / 100.0

    # Add historical warning context (Section 12)
    # Chennai default values based on analysis
    pred_res["historical_reference"] = {
        "district": district_id,
        "mean_monthly_rainfall": baseline_val,
        "threshold_3d_median": 3.1,  # Default median
        "threshold_3d_p90": 98.68   # Default p90
    }

    # Customize if it matches Chennai specifically
    if district_id == "chennai":
        pred_res["historical_reference"]["threshold_3d_median"] = 3.1
        pred_res["historical_reference"]["threshold_3d_p90"] = 98.68

    return pred_res
