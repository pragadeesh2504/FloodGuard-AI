import requests
import json

def main():
    print("--- Running API Validation Checks on POST /api/predictions/predict ---")
    url = "http://localhost:8000/api/predictions/predict"

    # 1. Valid Input
    valid_payload = {
        "rainfall_1d": 120.0,
        "rainfall_3d": 280.0,
        "rainfall_7d": 410.0,
        "temperature": 28.5,
        "humidity": 91.0,
        "latitude": 13.0827,
        "longitude": 80.2707
    }
    res1 = requests.post(url, json=valid_payload)
    print(f"1. Valid Input: Code {res1.status_code}")
    print(json.dumps(res1.json(), indent=2))

    # 2. Missing Feature (Missing rainfall_7d)
    missing_payload = {
        "rainfall_1d": 120.0,
        "rainfall_3d": 280.0,
        "temperature": 28.5,
        "humidity": 91.0,
        "latitude": 13.0827,
        "longitude": 80.2707
    }
    res2 = requests.post(url, json=missing_payload)
    print(f"\n2. Missing Feature: Code {res2.status_code}")
    print(json.dumps(res2.json(), indent=2))

    # 3. Invalid Feature Type (rainfall_1d as string)
    invalid_type_payload = {
        "rainfall_1d": "lots_of_rain",
        "rainfall_3d": 280.0,
        "rainfall_7d": 410.0,
        "temperature": 28.5,
        "humidity": 91.0,
        "latitude": 13.0827,
        "longitude": 80.2707
    }
    res3 = requests.post(url, json=invalid_type_payload)
    print(f"\n3. Invalid Feature Type: Code {res3.status_code}")
    print(json.dumps(res3.json(), indent=2))

    # 4. Negative Rainfall (acceptable or zero division check)
    neg_payload = {
        "rainfall_1d": -10.0,
        "rainfall_3d": -20.0,
        "rainfall_7d": -30.0,
        "temperature": 28.5,
        "humidity": 91.0,
        "latitude": 13.0827,
        "longitude": 80.2707
    }
    res4 = requests.post(url, json=neg_payload)
    print(f"\n4. Negative Rainfall: Code {res4.status_code}")
    print(json.dumps(res4.json(), indent=2))

    # 5. Extreme but Valid Rainfall
    extreme_payload = {
        "rainfall_1d": 999.0,
        "rainfall_3d": 1800.0,
        "rainfall_7d": 2500.0,
        "temperature": 32.5,
        "humidity": 98.0,
        "latitude": 13.0827,
        "longitude": 80.2707
    }
    res5 = requests.post(url, json=extreme_payload)
    print(f"\n5. Extreme but Valid Rainfall: Code {res5.status_code}")
    print(json.dumps(res5.json(), indent=2))

    # 6. Missing Location (Missing latitude/longitude)
    missing_loc_payload = {
        "rainfall_1d": 120.0,
        "rainfall_3d": 280.0,
        "rainfall_7d": 410.0,
        "temperature": 28.5,
        "humidity": 91.0
    }
    res6 = requests.post(url, json=missing_loc_payload)
    print(f"\n6. Missing Location: Code {res6.status_code}")
    print(json.dumps(res6.json(), indent=2))

    # 7. Unknown Location (Should fallback to baseline default city)
    unknown_loc_payload = {
        "rainfall_1d": 120.0,
        "rainfall_3d": 280.0,
        "rainfall_7d": 410.0,
        "temperature": 28.5,
        "humidity": 91.0,
        "latitude": 99.0,
        "longitude": -99.0
    }
    res7 = requests.post(url, json=unknown_loc_payload)
    print(f"\n7. Unknown Location: Code {res7.status_code}")
    print(json.dumps(res7.json(), indent=2))

if __name__ == "__main__":
    main()
