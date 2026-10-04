import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.location import Location
from app.models.prediction import WeatherReading, Prediction
from app.services.weather_service import fetch_live_weather
from app.services.ml_service import run_ml_prediction
from app.services.alert_service import dispatch_warnings_if_needed
from app.utils.websocket_manager import manager

async def run_monitoring_cycle():
    """
    Executes a single cycle of the 24/7 Flood Surveillance Engine.
    For each registered location, it fetches weather, runs ML predictions,
    saves logs, dispatches alerts, and broadcasts updates via WebSockets.
    """
    db: Session = SessionLocal()
    try:
        locations = db.query(Location).all()
        if not locations:
            print("[MONITORING ENGINE] No active locations found in the database. Cycle skipped.")
            return

        print(f"[MONITORING ENGINE] Starting cycle for {len(locations)} locations...")

        for loc in locations:
            try:
                # 1. Fetch live metrics from weather API
                weather_data = fetch_live_weather(loc.latitude, loc.longitude)

                # 2. Save WeatherReading to DB
                reading = WeatherReading(
                    location_id=loc.id,
                    temperature=weather_data["temperature"],
                    humidity=weather_data["humidity"],
                    rainfall_intensity=weather_data["rainfall_intensity"],
                    rainfall_24h=weather_data["rainfall_24h"],
                    rainfall_48h=weather_data["rainfall_48h"],
                    wind_speed=weather_data["wind_speed"],
                    pressure=weather_data["pressure"],
                    river_level=weather_data["river_level"],
                    soil_moisture=weather_data["soil_moisture"]
                )
                db.add(reading)
                db.commit()
                db.refresh(reading)

                # 3. Predict flood risk using trained model
                pred_res = run_ml_prediction(db, loc, weather_data)

                # 4. Save Prediction record
                prediction = Prediction(
                    location_id=loc.id,
                    flood_probability=pred_res["flood_probability"],
                    risk_level=pred_res["risk_level"],
                    confidence_score=pred_res["confidence_score"],
                    estimated_time_hours=pred_res["estimated_time_hours"],
                    rainfall_intensity=pred_res["rainfall_intensity"],
                    river_rise_rate=pred_res["river_rise_rate"],
                    soil_saturation=pred_res["soil_saturation"],
                    ai_explanation=pred_res["ai_explanation"],
                    model_version=pred_res["model_version"]
                )
                db.add(prediction)
                db.commit()
                db.refresh(prediction)

                # 5. Dispatch alerts if thresholds exceeded
                alert_dispatched = dispatch_warnings_if_needed(db, prediction, loc.name)

                # 6. Broadcast via WebSockets
                broadcast_payload = {
                    "type": "MONITORING_UPDATE",
                    "timestamp": datetime.utcnow().isoformat(),
                    "location_id": loc.id,
                    "location_name": loc.name,
                    "weather": {
                        "temperature": reading.temperature,
                        "humidity": reading.humidity,
                        "rainfall_24h": reading.rainfall_24h,
                        "river_level": reading.river_level,
                        "soil_moisture": reading.soil_moisture
                    },
                    "prediction": {
                        "id": prediction.id,
                        "probability": prediction.flood_probability,
                        "risk_level": prediction.risk_level,
                        "confidence": prediction.confidence_score,
                        "estimated_time_hours": prediction.estimated_time_hours,
                        "ai_explanation": prediction.ai_explanation,
                        "model_version": prediction.model_version
                    },
                    "alert_dispatched": alert_dispatched is not None,
                    "alert_message": alert_dispatched
                }

                # Run the broadcast asynchronously
                await manager.broadcast(broadcast_payload)

                print(f"[MONITORING ENGINE] Location '{loc.name}' processed successfully. Probability: {prediction.flood_probability*100:.1f}%.")

            except Exception as e:
                db.rollback()
                print(f"[MONITORING ENGINE] Error processing location '{loc.name}': {e}")
                import traceback
                traceback.print_exc()

    finally:
        db.close()

async def start_continuous_monitoring():
    """
    Background loop that runs the surveillance engine continuously every 5 minutes.
    """
    from app.config import settings
    interval_seconds = settings.MONITORING_INTERVAL_MINUTES * 60

    # Wait a few seconds for initial setup / DB seed to complete
    await asyncio.sleep(5)

    print("[MONITORING ENGINE] 24/7 Flood Surveillance Engine started successfully.")
    while True:
        try:
            await run_monitoring_cycle()
        except Exception as e:
            print(f"[MONITORING ENGINE] Critical monitoring loop error: {e}")
        await asyncio.sleep(interval_seconds)
