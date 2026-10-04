import os
import pandas as pd
import numpy as np

def clean_and_align_data():
    print("--- Starting Data Preprocessing & Label Alignment for Tamil Nadu ---")

    # Paths
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ifi_path = os.path.join(BASE_DIR, "data", "raw", "flood", "India_Flood_Inventory_v3.csv")
    weather_path = os.path.join(BASE_DIR, "data", "raw", "weather_daily.csv")

    # Load raw datasets
    if not os.path.exists(ifi_path):
        raise FileNotFoundError(f"Preserved IFI dataset not found at {ifi_path}")
    if not os.path.exists(weather_path):
        raise FileNotFoundError(f"Weather dataset not found at {weather_path}")

    ifi_df = pd.read_csv(ifi_path)
    weather_df = pd.read_csv(weather_path)

    # Clean district names and date formats in IFI
    ifi_df['Districts_clean'] = ifi_df['Districts'].fillna('').str.lower()
    ifi_df['parsed_start'] = pd.to_datetime(ifi_df['Start Date'], format='%d-%m-%Y %H:%M', errors='coerce').dt.date
    ifi_df['parsed_end'] = pd.to_datetime(ifi_df['End Date'], format='%d-%m-%Y %H:%M', errors='coerce').dt.date

    # Drop rows with invalid dates in IFI
    ifi_df = ifi_df.dropna(subset=['parsed_start', 'parsed_end'])

    # District Normalization Mappings (Correction 5 & Section 4)
    # Define keywords to match districts inside the comma-separated District field
    city_keys = {
        "chennai": ["chennai", "madras"],
        "coimbatore": ["coimbatore"],
        "cuddalore": ["cuddalore"],
        "nagapattinam": ["nagapattinam"],
        "thanjavur": ["thanjavur"],
        "tiruvallur": ["tiruvallur", "thiruvallur"],
        "kancheepuram": ["kancheepuram", "kanchipuram"],
        "thoothukudi": ["thoothukudi", "thoothukkudi"],
        "tirunelveli": ["tirunelveli"],
        "kanyakumari": ["kanyakumari", "kanniyakumari", "kanniyakumariumari"]
    }

    # Parse dates in daily weather
    weather_df['date'] = pd.to_datetime(weather_df['date']).dt.date

    # Initialize labeling columns
    weather_df['is_flood'] = 0
    weather_df['is_buffer'] = False
    weather_df['flood_event_id'] = None

    # Process each district separately to avoid cross-district timeline pollution
    processed_dfs = []

    for city_id, keywords in city_keys.items():
        print(f"Processing labels for canonical district: {city_id}...")

        # Filter IFI events that match this district and State = Tamil Nadu
        state_mask = ifi_df['State'].fillna('').str.lower() == 'tamil nadu'
        dist_mask = ifi_df['Districts_clean'].apply(lambda x: any(kw in x for kw in keywords))
        city_events = ifi_df[state_mask & dist_mask]

        print(f"  Found {len(city_events)} matching historical flood events in Tamil Nadu.")

        # Extract district weather sub-dataframe
        city_weather = weather_df[weather_df['city'] == city_id].copy()

        if len(city_weather) == 0:
            print(f"  Warning: No weather records found for district {city_id} in weather_daily.csv")
            continue

        # We will build sets of positive and buffer dates
        positive_dates = {}
        buffer_dates = set()

        for idx, event in city_events.iterrows():
            start = event['parsed_start']
            end = event['parsed_end']
            uei = event['UEI']

            # Positive dates range (inclusive)
            curr = start
            while curr <= end:
                # Map date to event ID
                if curr in positive_dates:
                    positive_dates[curr] = f"{positive_dates[curr]},{uei}"
                else:
                    positive_dates[curr] = str(uei)
                curr += pd.Timedelta(days=1)

            # Buffer pre-event (14 days)
            curr = start - pd.Timedelta(days=14)
            while curr < start:
                buffer_dates.add(curr)
                curr += pd.Timedelta(days=1)

            # Buffer post-event (7 days)
            curr = end + pd.Timedelta(days=1)
            limit = end + pd.Timedelta(days=7)
            while curr <= limit:
                buffer_dates.add(curr)
                curr += pd.Timedelta(days=1)

        # Buffer clean: remove any positive flood dates from the buffer exclusion list
        pos_set = set(positive_dates.keys())
        buffer_dates = buffer_dates - pos_set

        # Apply labels to district daily weather timeline
        city_weather['is_flood'] = city_weather['date'].apply(lambda d: 1 if d in pos_set else 0)
        city_weather['is_buffer'] = city_weather['date'].apply(lambda d: d in buffer_dates)
        city_weather['flood_event_id'] = city_weather['date'].apply(lambda d: positive_dates.get(d, None))

        processed_dfs.append(city_weather)

    # Recombine districts
    weather_labeled = pd.concat(processed_dfs, ignore_index=True)

    # Add metadata fields
    weather_labeled['source_flood'] = "IIT Delhi/IMD IFI-Impacts v3.0"
    weather_labeled['source_weather'] = "ECMWF ERA5 via Open-Meteo"

    # Save the labeled raw file
    labeled_path = os.path.join(BASE_DIR, "data", "processed", "weather_labeled.csv")
    weather_labeled.to_csv(labeled_path, index=False)

    print(f"\nLabel alignment completed!")
    print(f"Total labeled weather records: {len(weather_labeled)}")
    print(f"Positive flood records (is_flood=1): {len(weather_labeled[weather_labeled['is_flood'] == 1])}")
    print(f"Buffer excluded records (is_buffer=True): {len(weather_labeled[weather_labeled['is_buffer']])}")
    print(f"Negative records (is_flood=0 & is_buffer=False): {len(weather_labeled[(weather_labeled['is_flood'] == 0) & (~weather_labeled['is_buffer'])])}")
    print(f"Saved preprocessed dataset to: {labeled_path}")

    # Generate reports/labeling_methodology.md (Section 8)
    reports_dir = os.path.join(BASE_DIR, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    labeling_md_path = os.path.join(reports_dir, "labeling_methodology.md")

    labeling_report = f"""# Flood Labeling Methodology

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
"""
    with open(labeling_md_path, 'w', encoding='utf-8') as f:
        f.write(labeling_report)
    print(f"Saved labeling methodology documentation to {labeling_md_path}")

if __name__ == "__main__":
    clean_and_align_data()
