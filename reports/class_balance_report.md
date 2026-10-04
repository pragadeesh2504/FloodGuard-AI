# Class Imbalance Report

This report documents the class distribution of target flood events across the training and testing datasets and explains the evaluation framework.

## Class Distribution Summary

| Metric | Training Set (2010–2020) | Test Set (2021–2023) |
| :--- | :---: | :---: |
| **Total Observations** | 14,302 | 3,922 |
| **Flood Days (is_flood = 1)** | 1,348 (9.43%) | 128 (3.26%) |
| **Non-Flood Days (is_flood = 0)** | 12,954 (90.57%) | 3,794 (96.74%) |

## Why Accuracy Alone is Insufficient

In highly imbalanced datasets, **Accuracy is a highly misleading performance metric**.

1.  **The Majority-Class Classifier:** If a dummy classifier simply predicts "No Flood" (`is_flood = 0`) for every single day in the test set, it will achieve an accuracy of **96.74%**.
2.  **The Operational Cost:** While a 96.74% accuracy sounds excellent on paper, such a system would have a **Recall of 0%** (missing all 128 actual flood events). In the context of disaster early-warning, this failure results in zero lead time for evacuations, leading to potential loss of life and property.
3.  **Alternative Metrics:** To verify safety and operational utility, we prioritize:
    *   **Recall:** Ensuring we capture as many true flood events as possible (optimizing safety).
    *   **F1-Score / ROC-AUC:** Gauging the trade-off between Recall and Precision to avoid overwhelming municipal authorities with false positive alarms.
