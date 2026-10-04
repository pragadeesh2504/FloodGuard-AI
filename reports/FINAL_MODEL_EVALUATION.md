# FloodGuard AI: Final Model Evaluation Report

This report presents the final chronological test set performance results for the FloodGuard AI prototype on the untouched 2021–2023 test partition.

> [!NOTE]
> **Academic Disclaimer:** FloodGuard AI is an academic machine learning prototype and experimental disaster-risk management platform. The models are trained on historical flood inventory occurrences and gridded meteorological reanalysis. Predictions do not guarantee flood prevention or absolute accuracy, and are not an officially certified disaster-warning service.

---

## 1. Dataset Breakdown & Methodology

* **Total Processed Tamil Nadu Observations:** 49,613 daily district records (2010–2023)
* **Chronological Training Period (2010–2020):** 38,747 samples (499 flood days, 38,248 non-flood days; base flood rate: **1.29%**)
* **Chronological Test Period (2021–2023):** 10,866 samples (34 flood days, 10,832 non-flood days; base flood rate: **0.31%**)
* **Temporal Guardrails:** Strict 14-day pre-event and 7-day post-event buffer exclusion windows enforced across all records (`is_buffer == False`). Zero test data was inspected, tuned against, or leaked during hyperparameter search or threshold selection.
* **Climatological Baseline:** Monthly precipitation baselines computed strictly on the 2010–2020 training split and frozen in `models/rainfall_baseline.json`.

---

## 2. Model Performance Summary (2021–2023 Test Partition)

The final selected model is the **Improved XGBoost with 29 Predictive Features** (incorporating intermediate accumulations, rainfall persistence, rainfall acceleration, rainfall ratios, barometric shifts, and smooth cyclical monsoon harmonics).

### Side-by-Side Model Comparison Table

| Model / Strategy | Operating Mode | Decision Threshold ($\tau$) | Accuracy | Precision | Recall (Safety) | F1-Score | ROC-AUC | PR-AUC | TN | FP | FN | TP | False Positive Rate (FPR) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Improved XGBoost** | **Standard Monitoring Mode (Default)** | **0.58** | **83.14%** | **1.56%** | **85.29%** | **0.0307** | **0.9314** | **0.0873** | **9,005** | **1,827** | **5** | **29** | **16.87%** |
| **Improved XGBoost** | **Emergency Mode (Opt-in)** | **0.33** | **71.24%** | **1.05%** | **97.06%** | **0.0207** | **0.9314** | **0.0873** | **7,708** | **3,124** | **1** | **33** | **28.84%** |
| Baseline XGBoost | Original Reference | 0.50 | 93.76% | 3.06% | 61.76% | 0.0583 | 0.8976 | 0.0516 | 10,167 | 665 | 13 | 21 | 6.14% |
| Gradient Boosting | Benchmark Candidate | 0.50 | 79.88% | 1.36% | 88.24% | 0.0267 | 0.9366 | 0.1084 | 8,650 | 2,182 | 4 | 30 | 20.14% |

---

## 3. Operational Analysis: Standard Mode vs. Emergency Mode

### Mode 1: Standard Monitoring Mode ($\tau = 0.58$, Default)
* **Project Compliance:** **Accuracy = 83.14%**, satisfying the $\ge 80.0\%$ project requirement.
* **Disaster Recall:** **85.29%** (captures 29 out of 34 historical flood days, with only 5 missed).
* **Discrimination:** **ROC-AUC = 0.9314**, **PR-AUC = 0.0873** (a 28× improvement over the 0.31% random baseline).
* **Operational Burden:** Generates 1,827 false alarms across 10 district headquarters over 3 full years (~60 false alerts per district annually), successfully avoiding alert deluge.

### Mode 2: High-Sensitivity Emergency Mode ($\tau = 0.33$, Opt-In)
* **Maximum Life Safety Recall:** **97.06%** (captures 33 out of 34 historical flood days; only 1 flood missed across the entire 3-year test period).
* **Accuracy Trade-off:** **Accuracy = 71.24%**.
* **Critical Operational Disclosure:** *High-Sensitivity Emergency Mode deliberately prioritizes life-safety recall and does NOT satisfy the project $\ge 80\%$ accuracy requirement.* It is intended strictly as an opt-in emergency state when incoming atmospheric depression signals indicate catastrophic risk where false negatives cannot be tolerated.
* **False Alarm Burden:** Generates 3,124 false alarms (28.84% FPR, ~104 false alerts per district annually).
* **Alert Suppression Window:** Dispatched emergency notifications enforce a configured **24-hour alert cooldown** (`ALERT_COOLDOWN_HOURS = 24`) per district to prevent alert fatigue across both modes.

---

## 4. Top Feature Importances (29 Features)

The production model evaluates 29 leakage-safe hydrological and meteorological features (feature gain scores reflect tree split utility and do not prove physical causality). Top features by gain:

1. **`rainfall_deviation`** (9.41%): Daily departure from 2010–2020 training monthly baseline.
2. **`sin_month`** (9.67%) & **`cos_month`** (6.75%): Cyclical annual Northeast/Southwest monsoon periodicity.
3. **`rainfall_21d`** (6.91%) & **`rainfall_30d`** (6.47%): Multi-week ground-saturation and reservoir basin storage.
4. **`longitude`** (5.15%) & **`latitude`** (4.27%): Coastal proximity and topological depression vulnerability.
5. **`humidity`** (4.76%): Atmospheric moisture saturation preceding intense storm cells.
6. **`rainfall_7d`** (4.43%), **`rainfall_5d`** (4.39%), **`rainfall_14d`** (4.34%): Rolling rainfall accumulation windows.
7. **`rainfall_3d`** (2.84%) & **`rainfall_1d`** (0.66%): Short-term rainfall spike indicators.
8. **`pressure_change_1d`** (1.83%): Rapid barometric drop signaling approaching Bay of Bengal depressions.

---

## 5. Diagnostic Finding: 2018–2020 Validation Partition

During tuning, chronological validation on the 2018–2020 sub-window yielded an unusually low ROC-AUC (0.4852) despite strong test performance (0.8976 baseline, 0.9314 improved). Diagnostic investigation revealed that 82.2% of all flood-positive days in 2018–2020 came from a single 60-day dry-season flood inventory entry (`UEI-IMD-FL-2019-0134`, Coimbatore, March–April 2019) where 0.0 mm rainfall was recorded across the district centroid.

> **Validation Anomaly Statement:**
> *"The unusually low validation discrimination is associated with an anomalous long-duration flood record whose documented dates do not align well with rainfall observed at the selected district weather point. This was treated as a diagnostic finding and was not removed or used to optimize the final test performance."*

---

## 6. Extreme Class Imbalance & Precision Context

In the chronological test set (2021–2023), floods occurred on only 34 out of 10,866 days (0.31% base occurrence rate). Consequently:
* A Precision of **1.56%** in Standard Mode and **1.05%** in Emergency Mode reflects the mathematical reality of detecting very rare extreme events (Bayes' Theorem under extreme class imbalance).
* The PR-AUC of **0.0873** represents a **28.1× lift** over the random baseline precision of 0.0031.
* In full-stack operations, Explainable AI factors are presented alongside risk probabilities to help municipal operators understand the primary contributing meteorological variables before issuing public alerts.
