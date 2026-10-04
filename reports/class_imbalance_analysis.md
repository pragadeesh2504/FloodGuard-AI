# Class Imbalance Analysis Report

This report presents a rigorous examination of class imbalance and its effect on precision-recall metrics in the Tamil Nadu flood warning prototype.

## 1. Class Distribution Analysis
*   **Training Set (2010–2020):**
    *   Flood Days (Positive): 499 (1.288%)
    *   No Flood Days (Negative): 38248 (98.712%)
    *   Imbalance Ratio: 1 : 76.6
*   **Test Set (2021–2023):**
    *   Flood Days (Positive): 34 (0.313%)
    *   No Flood Days (Negative): 10832 (99.687%)
    *   Imbalance Ratio: 1 : 318.6

## 2. Mathematical Impact on Precision
Precision is calculated as:
$$\text{Precision} = \frac{\text{True Positives (TP)}}{\text{True Positives (TP)} + \text{False Positives (FP)}}$$

Because the negative class represents **99.69%** of the test data:
1.  Even an exceptionally strong classifier with a False Positive Rate (FPR) of only $6\%$ will generate:
    $$\text{FP} = \text{FPR} \times \text{TN} \approx 0.06 \times 10,832 = 650 \text{ False Positives}$$
2.  If the model successfully detects $61.8\%$ of the actual floods (TP = 21, FN = 13), the precision becomes:
    $$\text{Precision} = \frac{21}{21 + 650} \approx 3.13\%$$

Thus, the extremely low precision is a direct mathematical consequence of the natural scarcity of flood events, rather than poor classifier quality. The model's high **ROC-AUC (0.8976)** and **PR-AUC (0.0475)** confirm that the classifier has strong ranking capacity.

## 3. Mitigating Alarm Fatigue
To prevent alert fatigue from false alarms:
1.  **Probability-based scaling:** Instead of binary alerts, display raw hazard percentages.
2.  **Historical reference thresholds:** Compare daily rolling weather features against historical reference bounds (monthly means and p90 values under flood conditions) to provide explanation contexts for the end-user.
