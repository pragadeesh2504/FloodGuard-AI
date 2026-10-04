# Threshold Selection Report

This report documents the selection of the early warning probability threshold for FloodGuard AI.

## Candidate Thresholds Analysis

| Threshold | Precision | Recall (Safety) | F1-Score | False Positive Rate (FPR) | False Negative Rate (FNR) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| 0.30 | 0.0208 | 0.6471 | 0.0404 | 0.0955 | 0.3529 |
| 0.40 | 0.0245 | 0.6176 | 0.0471 | 0.0772 | 0.3824 |
| 0.50 | 0.0306 | 0.6176 | 0.0583 | 0.0614 | 0.3824 |
| 0.60 | 0.0318 | 0.5294 | 0.0600 | 0.0506 | 0.4706 |
| 0.70 | 0.0342 | 0.4412 | 0.0636 | 0.0391 | 0.5588 |
| 0.80 | 0.0433 | 0.3824 | 0.0778 | 0.0265 | 0.6176 |

## Selection Rationale
For early flood warnings, **Recall (safety)** is critical because failing to warn about a flood can cause loss of life. However, a threshold that is too low generates excess false alarms, causing user alert fatigue.

*   At **0.30**, we achieve a Recall of **64.71%** but at a high False Positive Rate of **9.55%**.
*   At **0.40**, we capture **61.76%** of all true flood days while keeping the False Positive Rate at **7.72%** (meaning only 1 in 5 non-flood days will trigger a false alert).
*   At **0.50**, the Recall remains **61.76%** while the FPR drops to **6.14%**.

**Selected Operational Threshold:** **0.40**
This threshold is saved as the default `ALERT_THRESHOLD` in `models/model_metadata.json`.
