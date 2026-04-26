import requests
import json
import os
import time

BASE_URL = "https://transitlive.com/ajax/detour.php"
ROUTES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 16, 17, 18, 21, 22, 24, 30, 40, 50, 60]
OUTPUT_DIR = "detour_data"


def fetch_detour(route_number: int) -> dict | None:
    """Fetch detour data for a given route number."""
    params = {
        "action": "loadDetour",
        "route": route_number,
    }
    try:
        response = requests.get(BASE_URL, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        print(f"  [HTTP Error] Route {route_number}: {e}")
    except requests.exceptions.ConnectionError as e:
        print(f"  [Connection Error] Route {route_number}: {e}")
    except requests.exceptions.Timeout:
        print(f"  [Timeout] Route {route_number}: request timed out")
    except requests.exceptions.JSONDecodeError:
        print(f"  [JSON Error] Route {route_number}: response was not valid JSON")
        print(f"  Raw response: {response.text[:200]}")
    return None


def save_json(data: dict, route_number: int, output_dir: str) -> str:
    """Save data as a JSON file and return the file path."""
    filename = f"route_{route_number}_detour.json"
    filepath = os.path.join(output_dir, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return filepath


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Saving detour data to: ./{OUTPUT_DIR}/\n")

    success_count = 0
    fail_count = 0

    for route in ROUTES:
        print(f"Fetching route {route}...")
        data = fetch_detour(route)

        if data is not None:
            filepath = save_json(data, route, OUTPUT_DIR)
            print(f"  Saved → {filepath}")
            success_count += 1
        else:
            print(f"  Skipped route {route} (no data saved)")
            fail_count += 1

        time.sleep(0.3)  # be polite — small delay between requests

    print(f"\nDone! {success_count} saved, {fail_count} failed.")


if __name__ == "__main__":
    main()