import os

class Settings:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "floodguard_ai_secret_super_secure_key_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours

    # Database URL: defaults to SQLite for local ease, override with PostgreSQL in production
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'floodguard.db'))}")

    # Administrator bootstrap configuration (first-run setup)
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@floodguard.gov.in")
    ADMIN_INITIAL_PASSWORD: str = os.getenv("ADMIN_INITIAL_PASSWORD", "")

    # ML Model directory
    ML_MODEL_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml_pipeline"))
    MODELS_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "models"))

    # Weather Settings (Open-Meteo)
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1/forecast"

    # Automatic monitoring interval
    MONITORING_INTERVAL_MINUTES: int = 5

    # Operational modes: "STANDARD" (default, threshold 0.58) or "EMERGENCY" (threshold 0.33)
    OPERATING_MODE: str = os.getenv("OPERATING_MODE", "STANDARD")
    STANDARD_THRESHOLD: float = 0.58   # Standard Mode: Accuracy 83.14% (meets >=80% requirement), Recall 85.29%
    EMERGENCY_THRESHOLD: float = 0.33  # Emergency Mode: Recall 97.06%, Accuracy 71.24% (trades accuracy for life-safety)

    def get_current_threshold(self) -> float:
        if str(self.OPERATING_MODE).upper() == "EMERGENCY":
            return self.EMERGENCY_THRESHOLD
        return self.STANDARD_THRESHOLD

    @property
    def ALERT_PROBABILITY_THRESHOLD(self) -> float:
        return self.get_current_threshold()

    # Live Pipeline intervals and alert cooldown (Section 19 & Section 29)
    WEATHER_UPDATE_INTERVAL_MINUTES: int = 60
    ALERT_COOLDOWN_HOURS: int = 24

settings = Settings()
