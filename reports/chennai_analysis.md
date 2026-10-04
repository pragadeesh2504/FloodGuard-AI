# Chennai-Specific Evaluation Report

## Dataset Breakdown
*   Total Chennai Observations: 4827 (Train: 3795, Test: 1032)
*   Flood Days: 117
*   Non-Flood Days: 4710

## Subset Evaluation Metrics (Test Set 2021-2023)
*   **Accuracy:** 0.8876
*   **Precision:** 0.1231
*   **Recall (Safety):** 0.8889
*   **F1-Score:** 0.2162
*   **ROC-AUC:** 0.9256

## Confusion Matrix (Chennai Subset)
*   True Negatives (TN): 900
*   False Positives (FP): 114
*   False Negatives (FN): 2
*   True Positives (TP): 16

## Key Interpretations & Limitations
Due to the localized microclimate of Chennai (heavily dominated by the Northeast Monsoon in Oct-Dec), the regional submodel performs with high Recall but experiences a high volume of false warnings during non-flood rain episodes. With a total test size of 1032 days, the subset evaluation is statistically indicative but should not be treated as a fully certified warning index.
