"""Stream worker: consumes events from Redis, enriches, and batch-inserts into SQL Database (PostgreSQL)."""

import json
import time
from datetime import datetime, timezone

from redis import Redis
from sqlmodel import Session as SQLSession

from app.core.config import settings
from app.core.database import EventRecord, engine
from app.services.enrichment.user_agent import parse_user_agent
from app.services.enrichment.bot import is_bot
from app.services.enrichment.geo import enrich_geo

STREAM_KEY = settings.redis_stream_key
GROUP_NAME = "luminary-workers"
CONSUMER_NAME = "worker-1"
BATCH_SIZE = 100

redis_client = Redis.from_url(settings.redis_url, decode_responses=True)


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
    db_records = []
    ack_ids = []

    for message_id, fields in messages:
        try:
            payload = json.loads(fields.get("data", "{}"))

            ts = payload.get("timestamp", time.time())
            dt = datetime.fromtimestamp(ts, tz=timezone.utc).replace(tzinfo=None)
            user_agent = payload.get("user_agent", "")

            # Enrichment: User-Agent, Bot detection, GeoIP
            ua_info = parse_user_agent(user_agent)
            client_ip = payload.get("client_ip", "")
            geo = enrich_geo(client_ip)

            record = EventRecord(
                event_id=payload.get("event_id"),
                site_id=payload.get("site_id"),
                event_type=payload.get("event_type", "pageview"),
                timestamp=int(dt.replace(tzinfo=timezone.utc).timestamp()),
                url=payload.get("url", ""),
                path=payload.get("path", ""),
                referrer=payload.get("referrer", ""),
                device_type=ua_info.get("device_type", "Desktop"),
                browser=ua_info.get("browser", "Other"),
                screen=payload.get("screen", ""),
                session_id=payload.get("session_id"),
                visitor_id=payload.get("visitor_id"),
                country=geo.get("country", "Unknown"),
            )

            db_records.append(record)
            ack_ids.append(message_id)

        except Exception as e:
            print(f"Error processing message {message_id}: {e}")
            dlq_payload = json.dumps(
                {"message_id": message_id, "data": fields, "error": str(e)}
            )
            redis_client.rpush("luminary:events:dlq", dlq_payload)
            redis_client.xack(STREAM_KEY, GROUP_NAME, message_id)

    if db_records:
        try:
            with SQLSession(engine) as session:
                session.add_all(db_records)
                session.commit()
            print(f"[OK] Batch-inserted {len(db_records)} events into SQL Database.")
            redis_client.xack(STREAM_KEY, GROUP_NAME, *ack_ids)

            # Invalidate cached analytics for affected sites
            try:
                from app.services.cache_service import invalidate_site_cache
                affected_sites = set(r.site_id for r in db_records)
                for sid in affected_sites:
                    invalidate_site_cache(sid)
            except Exception as cache_err:
                print(f"Cache invalidation notice: {cache_err}")
        except Exception as e:
            print(f"SQL Database batch insert failed: {e}")
            raise



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
                block=100,
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