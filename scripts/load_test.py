"""High-Performance Ingestion Engine Load Test Script using Locust.
Simulates high-throughput concurrent event beacons hitting /api/v1/collect.

Usage:
    pip install locust
    locust -f scripts/load_test.py --headless -u 100 -r 20 --run-time 1m --host http://localhost:8000
"""

import random
import time
from locust import HttpUser, task, between, events

PATHS = [
    "/",
    "/checkout",
    "/pricing",
    "/docs/api",
    "/blog/high-throughput-architecture",
    "/dashboard/analytics",
    "/features/realtime-streaming"
]

REFERRERS = [
    "",
    "https://google.com",
    "https://github.com/Pritii-9/Luminary-Scalable-Web-Event-Engine",
    "https://news.ycombinator.com",
    "https://twitter.com",
    "https://linkedin.com"
]

DEVICES = ["desktop", "mobile", "tablet"]

class TelemetryIngestionUser(HttpUser):
    # Short wait time between requests to simulate heavy traffic bursts
    wait_time = between(0.01, 0.05)

    @task(8)
    def send_pageview_event(self):
        """Simulate high-frequency pageview telemetry events."""
        session_num = random.randint(100, 999)
        visitor_num = random.randint(1000, 9999)
        
        payload = {
            "site_id": "site_123",
            "public_token": "tok_test_12345",
            "event_type": "pageview",
            "url": f"https://luminary-demo.com{random.choice(PATHS)}",
            "path": random.choice(PATHS),
            "referrer": random.choice(REFERRERS),
            "session_id": f"sess_{session_num}",
            "visitor_id": f"vis_{visitor_num}",
            "screen": "1920x1080"
        }

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://luminary-demo.com"
        }

        with self.client.post(
            "/api/v1/collect",
            json=payload,
            headers=headers,
            catch_response=True,
            name="/api/v1/collect (Ingestion)"
        ) as response:
            if response.status_code == 204:
                response.success()
            elif response.status_code == 429:
                # Rate limited (Expected under massive load)
                response.failure("Rate limited (429)")
            else:
                response.failure(f"Unexpected status code: {response.status_code}")

    @task(1)
    def fetch_analytics_stats(self):
        """Simulate dashboard user querying time-series metrics."""
        self.client.get(
            "/api/v1/stats/summary?site_id=site_123&days=7",
            name="/api/v1/stats/summary (Read)"
        )

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    print("\n" + "="*50)
    print(" LUMINARY LOAD TEST BENCHMARK COMPLETE ")
    print("="*50)
    if environment.stats.total.fail_ratio < 0.01:
        print(" SUCCESS: Sustained load with < 1% error rate!")
    print(f" Total Requests: {environment.stats.total.num_requests}")
    print(f" Average RPS: {environment.stats.total.total_rps:.2f}")
    print(f" P95 Response Time: {environment.stats.total.get_response_time_percentile(0.95):.2f} ms")
    print(f" P99 Response Time: {environment.stats.total.get_response_time_percentile(0.99):.2f} ms")
    print("="*50 + "\n")
