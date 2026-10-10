import requests
import json
import os
import time

ROUTES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 16, 17, 18, 21, 22, 24, 30, 40, 50, 60]
OUTPUT_DIR = "polyline_data"
VERSION = "20251125"


def build_url(route_number: int) -> str:
    """Build the polyline URL for a given route number."""
    return f"https://transitlive.com/json/polyLines/route{route_number}.js?v={VERSION}"


def fetch_polyline(route_number: int) -> dict | None:
    """Fetch polyline data for a given route number."""
    url = build_url(route_number)
    try:
        response = requests.get(url, timeout=10)
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
    filename = f"route_{route_number}_polyline.json"
    filepath = os.path.join(output_dir, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return filepath


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Saving polyline data to: ./{OUTPUT_DIR}/\n")

    success_count = 0
    fail_count = 0

    for route in ROUTES:
        print(f"Fetching route {route}...  ({build_url(route)})")
        data = fetch_polyline(route)

        if data is not None:
            filepath = save_json(data, route, OUTPUT_DIR)
            print(f"  Saved → {filepath}")
            success_count += 1
        else:
            print(f"  Skipped route {route} (no data saved)")
            fail_count += 1

        time.sleep(0.3)  # polite delay between requests

    print(f"\nDone! {success_count} saved, {fail_count} failed.")


if __name__ == "__main__":
    main()