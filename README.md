# FloodGuard AI: Machine Learning-Based Flood Early Prediction & Disaster Intelligence Platform

> [!NOTE]
> **Academic & Operational Disclaimer:** FloodGuard AI is an academic machine learning prototype and experimental early-warning decision-support system designed for Tamil Nadu, with Chennai as the primary urban case study. The model is trained using historical disaster records and gridded reanalysis meteorology. It is intended for decision-support and rapid situation assessment, not as an exclusive replacement for official Central Water Commission (CWC) or India Meteorological Department (IMD) statutory hydrological warnings.

---

## 1. Project Overview & System Objectives

Flooding across Tamil Nadu produces recurring loss of life, displacement, and infrastructure damage during the Northeast and Southwest Monsoons. Conventional physics-based hydrodynamic models depend on high-resolution cross-sectional river bathymetry, localized soil infiltration rates, and physical hydraulic roughness coefficients—parameters that are rarely available in real-time at low latency across regional basins.

**FloodGuard AI** addresses this challenge by providing an end-to-end machine learning platform that evaluates hydrological stress and predicts flood risk 6 to 24 hours in advance using meteorological observations, rolling precipitation accumulations, rate-of-change storm dynamics, and cyclical monsoonal features. The platform is deployed as an operational 5-stage workflow (`DETECT` $\rightarrow$ `UNDERSTAND` $\rightarrow$ `DECIDE` $\rightarrow$ `ACT` $\rightarrow$ `VERIFY`) with a full-stack dashboard, interactive GIS mapping, emergency evacuation routing, and citizen report verification.

---

## 2. System Architecture & Operational Workflow

The system is structured into five operational phases:

```
[ METEOROLOGICAL TELEMETRY / ERA5 REANALYSIS ]
                     │
                     ▼
  ┌────────────────────────────────────────────────────────┐
  │ 1. DETECT                                              │
  │    Improved XGBoost (29 Contributing Features)         │
  │    Left-aligned rolling accumulations & storm dynamics │
  └────────────────────────┬───────────────────────────────┘
                           │
                           ▼
  ┌────────────────────────────────────────────────────────┐
  │ 2. UNDERSTAND                                          │
  │    Feature importance inspection (Tree gain utility)   │
  │    Climatological rainfall deviations (2010–2020)      │
  └────────────────────────┬───────────────────────────────┘
                           │
                           ▼
  ┌────────────────────────────────────────────────────────┐
  │ 3. DECIDE: DUAL-MODE OPERATIONAL POSTURE               │
  │    • Standard Mode  (τ = 0.58) -> Accuracy = 83.14%    │
  │    • Emergency Mode (τ = 0.33) -> Recall   = 97.06%    │
  └────────────────────────┬───────────────────────────────┘
                           │
                           ▼
  ┌────────────────────────────────────────────────────────┐
  │ 4. ACT                                                 │
  │    Automated 24h-cooldown alert dispatch               │
  │    Nearest-shelter evacuation routing                  │
  └────────────────────────┬───────────────────────────────┘
                           │
                           ▼
  ┌────────────────────────────────────────────────────────┐
  │ 5. VERIFY                                              │
  │    Ground-truth citizen eyewitness report verification │
  │    Immutable administrative action audit trail         │
  └────────────────────────────────────────────────────────┘
```

### Full-Stack Architecture
* **Frontend:** React 19, Vite, Tailwind CSS, Leaflet GIS mapping, Recharts, Lucide React, code-split into optimized vendor bundles (<400 kB max chunk).
* **Backend:** FastAPI (Python), Uvicorn, SQLAlchemy ORM, SQLite database, Pydantic validation, JWT authentication, and WebSocket real-time broadcast.
* **ML Inference Engine:** XGBoost with scikit-learn preprocessing pipelines, joblib serialization, and left-aligned causal rolling windows.

---

## 3. Repository Structure

