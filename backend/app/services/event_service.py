import hashlib
import json
import time
import uuid

from fastapi import Request, HTTPException
import logging

from app.schemas.event import EventIn
from app.services.redis_client import redis_client
from app.core.config import settings


def enrich_event(event: EventIn, request: Request) -> dict:
    ip = request.client.host if request.client else "unknown"
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()
    user_agent = request.headers.get("user-agent", "")

    return {
        "event_id": str(uuid.uuid4()),
        "timestamp": event.timestamp or int(time.time()),
        "site_id": event.site_id,
        "event_type": event.event_type,
        "url": str(event.url),
        "path": event.path,
        "referrer": event.referrer or "",
        "session_id": event.session_id,
        "visitor_id": event.visitor_id,
        "screen": event.screen or "",
        "ip_hash": ip_hash,
        "user_agent": user_agent,
    }


async def publish_event(payload: dict) -> None:
    try:
        await redis_client.xadd(
            settings.redis_stream_key,
            {"data": json.dumps(payload)},
            maxlen=100000,
            approximate=True,
        )
    except Exception as exc:
        logging.exception("Failed to publish event to Redis")
        raise HTTPException(status_code=503, detail="Redis unavailable") from exc