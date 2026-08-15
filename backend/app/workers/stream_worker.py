import json
import time
from datetime import datetime, timezone

import clickhouse_connect
from redis import Redis

from app.core.config import settings

STREAM_KEY = settings.redis_stream_key
GROUP_NAME = "luminary-workers"
CONSUMER_NAME = "worker-1"
BATCH_SIZE = 100

redis_client = Redis.from_url(settings.redis_url, decode_responses=True)

clickhouse_client = clickhouse_connect.get_client(
    host=settings.clickhouse_host,
    port=settings.clickhouse_port,
    username=settings.clickhouse_user,
    password=settings.clickhouse_password,
    database="analytics",
    secure=settings.clickhouse_secure,
    verify=False,
)

CLICKHOUSE_COLUMNS = [
    "event_id",
    "event_date",
    "event_time",
    "site_id",
    "event_type",
    "path",
    "url",
    "referrer",
    "device_type",
    "browser",
    "os",
    "screen",
    "session_id",
    "visitor_id",
    "ip_hash",
]


def ensure_consumer_group():
    try:
        redis_client.xgroup_create(
            name=STREAM_KEY,
            groupname=GROUP_NAME,
            id="0",
            mkstream=True,
        )
        print(f"Created consumer group '{GROUP_NAME}'")
    except Exception as e:
        if "BUSYGROUP" in str(e):
            print(f"Consumer group '{GROUP_NAME}' already exists.")
        else:
            raise


def parse_user_agent(user_agent: str):
    browser, os_name, device_type = "Unknown", "Unknown", "desktop"
    ua = user_agent.lower()

    if "edg" in ua:
        browser = "Edge"
    elif "chrome" in ua:
        browser = "Chrome"
    elif "firefox" in ua:
        browser = "Firefox"
    elif "safari" in ua:
        browser = "Safari"

    if "windows" in ua:
        os_name = "Windows"
    elif "android" in ua:
        os_name = "Android"
    elif "iphone" in ua or "ipad" in ua:
        os_name = "iOS"
    elif "macintosh" in ua:
        os_name = "macOS"
    elif "linux" in ua:
        os_name = "Linux"

    if "mobile" in ua:
        device_type = "mobile"
    elif "tablet" in ua:
        device_type = "tablet"

    return browser, os_name, device_type


def process_messages(messages):
    rows = []
    ack_ids = []

    for message_id, fields in messages:
        try:
            payload = json.loads(fields.get("data", "{}"))

            ts = payload.get("timestamp", time.time())
            dt = datetime.fromtimestamp(ts, tz=timezone.utc).replace(tzinfo=None)

            user_agent = payload.get("user_agent", "")
            browser, os_name, device_type = parse_user_agent(user_agent)

            row = (
                payload.get("event_id"),
                dt.date(),
                dt,
                payload.get("site_id"),
                payload.get("event_type", "pageview"),
                payload.get("path", ""),
                payload.get("url", ""),
                payload.get("referrer", ""),
                device_type,
                browser,
                os_name,
                payload.get("screen", ""),
                payload.get("session_id"),
                payload.get("visitor_id"),
                payload.get("ip_hash", ""),
            )

            rows.append(row)
            ack_ids.append(message_id)

        except Exception as e:
            print(f"Error processing message {message_id}: {e}")
            redis_client.xack(STREAM_KEY, GROUP_NAME, message_id)

    if rows:
        clickhouse_client.insert(
            table="analytics.events",
            data=rows,
            column_names=CLICKHOUSE_COLUMNS,
        )

        redis_client.xack(STREAM_KEY, GROUP_NAME, *ack_ids)
        print(f"[OK] Successfully inserted {len(rows)} events into ClickHouse Cloud!")


def run():
    ensure_consumer_group()
    print("Worker started. Waiting for events...")

    while True:
        try:
            response = redis_client.xreadgroup(
                groupname=GROUP_NAME,
                consumername=CONSUMER_NAME,
                streams={STREAM_KEY: ">"},
                count=BATCH_SIZE,
                block=2000,
            )

            if response:
                for stream_name, messages in response:
                    process_messages(messages)

        except KeyboardInterrupt:
            print("Stopping worker...")
            break
        except Exception as e:
            print(f"Worker error: {e}")
            time.sleep(2)


if __name__ == "__main__":
    run()