```
floodguard_ai/
├── .gitignore                      # Git exclusion rules (PII, venv, node_modules, large data)
├── README.md                       # Comprehensive documentation & reproducibility guide
├── requirements.txt                # Production backend Python dependencies
├── backend/                        # FastAPI application & REST/WebSocket service
│   ├── app/
│   │   ├── config.py               # Application settings (24h cooldown, thresholds, JWT)
│   │   ├── database.py             # SQLAlchemy engine & session factory
│   │   ├── main.py                 # FastAPI application root & auto-seeding logic
│   │   ├── models/                 # Database ORM models (locations, users, alerts, etc.)
│   │   ├── routes/                 # API route endpoints (prediction, analytics, shelters, etc.)
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── services/               # Core business logic (ML service, alerts, weather)
│   │   └── utils/                  # Security hashing, audit logger, WebSocket manager
│   ├── run.py                      # Standalone backend launcher
│   ├── test_api_validation.py      # Boundary and edge-case API validation tests
│   ├── test_backend.py             # Integration test runner
│   ├── test_incidents_and_audit.py # Pytest incident lifecycle and audit suite
│   ├── test_ml_and_api.py          # Pytest ML inference and prediction route suite
│   └── test_websocket_and_cooldown.py # Pytest WebSocket and 24h cooldown suite
├── frontend/                       # Vite React single-page application
│   ├── index.html                  # HTML entry point
│   ├── package.json                # Frontend npm dependencies & build scripts
│   ├── tailwind.config.js          # Tailwind styling system
│   ├── vite.config.js              # Vite bundler configuration & manualChunks splitting
│   └── src/
│       ├── App.jsx                 # Route navigation & lazy-loaded modules
│       ├── components/             # Reusable UI widgets (FloodGauge, Replay, etc.)
│       ├── context/                # Authentication context provider
│       ├── hooks/                  # Custom WebSocket telemetry hook
│       ├── pages/                  # 9 Application views (Dashboard, Map, Trends, etc.)
│       └── services/               # Axios API client
├── ml_pipeline/                    # ML experimentation, training & evaluation scripts
│   ├── academic_validation.py      # Statistical evaluation scripts
│   ├── feature_engineering.py      # 29-feature causal extraction pipeline
│   ├── preprocess.py               # Scaling and data normalization
│   ├── run_pipeline.py             # End-to-end pipeline orchestrator
│   └── train.py                    # Model training & threshold evaluation
├── models/                         # Serialized production ML models & baselines (<1 MB total)
│   ├── baseline_xgboost_backup.joblib # 16-feature baseline reference model (439 kB)
│   ├── best_model.joblib           # Active production Improved XGBoost model (126 kB)
│   ├── improved_xgboost.joblib     # 29-feature Improved XGBoost weights (126 kB)
│   ├── climatology_baseline.json   # 2010–2020 monthly rainfall normals
│   ├── feature_importance.csv      # Tree split gain rankings
│   ├── model_metadata.json         # Complete model specification, features & metrics
│   ├── preprocessor.joblib         # StandardScaler serialization (1.4 kB)
│   └── rainfall_baseline.json      # Station-specific precipitation baselines (4.3 kB)
└── reports/                        # Verification reports, charts & evaluation logs
    ├── FINAL_MODEL_EVALUATION.md   # Rigorous validation & holdout testing report
    ├── ARCHITECTURE_AUDIT.md       # Full stack audit and boundary disclosures
    └── ml_improvement/             # Confusion matrices, ROC/PR curves & threshold data
```

---

## 4. Machine Learning Methodology

### Ground-Truth Data Sources
1. **India Flood Inventory (IFI-Impacts) [1967–2023]:** Compiled by IIT Delhi / HydroSense Lab & IMD (Zenodo Record `16994648`), providing documented historical flood occurrence intervals across Indian districts.
2. **Open-Meteo Historical Weather (ERA5 Reanalysis):** Daily meteorological parameters retrieved from ECMWF ERA5 gridded reanalysis (2010–2023) for representative district coordinates.

### Leakage-Safe Chronological Partitioning
To ensure models learn causal predictive signals rather than memorizing historical temporal sequences, a strict chronological holdout scheme is enforced:
* **Training Set:** `2010-01-01` to `2020-12-31` (38,747 samples across 10 Tamil Nadu districts).
* **Testing Set:** `2021-01-01` to `2023-12-31` (10,866 samples, untouched during training, tuning, and threshold selection).
* **Buffer Exclusion Windows:** To prevent label contamination, a buffer of **14 days prior** to each flood event and **7 days post-event** is completely excluded from both training and testing datasets.

### Climatological Baseline Deviation
The `rainfall_deviation` feature measures daily anomaly against a historical reference normal:
* Computed **strictly from the 2010–2020 training partition**.
* Stored in `models/rainfall_baseline.json` and loaded statically by the inference service without touching test data.

