# Flood Labeling Methodology

This report outlines the positive/negative labeling framework and buffer exclusion window logic applied to align ground-truth flood events with historical weather observations in Tamil Nadu.

## 1. Ground Truth Source
Flood event windows are extracted from the **India Flood Inventory (IFI-Impacts) v3.0** dataset (IIT Delhi / IMD / HydroSense Lab).

## 2. Classification Definitions
*   **Positive Flood Day (`is_flood = 1`):** Any calendar date $D$ that satisfies $Start\_Date \le D \le End\_Date$ of a documented flood event in IFI-Impacts for that specific district.
*   **Excluded Buffer Day (`is_buffer = True`):** Days immediately preceding or following a flood event where weather patterns are transitional. Specifically:
    *   **14 days before** the documented event start date.
    *   **7 days after** the documented event end date.
    *   *Purpose:* To avoid contaminating the negative class (normal/dry days) with pre-flood saturation patterns or post-flood drainage intervals.
*   **Negative Day (`is_flood = 0` and `is_buffer = False`):** All remaining dates that represent normal meteorological cycles.

## 3. Buffer Overlap & Merging
If multiple flood events are close in time or overlap, their buffer periods are merged. If a date is labeled positive by event $A$ but lies inside the buffer of event $B$, the positive label **always** overrides the buffer exclusion to preserve ground-truth flood observations.

## 4. Normalization Example
*   **Event Start:** 2015-11-08
*   **Event End:** 2015-11-13
*   **District:** Chennai
*   **Label Mapping:**
    *   `2015-10-25` to `2015-11-07` (14 days pre-event): `is_flood = 0, is_buffer = True` (Excluded from training/testing)
    *   `2015-11-08` to `2015-11-13` (Event period): `is_flood = 1, is_buffer = False` (Positive class)
    *   `2015-11-14` to `2015-11-20` (7 days post-event): `is_flood = 0, is_buffer = True` (Excluded from training/testing)
    *   `2015-11-21` (Normal day): `is_flood = 0, is_buffer = False` (Negative class)
