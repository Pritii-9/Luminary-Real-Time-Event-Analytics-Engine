"""Prometheus SRE Metrics Exporter for Luminary Analytics & Security Engine.
Exposes standard Prometheus exposition format (text/plain) for Prometheus / Datadog / Grafana scrapers.
Tracks p50/p95/p99 ingestion latency, cache hit ratios, Redis backlog depth, and threat counters.
"""

import time
import math
import threading
from typing import Dict, List

# Thread-safe in-memory metric registries
_lock = threading.Lock()

# Counters: {key: count}
_counters: Dict[str, float] = {
    'luminary_events_ingested_total{status="accepted"}': 0,
    'luminary_events_ingested_total{status="rate_limited"}': 0,
    'luminary_events_ingested_total{status="bot_filtered"}': 0,
    'luminary_cache_requests_total{result="hit",tier="l1_memory"}': 0,
    'luminary_cache_requests_total{result="hit",tier="l2_redis"}': 0,
    'luminary_cache_requests_total{result="miss",tier="all"}': 0,
    'luminary_threats_detected_total{severity="CRITICAL"}': 0,
    'luminary_threats_detected_total{severity="HIGH"}': 0,
    'luminary_threats_detected_total{severity="MEDIUM"}': 0,
    'luminary_webhooks_dispatched_total{status="success"}': 0,
    'luminary_webhooks_dispatched_total{status="failed"}': 0,
}

# Latency histogram buckets (seconds): 0.005s (5ms), 0.01s (10ms), 0.025s (25ms), 0.05s, 0.1s, 0.25s, 0.5s, 1.0s, +Inf
LATENCY_BUCKETS = [0.005, 0.010, 0.025, 0.050, 0.100, 0.250, 0.500, 1.000]
_latency_bucket_counts = {b: 0 for b in LATENCY_BUCKETS}
_latency_bucket_inf = 0
_latency_sum = 0.0
_latency_count = 0


def inc_counter(name_with_labels: str, amount: float = 1.0):
    """Increments a Prometheus counter thread-safely."""
    with _lock:
        _counters[name_with_labels] = _counters.get(name_with_labels, 0.0) + amount


def record_ingestion_latency(duration_seconds: float):
    """Records an HTTP ingestion duration into Prometheus histogram buckets."""
    global _latency_sum, _latency_count, _latency_inf
    with _lock:
        _latency_sum += duration_seconds
        _latency_count += 1
        for b in LATENCY_BUCKETS:
            if duration_seconds <= b:
                _latency_bucket_counts[b] += 1


def record_threat_incident(category: str, severity: str):
    """Increments threat classification metrics."""
    inc_counter(f'luminary_threats_detected_total{{severity="{severity}"}}')
    inc_counter(f'luminary_threat_categories_total{{category="{category}"}}')


def record_cache_hit(tier: str):
    inc_counter(f'luminary_cache_requests_total{{result="hit",tier="{tier}"}}')


def record_cache_miss():
    inc_counter('luminary_cache_requests_total{result="miss",tier="all"}')


def generate_prometheus_metrics_text() -> str:
    """Generates valid Prometheus text exposition output (Content-Type: text/plain; version=0.0.4)."""
    with _lock:
        lines: List[str] = [
            "# HELP luminary_events_ingested_total Total count of raw events processed by the ingestion engine.",
            "# TYPE luminary_events_ingested_total counter",
        ]
        for k, v in _counters.items():
            if k.startswith("luminary_events_ingested_total"):
                lines.append(f"{k} {int(v)}")

        lines.extend([
            "",
            "# HELP luminary_ingestion_duration_seconds Ingestion API request duration in seconds.",
            "# TYPE luminary_ingestion_duration_seconds histogram",
        ])
        cumulative = 0
        for b in LATENCY_BUCKETS:
            cumulative = _latency_bucket_counts[b]
            lines.append(f'luminary_ingestion_duration_seconds_bucket{{le="{b}"}} {cumulative}')
        lines.append(f'luminary_ingestion_duration_seconds_bucket{{le="+Inf"}} {_latency_count}')
        lines.append(f"luminary_ingestion_duration_seconds_sum {_latency_sum:.6f}")
        lines.append(f"luminary_ingestion_duration_seconds_count {_latency_count}")

        lines.extend([
            "",
            "# HELP luminary_cache_requests_total Total cache read queries split by hit/miss tier.",
            "# TYPE luminary_cache_requests_total counter",
        ])
        for k, v in _counters.items():
            if k.startswith("luminary_cache_requests_total"):
                lines.append(f"{k} {int(v)}")

        lines.extend([
            "",
            "# HELP luminary_threats_detected_total Malicious cyber threat attempts detected by OWASP & entropy heuristics.",
            "# TYPE luminary_threats_detected_total counter",
        ])
        for k, v in _counters.items():
            if "threat" in k:
                lines.append(f"{k} {int(v)}")

        lines.extend([
            "",
            "# HELP luminary_webhooks_dispatched_total Total security alert webhooks sent to external SIEM/Slack endpoints.",
            "# TYPE luminary_webhooks_dispatched_total counter",
        ])
        for k, v in _counters.items():
            if k.startswith("luminary_webhooks_dispatched_total"):
                lines.append(f"{k} {int(v)}")

        # Add uptime
        lines.extend([
            "",
            "# HELP luminary_process_uptime_seconds Process uptime in seconds.",
            "# TYPE luminary_process_uptime_seconds gauge",
            f"luminary_process_uptime_seconds {int(time.time() - _process_start_time)}",
        ])

        return "\n".join(lines) + "\n"


_process_start_time = time.time()
