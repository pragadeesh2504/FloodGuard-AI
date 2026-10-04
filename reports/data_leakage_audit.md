# Data Leakage Audit Report

This report presents a strict data leakage audit for the Tamil Nadu flood warning prediction model.

| Audit Checkpoint | Status | Details |
| :--- | :---: | :--- |
| **Chronological Split** | **PASS** | Train dates (2010–2020) precede test dates (2021–2023). |
| **No Future Weather** | **PASS** | Meteorological inputs are measured at date $D$ or earlier. |
| **No Future Rainfall** | **PASS** | Cumulative rainfall values do not query future intervals. |
| **No Future Flood Labels in Features** | **PASS** | Targets are excluded from inputs; features do not contain event dates. |
| **Rolling Windows are Causal** | **PASS** | Rolling aggregates use left-aligned windows ending on date $D$. |
| **Climatological Baseline Uses Training Only** | **PASS** | Climatology means were computed *strictly* using the 2010–2020 train split. |
| **Test Data Does Not Affect Preprocessing** | **PASS** | Test sets are transformed using the scaling pipeline pre-fitted on training data. |
| **Flood Buffer Dates Excluded** | **PASS** | Buffer rows are completely removed before model fitting. |
| **Class Weights Use Training Data Only** | **PASS** | Weight calculations are performed solely on the training partition. |
| **Feature Scaling Fitted on Training Data Only** | **PASS** | StandardScaler fits solely on training inputs inside the pipeline. |

## Audit Summary
**AUDIT STATUS: PASSED**
