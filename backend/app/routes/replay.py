import os
import sys
import pandas as pd
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

from app.config import settings

try:
    from predict import predict_risk
except ImportError:
    if settings.MODELS_DIR not in sys.path:
        sys.path.append(settings.MODELS_DIR)
    from predict import predict_risk

router = APIRouter(prefix="/replay", tags=["Historical Flood Replay"])

EVENTS = [
    {
        "id": "cuddalore_2021",
        "name": "Coastal Tamil Nadu Monsoonal Inundation (Nov 2021)",
        "district": "cuddalore",
        "start_date": "2021-11-04",
        "end_date": "2021-11-20",
        "methodology_label": "OUT-OF-SAMPLE HISTORICAL MODEL REPLAY",
        "is_out_of_sample": True,
        "description": "Intense Northeast Monsoon trough over coastal districts. Evaluated strictly on the untouched 2021–2023 chronological test partition."
    },
    {
        "id": "south_tn_2023",
        "name": "South Tamil Nadu Deluge & Cyclone Michaung (Dec 2023)",
        "district": "thoothukudi",
        "start_date": "2023-12-10",
        "end_date": "2023-12-22",
        "methodology_label": "OUT-OF-SAMPLE HISTORICAL MODEL REPLAY",
        "is_out_of_sample": True,
        "description": "Record-breaking convective precipitation (>240mm/day) across southern river basins. Evaluated strictly on the untouched 2021–2023 chronological test partition."
    },
    {
        "id": "chennai_2015",
        "name": "Chennai Historic Deluge (Nov–Dec 2015)",
        "district": "chennai",
        "start_date": "2015-11-22",
        "end_date": "2015-12-08",
        "methodology_label": "RETROSPECTIVE HISTORICAL CONTEXT",
        "is_out_of_sample": False,
        "description": "Historic Bay of Bengal depression and reservoir overflow over Chennai metropolitan area. Note: Inside the model training period (2010–2020)."
    }
]