---

## 5. Feature Engineering (29 Contributing Features)

The Improved XGBoost pipeline uses 29 engineered features organized by physical category:

```
# Features in exact model inference order:
 1. rainfall_1d               16. longitude
 2. rainfall_3d               17. rainfall_5d
 3. rainfall_7d               18. rainfall_21d
 4. rainfall_14d              19. rainfall_30d
 5. rainfall_change_1d        20. rainfall_acceleration_3d
 6. rainfall_change_3d        21. consecutive_rain_days
 7. rainfall_rate_3d          22. heavy_rain_days_7d (>=25mm)
 8. rainfall_deviation        23. extreme_rain_days_14d (>=50mm)
 9. temperature               24. rainfall_ratio_1d_3d
10. humidity                  25. rainfall_ratio_3d_7d
11. pressure                  26. sin_month (cyclical monsoon periodicity)
12. wind_speed                27. cos_month (cyclical monsoon periodicity)
13. month                     28. pressure_change_1d
14. season                    29. humidity_change_1d
15. latitude
```

> [!IMPORTANT]
> **Causality Disclosure:** Feature importance rankings reflect XGBoost split gain utility during training and do **not** prove direct hydrodynamic causality or physical flood wave propagation mechanics.

---

## 6. Final Verified Model Performance

Evaluated on the completely untouched **2021–2023 holdout test set** (10,866 samples, 34 documented positive flood days):

| Metric | Standard Mode (Default) | Emergency Mode (High Sensitivity) | Baseline XGBoost (16 Features) |
| :--- | :---: | :---: | :---: |
| **Operating Threshold ($\tau$)** | **0.58** | **0.33** | 0.50 |
| **Accuracy** | **83.14%** (Satisfies $\ge 80\%$) | **71.24%** (Does NOT meet $\ge 80\%$) | 93.76% |
| **Precision** | **1.56%** | **1.05%** | 3.06% |
| **Recall (Safety)** | **85.29%** (29/34 floods) | **97.06%** (33/34 floods) | 61.76% (21/34 floods) |
| **F1-Score** | **0.0307** | **0.0207** | 0.0583 |
| **ROC-AUC** | **0.9314** | **0.9314** | 0.8976 |
| **PR-AUC / Avg Precision** | **0.0873** | **0.0873** | 0.0516 |
| **True Positives (TP)** | **29** | **33** | 21 |
| **False Positives (FP)** | **1,827** | **3,124** | 665 |
| **False Negatives (FN)** | **5** | **1** | 13 |
| **True Negatives (TN)** | **9,005** | **7,708** | 10,167 |
| **$\ge 80\%$ Accuracy Requirement Met?** | **YES** | **NO** | YES |

### Operational Strategy
* **Standard Monitoring Mode ($\tau = 0.58$):** The primary default mode. Strictly fulfills the project requirement of **$\ge 80\%$ Accuracy (83.14%)** while providing **85.29% Recall** and maintaining a controlled false alarm rate.
* **Emergency Mode ($\tau = 0.33$):** Deliberately trades precision and overall accuracy (**71.24%**) for life-safety **97.06% Recall** (capturing 33 of 34 floods with only 1 false negative). **Does NOT satisfy the $\ge 80\%$ accuracy requirement**, which is clearly disclosed in the UI.

---

## 7. Model Reproducibility Information

* **Python Runtime:** Python `3.10+` (verified on Python `3.14.3` 64-bit AMD64)
* **Core Dependency Versions:**
  * `scikit-learn`: `1.9.1`
  * `xgboost`: `3.4.1`
  * `joblib`: `1.6.0`
  * `pandas`: `3.0.6`
  * `numpy`: `2.5.3`
  * `fastapi`: `0.142.2`
  * `uvicorn`: `0.54.0`
* **Model Serialization Location:**
  * Active Model: [`models/best_model.joblib`](models/best_model.joblib) (126 kB)
  * Preprocessor: [`models/preprocessor.joblib`](models/preprocessor.joblib) (1.4 kB)
  * Baselines: [`models/rainfall_baseline.json`](models/rainfall_baseline.json) & [`models/climatology_baseline.json`](models/climatology_baseline.json)
  * Metadata: [`models/model_metadata.json`](models/model_metadata.json)

