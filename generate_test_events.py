import random

import requests

BASE_URL = "http://localhost:8000/api/v1/collect"

paths = [
    "/",
    "/home",
    "/pricing",
    "/about",
    "/blog/fastapi",
    "/blog/clickhouse",
    "/blog/redis",
]

referrers = [
    "",
    "https://google.com",
    "https://github.com",
    "https://linkedin.com",
    "https://youtube.com",
]

for i in range(20):
    payload = {
        "site_id": "site_123",
        "event_type": "pageview",
        "url": f"https://example.com{random.choice(paths)}",
        "path": random.choice(paths),
        "referrer": random.choice(referrers),
        "session_id": f"sess_{i % 5}",
        "visitor_id": f"vis_{i % 8}",
        "screen": "1920x1080",
    }

    response = requests.post(BASE_URL, json=payload)
    print(f"Sent event {i + 1} -> Status: {response.status_code}")

print("Done sending test events.")