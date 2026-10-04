import requests
import random
import time

BASE_URL = "http://localhost:8000/api"

def run_tests():
    print("--- Starting Backend Integration Tests ---")

    # 1. Test Base Endpoint
    try:
        res = requests.get("http://localhost:8000/")
        assert res.status_code == 200
        print("[OK] Base API Check Passed")
    except Exception as e:
        print(f"[FAIL] Base API Check Failed: {e}")
        return

    # Generate unique test username
    test_user = f"tester_{int(time.time())}"

    # 2. Test User Registration
    try:
        reg_payload = {
            "username": test_user,
            "email": f"{test_user}@floodguard.gov.in",
            "password": "testpassword123",
            "role": "admin"
        }
        res = requests.post(f"{BASE_URL}/auth/register", json=reg_payload)
        assert res.status_code == 200
        print("[OK] User Registration Test Passed")
    except Exception as e:
        print(f"[FAIL] User Registration Failed: {e}")
        return

    # 3. Test User Login
    token = None
    try:
        login_payload = {
            "username": test_user,
            "password": "testpassword123"
        }
        res = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
        assert res.status_code == 200
        token = res.json()["access_token"]
        print("[OK] User Authentication Test Passed")
    except Exception as e:
        print(f"[FAIL] User Login Failed: {e}")
        return

    headers = {"Authorization": f"Bearer {token}"}

    # 4. Fetch Locations
    loc_id = None
    try:
        res = requests.get(f"{BASE_URL}/locations", headers=headers)
        assert res.status_code == 200
        locs = res.json()
        assert len(locs) > 0
        loc_id = locs[0]["id"]
        print(f"[OK] Location Fetching Test Passed (Found Location ID: {loc_id})")
    except Exception as e:
        print(f"[FAIL] Location Fetching Failed: {e}")
        return

    # 5. Submit Citizen Report
    try:
        report_payload = {
            "location_id": loc_id,
            "latitude": 13.0850,
            "longitude": 80.2750,
            "description": "Critical water logging at central metro intersection, roads blocked.",
            "severity": "High",
            "image_url": "http://evidence-source.com/metro.jpg"
        }
        res = requests.post(f"{BASE_URL}/reports", json=report_payload, headers=headers)
        assert res.status_code == 201
        print("[OK] Citizen Flood Report Submission Test Passed")
    except Exception as e:
        print(f"[FAIL] Citizen Report Submission Failed: {e}")
        return

    # 6. Fetch Predictions
    try:
        res = requests.get(f"{BASE_URL}/predictions/latest", headers=headers)
        assert res.status_code == 200
        preds = res.json()
        print(f"[OK] Fetch Predictions Test Passed (Predictions count: {len(preds)})")
    except Exception as e:
        print(f"[FAIL] Predictions Fetching Failed: {e}")
        return

    # 7. Fetch Analytics Dashboard
    try:
        res = requests.get(f"{BASE_URL}/analytics", headers=headers)
        assert res.status_code == 200
        analytics = res.json()
        assert "model_accuracy" in analytics
        assert "feature_importance" in analytics
        print("[OK] Analytics Aggregation Test Passed")
    except Exception as e:
        print(f"[FAIL] Analytics Retrieval Failed: {e}")
        return

    print("\n[SUCCESS] ALL INTEGRATION AND UNIT TESTS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    # Give the backend server a moment to boot
    time.sleep(2)
    run_tests()
