# Architecture Audit Report

This document audits the existing architecture and components of the FloodGuard AI project.

---

## 1. Existing System Components

### Frontend (React + Vite + Tailwind CSS)
*   **Pages:**
    *   `Dashboard.jsx`: Glassmorphic control center displaying current surveillance statistics, probability gauge, weather parameters, prediction logs, and active warnings.
    *   `GISMap.jsx`: Leaflet map demonstrating spatial locations with circular risk markers.
    *   `CitizenPortal.jsx`: Interface for water level and waterlogging submission form.
    *   `AdminPortal.jsx`: Internal control console enabling manual warning broadcasts.
    *   `Analytics.jsx`: Historical metrics, model importances, and distribution statistics.
*   **Components:**
    *   `FloodGauge.jsx`: Concentric semi-circle rendering risk percentages.
    *   `Layout.jsx`: Application navigation wrapper.
    *   `PredictionTimeline.jsx`: Expandable details displaying Explainable AI (XAI) factors.
    *   `StatCard.jsx`: Reusable tiles showing weather indicators.

### Backend (FastAPI + SQLAlchemy + SQLite)
*   **API Routers (`routes/`):**
    *   `auth.py`: Token generation, registration, and user authentication.
    *   `prediction.py`: Retrieves predictions, history logs, and triggers forecasts.
    *   `locations.py`: Lists coordinates and administrative metrics for monitored locations.
    *   `report.py`: Manages submissions of citizen flood warnings.
    *   `shelter.py`: Returns directory of evacuation points.
    *   `admin.py`: Manual warning broadcasts.
    *   `analytics.py`: Model weights and historical aggregations.
*   **Services (`services/`):**
    *   `ml_service.py`: Computes rolling rainfall indices and triggers model probability forecasts.
    *   `weather_service.py`: Fetches forecasts from Open-Meteo API.
    *   `monitoring_engine.py`: Periodically schedules weather checks and database log saves.
    *   `alert_service.py`: Saves alert models and dispatches simulated warnings.

### Database Layer (SQLite)
*   **Models:**
    *   `User`: Hashed credentials, usernames, and roles.
    *   `Location`: Geolocation, proximity to rivers, and densities.
    *   `WeatherReading`: Time-series log containing sensor observations.
    *   `Prediction`: Model version, risk levels, probabilities, and XAI snapshots.
    *   `Alert`: Channel routing (SMS, Email, Dashboard) and dispatch messages.
    *   `CitizenReport`: Public crowdsourced reports.
    *   `Shelter`: Emergency assembly points.

---

## 2. Machine Learning Pipeline (`ml_pipeline/`)
*   `download_or_import_data.py`: Downloads the India Flood Inventory (Zenodo v3) and retrieves ECMWF ERA5 historical daily metrics (2010–2023) from the Open-Meteo Historical Archive API.
*   `inspect_data.py`: Details raw CSV columns, null ratios, and frequencies.
*   `preprocess.py`: Performs coordinate indexing, target labeling with 14d/7d buffers, and splits data.
*   `feature_engineering.py`: Evaluates climatology deviation and rolling sums.
*   `train.py`: Trains and compares classifiers (Logistic Regression, Decision Tree, Random Forest, Gradient Boosting, XGBoost) using chronological validation splits.
*   `evaluate.py`: Generates confusion matrix, ROC/PR curves, and feature plots under `reports/figures/`.
*   `predict.py`: Standalone endpoint interface for inference.
*   `generate_data.py`: Back-up synthetic generation script.

---

## 3. Synthetic vs Real-World Data Separation
*   **Synthetic Components:**
    *   `ml_pipeline/generate_data.py`: Left intact for historical reference/backup only. It is **never** executed by the current production training pipeline.
*   **Real-World Components:**
    *   All ML features and model states are strictly derived from ground-truth IMD/IIT Delhi IFI flood records aligned with gridded ERA5 meteorological observation intervals.