---

## 8. Exact Local Setup & Installation Instructions

### Prerequisites
* Python 3.10 or higher
* Node.js 18 or higher (with npm)
* Git

### Step 1: Clone the Repository
```bash
git clone https://github.com/<your-username>/floodguard-ai.git
cd floodguard-ai
```

### Step 2: Setup Python Virtual Environment
```bash
# Windows (PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
```

### Step 3: Install Backend Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 4: Launch the Backend Service
```bash
cd backend
python run.py
```
* Backend runs at: **`http://localhost:8000`**
* Interactive Swagger API documentation: **`http://localhost:8000/docs`**
* *Database Initialization:* On first boot, SQLite tables are automatically created and initialized with 10 Tamil Nadu districts and 4 relief shelters.

### Step 5: Administrator Account Setup (First Run)

To securely configure administrator access on initial startup, choose one of two options:

* **Option 1 (Configured Environment Variable):**
  Create a local `.env` file in the project root or export the variable before running the backend:
  ```bash
  ADMIN_USERNAME=admin
  ADMIN_EMAIL=admin@floodguard.gov.in
  ADMIN_INITIAL_PASSWORD=YourSecurePasswordHere123!
  ```
  > [!WARNING]
  > Never commit the `.env` file or plaintext passwords to version control. The repository `.gitignore` automatically excludes `.env` and `*.env` files.

* **Option 2 (Automatic One-Time Cryptographic Bootstrap):**
  If `ADMIN_INITIAL_PASSWORD` is omitted, FloodGuard AI generates a cryptographically secure random token (`secrets.token_urlsafe(24)`) on initial boot, outputs it to the server console once, and stores only the bcrypt hash. Subsequent restarts will not display the password.

### Step 6: Install & Start Frontend (In a separate terminal)
```bash
cd frontend
npm install
npm run dev
```
* Frontend runs at: **`http://localhost:3000`**

---

## 9. Verification & Automated Test Results

The test suite contains 56 automated checks across backend API routes, ML inference bounds, WebSocket broadcasting, and end-to-end operational workflows:

```bash
# Run Pytest suite
pytest backend/test_ml_and_api.py backend/test_incidents_and_audit.py backend/test_websocket_and_cooldown.py -v

# Run Integration & Validation scripts
python backend/test_backend.py
python backend/test_api_validation.py
```

### Executed Test Summary (100% Pass Rate)

| Test Suite | Total Checks | Status | Verified Functionality |
| :--- | :---: | :---: | :--- |
| `test_ml_and_api.py` | 12 | **PASS** | 29-feature inference, schema validation, thresholding |
| `test_incidents_and_audit.py` | 10 | **PASS** | Incident status transitions (`NEW` $\rightarrow$ `ACTIVE` $\rightarrow$ `RESOLVED`), audit logs |
| `test_websocket_and_cooldown.py` | 2 | **PASS** | Live telemetry streaming & 24h alert cooldown suppression |
| `test_backend.py` | 7 | **PASS** | Auth, user creation, location querying, citizen reporting |
| `test_api_validation.py` | 7 | **PASS** | Missing features, invalid inputs, edge-case coordinates |
| `test_routes_and_workflow.py` | 18 | **PASS** | All 9 frontend routes + 5-step operational workflow |
| **Total Automated Tests** | **56** | **100% PASS** | Zero regressions across all modules |

---

## 10. Operational Limitations & Disclosures

1. **Spatial Boundaries:** Weather observations represent district/headquarters locations and do not define micro-inundation contours. Visualizations reflect district-level flood-risk estimations.
2. **Alert Suppression Window:** To protect emergency personnel from alarm fatigue during continuous storm events, the system enforces a **24-hour alert cooldown** (`ALERT_COOLDOWN_HOURS = 24`) per district headquarters.
3. **Simulated Sensor Telemetry:** Gauges for `river_level` and `soil_moisture` in the Live Monitor are clearly flagged as `SIMULATED TELEMETRY — NOT USED BY ML MODEL`. In an operational state deployment, these would connect to State Water Resources Department telemetry streams.
4. **Temporary Public Demo Disclaimer:** Any remote Cloudflare tunnel URL is a **TEMPORARY PUBLIC DEMO TUNNEL** for live demonstration purposes and does not represent permanent production hosting.
