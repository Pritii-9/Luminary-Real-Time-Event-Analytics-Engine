"""Stream worker: consumes events from Redis, enriches, and batch-inserts into ClickHouse."""

import json
import time
from datetime import datetime, timezone

import clickhouse_connect
from redis import Redis

from app.core.config import settings
from app.services.enrichment.user_agent import parse_user_agent
from app.services.enrichment.bot import is_bot
from app.services.enrichment.geo import enrich_geo

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
    "browser_version",
    "os",
    "os_version",
    "screen",
    "session_id",
    "visitor_id",
    "ip_hash",
    "country",
    "city",
    "language",
    "timezone",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "is_bot",
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


def process_messages(messages):
    rows = []
    ack_ids = []

    for message_id, fields in messages:
        try:
            payload = json.loads(fields.get("data", "{}"))

            ts = payload.get("timestamp", time.time())
            dt = datetime.fromtimestamp(ts, tz=timezone.utc).replace(tzinfo=None)

            user_agent = payload.get("user_agent", "")

            # Enrichment: User-Agent
            ua_info = parse_user_agent(user_agent)

            # Enrichment: Bot detection
            bot_flag = 1 if is_bot(user_agent) else 0

            # Enrichment: GeoIP (uses client_ip, never stored raw)
            client_ip = payload.get("client_ip", "")
            geo = enrich_geo(client_ip)

            row = (
                payload.get("event_id"),
                dt.date(),
                dt,
                payload.get("site_id"),
                payload.get("event_type", "pageview"),
                payload.get("path", ""),
                payload.get("url", ""),
                payload.get("referrer", ""),
                ua_info["device_type"],
                ua_info["browser"],
                ua_info["browser_version"],
                ua_info["os"],
                ua_info["os_version"],
                payload.get("screen", ""),
                payload.get("session_id"),
                payload.get("visitor_id"),
                payload.get("ip_hash", ""),
                geo["country"],
                geo["city"],
                payload.get("language", ""),
                payload.get("timezone", ""),
                payload.get("utm_source", ""),
                payload.get("utm_medium", ""),
                payload.get("utm_campaign", ""),
                payload.get("utm_term", ""),
                payload.get("utm_content", ""),
                bot_flag,
            )

            rows.append(row)
            ack_ids.append(message_id)

        except Exception as e:
            print(f"Error processing message {message_id}: {e}")
            # Push to Dead-Letter Queue for inspection
            dlq_payload = json.dumps(
                {"message_id": message_id, "data": fields, "error": str(e)}
            )
            redis_client.rpush("luminary:events:dlq", dlq_payload)
            redis_client.xack(STREAM_KEY, GROUP_NAME, message_id)

    if rows:
        clickhouse_client.insert(
            table="analytics.events",
            data=rows,
            column_names=CLICKHOUSE_COLUMNS,
        )
        redis_client.xack(STREAM_KEY, GROUP_NAME, *ack_ids)
        print(f"[OK] Inserted {len(rows)} enriched events into ClickHouse.")


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