import requests

url = "http://localhost:8000/api/v1/collect"
payload = {
    "site_id": "site_123",
    "event_type": "pageview",
    "url": "https://example.com/home",
    "path": "/home",
    "session_id": "sess_1",
    "visitor_id": "vis_1"
}

print("Sending event to API...")
response = requests.post(url, json=payload)

print(f"Status Code: {response.status_code} (204 means success!)")
if response.status_code != 204:
    print(f"Error details: {response.text}")