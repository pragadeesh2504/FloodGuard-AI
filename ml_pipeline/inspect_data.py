import os
import pandas as pd

def inspect_ifi():
    # Set up paths relative to project root
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ifi_path = os.path.join(BASE_DIR, "data", "raw", "India_Flood_Inventory_v3.csv")

    if not os.path.exists(ifi_path):
        print(f"Error: India Flood Inventory not found at {ifi_path}")
        return

    df = pd.read_csv(ifi_path)

    # Identify key fields representing:
    # - district: 'Districts'
    # - event start date: 'Start Date'
    # - event end date: 'End Date'
    # - event ID: 'UEI'
    # - event type/cause: 'Main Cause'

    # Parse dates
    df['parsed_start'] = pd.to_datetime(df['Start Date'], format='%d-%m-%Y %H:%M', errors='coerce')
    df['parsed_end'] = pd.to_datetime(df['End Date'], format='%d-%m-%Y %H:%M', errors='coerce')

    total_records = len(df)
    min_date = df['parsed_start'].min()
    max_date = df['parsed_end'].max()

    unique_districts = df['Districts'].dropna().nunique()

    # In IFI, Main Cause describes the event cause. Let's count cause types.
    flood_events = df[df['Main Cause'].fillna('').str.lower().str.contains('flood')]
    flood_event_count = len(flood_events)

    missing_start = df['Start Date'].isnull().sum()
    missing_end = df['End Date'].isnull().sum()
    missing_dates = missing_start + missing_end

    missing_districts = df['Districts'].isnull().sum()

    report = f"""
==================================================
IFI DATASET STRUCTURE REPORT
==================================================
Total records: {total_records}
Date range: {min_date.strftime('%Y-%m-%d') if pd.notnull(min_date) else 'N/A'} to {max_date.strftime('%Y-%m-%d') if pd.notnull(max_date) else 'N/A'}
Unique districts in raw file: {unique_districts}
Flood event records (Main Cause contains 'flood'): {flood_event_count}
Missing start or end dates: {missing_dates}
Missing districts: {missing_districts}
==================================================
"""
    print(report)

    print("Columns identified:")
    print(f"  - District field: 'Districts'")
    print(f"  - Event Start Date field: 'Start Date'")
    print(f"  - Event End Date field: 'End Date'")
    print(f"  - Event ID field: 'UEI'")
    print(f"  - Event Cause field: 'Main Cause'")

    print("\nExamples of actual parsed events:")
    sample = df.dropna(subset=['Start Date', 'End Date', 'Districts']).head(5)
    for idx, row in sample.iterrows():
        print(f"  ID: {row['UEI']}")
        print(f"    State: {row['State']} | District(s): {row['Districts']}")
        print(f"    Start: {row['Start Date']} | End: {row['End Date']}")
        print(f"    Cause: {row['Main Cause']} | Fatality: {row['Human fatality']}")

if __name__ == "__main__":
    inspect_ifi()
