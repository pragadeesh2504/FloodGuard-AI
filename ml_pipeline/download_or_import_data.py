import os
import time
import urllib.request
import urllib.error
import json
import shutil
import pandas as pd

# Representative coordinates for retrieving gridded historical weather data (ERA5) for Tamil Nadu districts
# Note: These are representative district coordinates used to retrieve historical gridded meteorological data,
# not the exact coordinates of every individual flood event.
COORDINATES = {
    "chennai": {"lat": 13.0827, "lon": 80.2707, "name": "Chennai"},
    "coimbatore": {"lat": 11.0168, "lon": 76.9558, "name": "Coimbatore"},
    "cuddalore": {"lat": 11.7480, "lon": 79.7714, "name": "Cuddalore"},
    "nagapattinam": {"lat": 10.7672, "lon": 79.8449, "name": "Nagapattinam"},
    "thanjavur": {"lat": 10.7870, "lon": 79.1378, "name": "Thanjavur"},
    "tiruvallur": {"lat": 13.1438, "lon": 79.9077, "name": "Tiruvallur"},
    "kancheepuram": {"lat": 12.8342, "lon": 79.7036, "name": "Kancheepuram"},
    "thoothukudi": {"lat": 8.7974, "lon": 78.1348, "name": "Thoothukudi"},
    "tirunelveli": {"lat": 8.7139, "lon": 77.7567, "name": "Tirunelveli"},
    "kanyakumari": {"lat": 8.0883, "lon": 77.5385, "name": "Kanyakumari"}
}

START_DATE = "2010-01-01"
END_DATE = "2023-12-31"

# Zenodo download URL for v3 of IFI
IFI_URL = "https://zenodo.org/api/records/16994648/files/India_Flood_Inventory_v3.csv/content"

# Set up paths relative to project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
FLOOD_RAW_DIR = os.path.join(RAW_DIR, "flood")
WEATHER_RAW_DIR = os.path.join(RAW_DIR, "weather")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
EXTERNAL_DIR = os.path.join(BASE_DIR, "data", "external")

os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(FLOOD_RAW_DIR, exist_ok=True)
os.makedirs(WEATHER_RAW_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(EXTERNAL_DIR, exist_ok=True)

def download_file_with_retry(url, dest_path, description="file", retries=5, delay=10):
    print(f"Downloading {description} from {url} to {dest_path}...")
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            with urllib.request.urlopen(req, timeout=120) as response, open(dest_path, 'wb') as out_file:
                out_file.write(response.read())
            print(f"Successfully downloaded {description}!")
            return True
        except Exception as e:
            print(f"Attempt {attempt}/{retries} failed for {description}: {e}")
            if attempt < retries:
                print(f"Waiting {delay} seconds before retrying...")
                time.sleep(delay)
    return False

def get_hourly_weather_data(city_id, lat, lon):
    cache_path = os.path.join(WEATHER_RAW_DIR, f"{city_id}_hourly.json")

    if os.path.exists(cache_path):
        print(f"Using cached hourly weather data for {city_id} at {cache_path}")
        with open(cache_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    # Open-Meteo Historical Archive API (ERA5 Reanalysis)
    url = (
        f"https://archive-api.open-meteo.com/v1/archive?"
        f"latitude={lat}&longitude={lon}&"
        f"start_date={START_DATE}&end_date={END_DATE}&"
        f"hourly=precipitation,temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m&"
        f"timezone=Asia/Kolkata"
    )

    temp_path = cache_path + ".tmp"
    success = download_file_with_retry(url, temp_path, f"weather data for {city_id}", retries=5, delay=10)
    if success:
        os.rename(temp_path, cache_path)
        with open(cache_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        raise RuntimeError(f"Failed to retrieve weather data for {city_id}")

def aggregate_hourly_to_daily(hourly_data, city_id, lat, lon):
    print(f"Aggregating weather data to daily for {city_id}...")
    hourly = hourly_data.get("hourly", {})
    if not hourly:
        raise ValueError(f"No hourly data found in response for {city_id}")

    df_h = pd.DataFrame({
        "time": pd.to_datetime(hourly["time"]),
        "precipitation": hourly["precipitation"],
        "temperature": hourly["temperature_2m"],
        "humidity": hourly["relative_humidity_2m"],
        "pressure": hourly["surface_pressure"],
        "wind_speed": hourly["wind_speed_10m"]
    })

    df_h["date"] = df_h["time"].dt.date

    # Aggregation rules
    daily = df_h.groupby("date").agg({
        "precipitation": "sum",
        "temperature": "mean",
        "humidity": "mean",
        "pressure": "mean",
        "wind_speed": "mean"
    }).reset_index()

    daily["city"] = city_id
    daily["latitude"] = lat
    daily["longitude"] = lon
    daily["date"] = daily["date"].apply(lambda d: d.strftime("%Y-%m-%d"))
    return daily

def main():
    print("--- Starting Data Retrieval and Preparation for Tamil Nadu ---")

    # 1. Handle India Flood Inventory v3 raw file (preserve it)
    ifi_dest_raw = os.path.join(RAW_DIR, "India_Flood_Inventory_v3.csv")
    ifi_dest_flood = os.path.join(FLOOD_RAW_DIR, "India_Flood_Inventory_v3.csv")

    # Copy from raw to flood/ if already exists in raw (as we downloaded it in checkpoint 2)
    if os.path.exists(ifi_dest_raw) and not os.path.exists(ifi_dest_flood):
        print(f"Copying existing raw file to preserved location: {ifi_dest_flood}")
        shutil.copy(ifi_dest_raw, ifi_dest_flood)

    if os.path.exists(ifi_dest_flood):
        print(f"IFI-Impacts dataset already preserved at {ifi_dest_flood}")
    else:
        success = download_file_with_retry(IFI_URL, ifi_dest_flood, "India Flood Inventory (IFI-Impacts)", retries=5, delay=5)
        if not success:
            print("CRITICAL: Failed to download the India Flood Inventory dataset!")
            return

    # 2. Download and aggregate weather data for target Tamil Nadu districts
    all_daily_weather = []
    for city_id, info in COORDINATES.items():
        try:
            hourly_data = get_hourly_weather_data(city_id, info["lat"], info["lon"])
            daily_weather = aggregate_hourly_to_daily(hourly_data, city_id, info["lat"], info["lon"])
            all_daily_weather.append(daily_weather)
        except Exception as e:
            print(f"CRITICAL: Failed to process weather for {city_id}: {e}")
            return

    # Merge and save daily weather dataset
    merged_weather = pd.concat(all_daily_weather, ignore_index=True)
    weather_daily_path = os.path.join(RAW_DIR, "weather_daily.csv")
    merged_weather.to_csv(weather_daily_path, index=False)
    print(f"\nSaved daily weather observations to {weather_daily_path}")
    print(f"Total weather records: {len(merged_weather)}")
    print("Columns in weather dataset:", list(merged_weather.columns))

    print("\n--- Data Retrieval Completed Successfully! ---")

if __name__ == "__main__":
    main()
