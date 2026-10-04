import os
import numpy as np
import pandas as pd

def generate_synthetic_data(num_samples=10000, output_path="historical_floods.csv"):
    np.random.seed(42)

    # Generate independent features
    temperature = np.random.uniform(15, 45, num_samples) # in Celsius
    humidity = np.random.uniform(40, 100, num_samples) # in %
    rainfall_intensity = np.random.exponential(scale=5.0, size=num_samples) # mm/h
    # Apply occasional high rainfall events
    high_rain_indices = np.random.choice(num_samples, size=int(num_samples * 0.15), replace=False)
    rainfall_intensity[high_rain_indices] = np.random.uniform(25, 120, len(high_rain_indices))

    # Calculate cumulative rainfalls
    # 24h rainfall is correlated with intensity, plus some history
    rainfall_24h = rainfall_intensity * np.random.uniform(2, 6, num_samples) + np.random.exponential(scale=10, size=num_samples)
    rainfall_48h = rainfall_24h * np.random.uniform(1.2, 2.0, num_samples) + np.random.exponential(scale=15, size=num_samples)

    wind_speed = np.random.uniform(0, 80, num_samples) # km/h
    pressure = np.random.uniform(980, 1025, num_samples) # hPa

    # River variables
    river_level = np.random.uniform(0.5, 8.0, num_samples) # m
    # River level is heavily correlated with 24h and 48h rainfall
    river_level += (rainfall_48h * 0.03) + np.random.normal(0, 0.5, num_samples)
    river_level = np.clip(river_level, 0.2, 15.0)

    # River rise rate
    river_rise_rate = (river_level * np.random.uniform(0.01, 0.15, num_samples)) - np.random.uniform(0, 0.2, num_samples)
    river_rise_rate = np.clip(river_rise_rate, -1.0, 3.0)

    # Soil moisture is heavily dependent on humidity, rainfall
    soil_moisture = 20 + 0.5 * humidity + (rainfall_24h * 0.15) + np.random.normal(0, 5, num_samples)
    soil_moisture = np.clip(soil_moisture, 10, 100)

    # Geographic features
    elevation = np.random.uniform(2, 200, num_samples) # meters above sea level
    distance_from_river = np.random.uniform(10, 5000, num_samples) # meters
    population_density = np.random.randint(100, 25000, num_samples) # people per sq km
    historical_frequency = np.random.uniform(0.01, 0.8, num_samples) # scale of historical floods

    # Determine targets (physical logic for flood probability / classification)
    # Target formula: combination of high water, heavy rain, low elevation, saturated soil
    soil_sat = soil_moisture / 100.0
    dist_factor = np.clip(1.0 - (distance_from_river / 1500.0), 0, 1)
    elev_factor = np.clip(1.0 - (elevation / 50.0), 0, 1)

    # Combined score
    score = (
        (rainfall_24h / 150.0) * 0.25 +
        (river_level / 8.0) * 0.30 +
        (river_rise_rate / 1.5) * 0.15 +
        soil_sat * 0.15 +
        dist_factor * 0.10 +
        elev_factor * 0.05
    )

    # Add a bit of historical frequency factor
    score += historical_frequency * 0.05
    # Normalize score
    score = np.clip(score, 0.0, 1.0)

    # Threshold for actual flood (binary target)
    # If score > 0.65, highly likely to flood
    is_flood = (score > 0.60).astype(int)

    # Let's ensure some specific historic templates exist in the data to match Chennai 2023, Kerala 2018, etc.
    # We will insert them at the end of the dataset
    df = pd.DataFrame({
        "temperature": temperature,
        "humidity": humidity,
        "rainfall_intensity": rainfall_intensity,
        "rainfall_24h": rainfall_24h,
        "rainfall_48h": rainfall_48h,
        "wind_speed": wind_speed,
        "pressure": pressure,
        "river_level": river_level,
        "river_rise_rate": river_rise_rate,
        "soil_moisture": soil_moisture,
        "elevation": elevation,
        "distance_from_river": distance_from_river,
        "population_density": population_density,
        "historical_frequency": historical_frequency,
        "is_flood": is_flood
    })

    # Inject famous historical flood patterns
    chennai_2023 = pd.DataFrame([{
        "temperature": 26.5, "humidity": 96.0, "rainfall_intensity": 45.0, "rainfall_24h": 350.0, "rainfall_48h": 500.0,
        "wind_speed": 45.0, "pressure": 995.0, "river_level": 11.5, "river_rise_rate": 1.8, "soil_moisture": 98.0,
        "elevation": 6.0, "distance_from_river": 120.0, "population_density": 22000, "historical_frequency": 0.75, "is_flood": 1
    }])

    kerala_2018 = pd.DataFrame([{
        "temperature": 24.0, "humidity": 98.0, "rainfall_intensity": 35.0, "rainfall_24h": 310.0, "rainfall_48h": 610.0,
        "wind_speed": 22.0, "pressure": 1002.0, "river_level": 14.2, "river_rise_rate": 1.2, "soil_moisture": 99.0,
        "elevation": 25.0, "distance_from_river": 400.0, "population_density": 860, "historical_frequency": 0.60, "is_flood": 1
    }])

    mumbai_2005 = pd.DataFrame([{
        "temperature": 27.0, "humidity": 99.0, "rainfall_intensity": 90.0, "rainfall_24h": 944.0, "rainfall_48h": 1100.0,
        "wind_speed": 35.0, "pressure": 990.0, "river_level": 12.0, "river_rise_rate": 2.5, "soil_moisture": 100.0,
        "elevation": 10.0, "distance_from_river": 80.0, "population_density": 25000, "historical_frequency": 0.85, "is_flood": 1
    }])

    df = pd.concat([df, chennai_2023, kerala_2018, mumbai_2005], ignore_index=True)

    # Save to disk
    dir_name = os.path.dirname(output_path)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} samples and saved to {output_path}")

if __name__ == "__main__":
    generate_synthetic_data()
