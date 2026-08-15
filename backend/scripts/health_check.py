import json
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

# Ensure backend package root is on sys.path so `import app` works when running
# this script from the `backend/` directory where Python sets sys.path[0]
backend_root = str(Path(__file__).resolve().parents[1])
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from app.core.config import settings


def check_api():
    url = f"http://localhost:8000/api/v1/collect"
    payload = {
        "site_id": "health_test_site",
        "event_type": "pageview",
        "url": "https://example.com/health",
        "path": "/health",
        "session_id": "health-sess",
        "visitor_id": "health-vis",
    }
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            status = resp.getcode()
            print(f"API POST /api/v1/collect -> HTTP {status}")
    except urllib.error.HTTPError as he:
        print(f"API HTTP error: {he.code} - {he.reason}")
    except Exception as exc:
        print(f"API request failed: {exc}")


def check_redis():
    try:
        import redis
    except Exception as exc:
        print(f"redis package not available: {exc}")
        return

    try:
        r = redis.Redis.from_url(settings.redis_url)
        pong = r.ping()
        print(f"Redis ping -> {pong}")
        # show stream length
        try:
            length = r.xlen(settings.redis_stream_key)
            print(f"Redis stream '{settings.redis_stream_key}' length -> {length}")
        except Exception:
            pass
    except Exception as exc:
        print(f"Redis connection failed: {exc}")


def check_clickhouse():
    try:
        import clickhouse_connect
    except Exception as exc:
        print(f"clickhouse_connect package not available: {exc}")
        return

    try:
        # show the ClickHouse settings pulled from environment/.env
        pwd = settings.clickhouse_password or ""
        masked = "*****" if pwd else "(empty)"
        print(
            f"ClickHouse settings - host={settings.clickhouse_host} port={settings.clickhouse_port} user={settings.clickhouse_user} secure={settings.clickhouse_secure} password={masked}"
        )
        client = clickhouse_connect.get_client(
            host=settings.clickhouse_host,
            port=settings.clickhouse_port,
            username=settings.clickhouse_user,
            password=settings.clickhouse_password,
            database="default",
            secure=settings.clickhouse_secure,
            verify=False,
        )
        # run a lightweight query
        res = client.query("SELECT 1")
        print(f"ClickHouse query returned rows: {len(res.result_rows)}")
    except Exception as exc:
        print(f"ClickHouse connection/query failed: {exc}")


if __name__ == '__main__':
    print("Running Luminary health checks")
    start = time.time()
    check_api()
    check_redis()
    check_clickhouse()
    print(f"Health checks completed in {time.time()-start:.2f}s")
