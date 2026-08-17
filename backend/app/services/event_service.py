import hashlib
import json
import time
import uuid

from fastapi import Request, HTTPException
import logging

from app.schemas.event import EventIn
from app.services.redis_client import redis_client
from app.core.config import settings


def resolve_site_id(event: EventIn) -> str:
    """Resolve the internal site_id from either site_id or public_token."""
    if event.site_id:
        return event.site_id

    if event.public_token:
        # Lazy import to avoid circular dependency
        from app.core.database import Site, engine
        from sqlmodel import Session as SQLSession, select

        with SQLSession(engine) as session:
            site = session.exec(
                select(Site).where(Site.public_token == event.public_token)
            ).first()
            if site:
                return site.site_id

        raise HTTPException(status_code=400, detail="Invalid public_token")

    raise HTTPException(status_code=400, detail="site_id or public_token required")


def enrich_event(event: EventIn, request: Request) -> dict:
    ip = request.client.host if request.client else "unknown"
    
    # GDPR-compliant: hash IP with daily rotating salt + JWT secret to anonymize visitor tracking
    from datetime import datetime
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    salt = settings.jwt_secret
    ip_hash = hashlib.sha256(f"{ip}-{today_str}-{salt}".encode()).hexdigest()

    user_agent = request.headers.get("user-agent", "")
    site_id = resolve_site_id(event)

    # Dynamic GDPR-compliant IDs (eliminates cookies and client-side storage requirements)
    visitor_id = hashlib.sha256(f"{ip_hash}-{site_id}-{user_agent}".encode()).hexdigest()
    
    import math
    session_window = math.floor(time.time() / 1800)  # 30 minute window
    session_id = hashlib.sha256(f"{ip_hash}-{site_id}-{user_agent}-{session_window}".encode()).hexdigest()

    return {
        "event_id": str(uuid.uuid4()),

        "timestamp": event.timestamp or int(time.time()),
        "site_id": site_id,
        "event_type": event.event_type,
        "url": str(event.url),
        "path": event.path,
        "referrer": event.referrer or "",
        "session_id": session_id,
        "visitor_id": visitor_id,
        "screen": event.screen or "",
        "ip_hash": ip_hash,

        "user_agent": user_agent,
        "language": event.language or "",
        "timezone": event.timezone or "",
        "utm_source": event.utm_source or "",
        "utm_medium": event.utm_medium or "",
        "utm_campaign": event.utm_campaign or "",
        "utm_term": event.utm_term or "",
        "utm_content": event.utm_content or "",
        "client_ip": ip,  # passed for geo enrichment in worker, NOT stored in CH
    }


async def update_realtime(payload: dict) -> None:
    """Update Redis sorted set for real-time active visitors."""
    site_id = payload.get("site_id", "")
    visitor_id = payload.get("visitor_id", "")
    if site_id and visitor_id:
        key = f"realtime:{site_id}"
        now = time.time()
        try:
            await redis_client.zadd(key, {visitor_id: now})
            # Remove entries older than 5 minutes
            cutoff = now - 300
            await redis_client.zremrangebyscore(key, "-inf", cutoff)
        except Exception:
            logging.exception("Failed to update real-time state")


async def publish_event(payload: dict) -> bool:
    # Strip client_ip before publishing (worker will receive it for geo, but we don't persist raw IP)
    stream_payload = dict(payload)

    try:
        await redis_client.xadd(
            settings.redis_stream_key,
            {"data": json.dumps(stream_payload)},
            maxlen=100000,
            approximate=True,
        )
        return True
    except Exception:
        logging.warning("Redis stream unavailable, skipping queue publishing")
        return False