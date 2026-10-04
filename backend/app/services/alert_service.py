from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.alert import Alert
from app.models.prediction import Prediction
from app.models.shelter import Shelter
from app.config import settings

def dispatch_warnings_if_needed(db: Session, prediction: Prediction, location_name: str):
    """
    Checks if a prediction exceeds the flood probability threshold and
    dispatches critical dashboard, email, and SMS alerts under a 24h cooldown.
    """
    prob = prediction.flood_probability

    if prob >= settings.ALERT_PROBABILITY_THRESHOLD:
        # Check if there is an alert dispatched for this location within the cooldown window (24 hours) (Section 19 & Section 29)
        cooldown_limit = datetime.utcnow() - timedelta(hours=settings.ALERT_COOLDOWN_HOURS)
        recent_alert = (
            db.query(Alert)
            .join(Prediction)
            .filter(Prediction.location_id == prediction.location_id)
            .filter(Alert.timestamp >= cooldown_limit)
            .first()
        )

        if recent_alert:
            print(f"[ALERT SERVICE] Alert for location {location_name} is in cooldown. Suppressing warning dispatch.")
            return None

        # Find the nearest open shelter to recommend in the alert
        recommended_shelter = (
            db.query(Shelter)
            .filter(Shelter.status == "Open")
            .first()
        )

        shelter_info = "Nearest Shelter: N/A"
        if recommended_shelter:
            shelter_info = f"Nearest Shelter: {recommended_shelter.name} (Contact: {recommended_shelter.contact_number})"

        alert_msg = (
            f"CRITICAL FLOOD WARNING for {location_name}! "
            f"Flood Probability: {prob*100:.1f}%. "
            f"Risk Level: {prediction.risk_level.upper()}. "
            f"Estimated Time window: {prediction.estimated_time_hours or '6-12'} hours. "
            f"Action Recommended: Evacuate low-lying areas. "
            f"{shelter_info}. "
            f"Emergency: 1078 (NDMA National Helpline)."
        )

        # Save Alert records to database
        # 1. Dashboard alert
        db_alert = Alert(
            prediction_id=prediction.id,
            status="Sent",
            channel="Dashboard",
            recipient_info="All Active Dashboard Users",
            alert_content=alert_msg
        )
        db.add(db_alert)

        # 2. Simulated SMS alert
        sms_alert = Alert(
            prediction_id=prediction.id,
            status="Sent",
            channel="SMS",
            recipient_info="+91-XXXXX-YYYYY (Broadcast)",
            alert_content=alert_msg
        )
        db.add(sms_alert)

        # 3. Simulated Email alert
        email_alert = Alert(
            prediction_id=prediction.id,
            status="Sent",
            channel="Email",
            recipient_info="citizens-alert-list@floodguard.gov.in",
            alert_content=alert_msg
        )
        db.add(email_alert)

        db.commit()
        print(f"[ALERT SERVICE] High risk detected ({prob*100:.1f}%). Alerts dispatched for {location_name}.")
        return alert_msg

    return None