DISTRICT_COORDS = {
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

# Cache processed sequences to ensure near-instant replay rendering
_REPLAY_CACHE: Dict[str, Dict[str, Any]] = {}

def load_replay_sequence(event_cfg: dict) -> Dict[str, Any]:
    event_id = event_cfg["id"]
    if event_id in _REPLAY_CACHE:
        return _REPLAY_CACHE[event_id]

    csv_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "processed", "weather_labeled.csv")
    csv_path = os.path.abspath(csv_path)
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=500, detail="Historical weather data file not found.")

    df = pd.read_csv(csv_path)
    dist = event_cfg["district"].lower()
    df_dist = df[df["city"].str.lower() == dist].copy()
    df_dist["date"] = pd.to_datetime(df_dist["date"])
    df_dist = df_dist.sort_values("date").reset_index(drop=True)

    # Compute rolling causal features identically to ML pipeline
    df_dist["rainfall_1d"] = df_dist["precipitation"].fillna(0.0)
    df_dist["rainfall_3d"] = df_dist["precipitation"].rolling(3, min_periods=1).sum().fillna(0.0)
    df_dist["rainfall_7d"] = df_dist["precipitation"].rolling(7, min_periods=1).sum().fillna(0.0)
    df_dist["rainfall_14d"] = df_dist["precipitation"].rolling(14, min_periods=1).sum().fillna(0.0)
    df_dist["rainfall_change_1d"] = df_dist["precipitation"].diff().fillna(0.0)
    df_dist["rainfall_change_3d"] = df_dist["rainfall_3d"].diff().fillna(0.0)
    df_dist["rainfall_rate_3d"] = (df_dist["rainfall_change_3d"] / 3.0).fillna(0.0)
    df_dist["month"] = df_dist["date"].dt.month
    df_dist["season"] = df_dist["month"].map(
        lambda m: 0 if m in [1, 2] else (1 if m in [3, 4, 5] else (2 if m in [6, 7, 8, 9] else 3))
    )

    # Climatology baseline for rainfall deviation
    from app.services.ml_service import get_climatology_baseline
    baseline = get_climatology_baseline()
    lat, lon = DISTRICT_COORDS.get(dist, (13.0827, 80.2707))

    start_dt = pd.to_datetime(event_cfg["start_date"])
    end_dt = pd.to_datetime(event_cfg["end_date"])
    sub = df_dist[(df_dist["date"] >= start_dt) & (df_dist["date"] <= end_dt)].copy()

    sequence = []
    for _, row in sub.iterrows():
        month = int(row["month"])
        base_val = baseline.get(dist, {}).get(str(month), 0.0)
        deviation = float(row["rainfall_1d"]) - float(base_val)

        feat_dict = {
            "rainfall_1d": float(row["rainfall_1d"]),
            "rainfall_3d": float(row["rainfall_3d"]),
            "rainfall_7d": float(row["rainfall_7d"]),
            "rainfall_14d": float(row["rainfall_14d"]),
            "rainfall_change_1d": float(row["rainfall_change_1d"]),
            "rainfall_change_3d": float(row["rainfall_change_3d"]),
            "rainfall_rate_3d": float(row["rainfall_rate_3d"]),
            "rainfall_deviation": float(deviation),
            "temperature": float(row["temperature"]),
            "humidity": float(row["humidity"]),
            "pressure": float(row["pressure"]),
            "wind_speed": float(row["wind_speed"]),
            "latitude": float(lat),
            "longitude": float(lon),
            "month": month,
            "season": int(row["season"])
        }

        # Real model inference
        pred_res = predict_risk(feat_dict, settings.MODELS_DIR)
        prob = float(pred_res["flood_probability"])
        r_level = pred_res["risk_level"]
        explanations = pred_res["ai_explanation"]

        is_doc_flood = bool(row["is_flood"] == 1) if "is_flood" in row else False

        sequence.append({
            "date": row["date"].strftime("%Y-%m-%d"),
            "precipitation": round(float(row["precipitation"]), 1),
            "rainfall_1d": round(float(row["rainfall_1d"]), 1),
            "rainfall_3d": round(float(row["rainfall_3d"]), 1),
            "rainfall_7d": round(float(row["rainfall_7d"]), 1),
            "rainfall_14d": round(float(row["rainfall_14d"]), 1),
            "temperature": round(float(row["temperature"]), 1),
            "humidity": round(float(row["humidity"]), 1),
            "pressure": round(float(row["pressure"]), 1),
            "wind_speed": round(float(row["wind_speed"]), 1),
            "rainfall_deviation": round(float(deviation), 1),
            "flood_probability": round(prob, 4),
            "risk_level": r_level,
            "standard_breached": prob >= 0.58,
            "emergency_breached": prob >= 0.33,
            "contributing_factors": explanations,
            "is_documented_flood": is_doc_flood
        })

    result = {
        "event_id": event_id,
        "name": event_cfg["name"],
        "district": event_cfg["district"].capitalize(),
        "methodology_label": event_cfg["methodology_label"],
        "is_out_of_sample": event_cfg["is_out_of_sample"],
        "description": event_cfg["description"],
        "total_days": len(sequence),
        "peak_rainfall": max(d["precipitation"] for d in sequence) if sequence else 0.0,
        "peak_probability": max(d["flood_probability"] for d in sequence) if sequence else 0.0,
        "sequence": sequence
    }
    _REPLAY_CACHE[event_id] = result
    return result

@router.get("/events")
def get_replay_events():
    """
    Returns the list of available historical replay events with their partition labels.
    """
    return EVENTS

@router.get("/{event_id}")
def get_replay_detail(event_id: str):
    """
    Returns the complete day-by-day historical sequence and model prediction evolution for a given event.
    """
    matched = next((e for e in EVENTS if e["id"] == event_id), None)
    if not matched:
        raise HTTPException(status_code=404, detail=f"Replay event '{event_id}' not found.")
    return load_replay_sequence(matched)
