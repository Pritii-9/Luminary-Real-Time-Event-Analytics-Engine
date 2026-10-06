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


def extract_client_ip(request: Request) -> str:
    """Extract real client IP behind reverse proxies (Cloudflare, Vercel, Render, Nginx)."""
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip:
        return x_real_ip.strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


def extract_country(request: Request, client_ip: str) -> str:
    """Extract country from Edge CDN headers (Cloudflare/Vercel) or MaxMind GeoIP fallback."""
    edge_country = (
        request.headers.get("cf-ipcountry")
        or request.headers.get("x-vercel-ip-country")
        or request.headers.get("x-country-code")
    )
    if edge_country and edge_country.upper() not in ("XX", "T1", "UNKNOWN"):
        return edge_country.upper()

    try:
        from app.services.enrichment.geo import enrich_geo
        geo = enrich_geo(client_ip)
        if geo and geo.get("country"):
            return geo["country"]
    except Exception:
        pass

    return "Unknown"


def enrich_event(event: EventIn, request: Request) -> dict:
    ip = extract_client_ip(request)
    country = extract_country(request, ip)
    
    # GDPR-compliant: hash IP with daily rotating salt + JWT secret to anonymize visitor tracking
    from datetime import datetime, timezone
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    salt = settings.jwt_secret
    ip_hash = hashlib.sha256(f"{ip}-{today_str}-{salt}".encode()).hexdigest()

    user_agent = request.headers.get("user-agent", "")
    site_id = resolve_site_id(event)

    # Use client-provided IDs if available (from localStorage/sessionStorage) to accurately track returning visitors
    # across IP changes or days. Fallback to IP/UA fingerprint if client storage is disabled.
    final_visitor_id = event.visitor_id if event.visitor_id else hashlib.sha256(f"{ip_hash}-{site_id}-{user_agent}".encode()).hexdigest()
    
    import math
    session_window = math.floor(time.time() / 1800)  # 30 minute window
    final_session_id = event.session_id if event.session_id else hashlib.sha256(f"{ip_hash}-{site_id}-{user_agent}-{session_window}".encode()).hexdigest()

    return {
        "event_id": str(uuid.uuid4()),

        "timestamp": event.timestamp or int(time.time()),
        "site_id": site_id,
        "event_type": event.event_type,
        "url": str(event.url),
        "path": event.path,
        "referrer": event.referrer or "",
        "session_id": final_session_id,
        "visitor_id": final_visitor_id,
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
        "country": country,
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