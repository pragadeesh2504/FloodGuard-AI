# Train / Test Dataset Chronological Split Report

This report documents the chronological split boundaries and class frequencies between the training and testing datasets.

## Split Boundaries
*   **Training Period:** 2010-01-01 to 2020-12-31
*   **Testing Period:** 2021-01-01 to 2023-12-31
*   **Chronological Split Validation:** 2020-12-31 < 2021-01-01 $ightarrow$ **PASS**

## Sample Counts & Class Distribution (Post-Buffer Exclusion)
*   **Training Set (2010-2020):**
    *   Total Samples: 38747
    *   Flood Days (is_flood = 1): 499 (1.29%)
    *   Non-Flood Days (is_flood = 0): 38248 (98.71%)
*   **Testing Set (2021-2023):**
    *   Total Samples: 10866
    *   Flood Days (is_flood = 1): 34 (0.31%)
    *   Non-Flood Days (is_flood = 0): 10832 (99.69%)
