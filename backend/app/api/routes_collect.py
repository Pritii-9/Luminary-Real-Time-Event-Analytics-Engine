from fastapi import APIRouter, Request, Response, Depends, HTTPException
from urllib.parse import urlparse
from sqlmodel import Session, select
import json
import datetime
import logging

from app.schemas.event import EventIn
from app.services.event_service import enrich_event, publish_event, update_realtime
from app.core.database import get_session, Site, User
from app.services.redis_client import redis_client
from app.services.rate_limiter import is_rate_limited

router = APIRouter()

def extract_domain(url: str) -> str:
    if not url:
        return ""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc
        if ":" in netloc:
            netloc = netloc.split(":")[0]
        if netloc.startswith("www."):
            netloc = netloc[4:]
        return netloc.lower()
    except Exception:
        return ""

async def get_site_details(site_id: str | None, public_token: str | None, session: Session) -> dict | None:
    if not site_id and not public_token:
        return None
        
    cache_key = f"site_details:{site_id or public_token}"
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            return json.loads(cached.decode("utf-8"))
    except Exception:
        pass

    site = None
    if site_id:
        site = session.exec(select(Site).where(Site.site_id == site_id)).first()
    if not site and public_token:
        site = session.exec(select(Site).where(Site.public_token == public_token)).first()


    if not site:
        return None

    owner = session.exec(select(User).where(User.id == site.user_id)).first()
    limit = owner.monthly_pageview_limit if owner else 10000

    details = {
        "domain": site.domain,
        "site_id": site.site_id,
        "monthly_pageview_limit": limit
    }

    try:
        await redis_client.set(cache_key, json.dumps(details), ex=3600)
    except Exception:
        pass

    return details

@router.post("/api/v1/collect", status_code=204)
async def collect(event: EventIn, request: Request, session: Session = Depends(get_session)):
    # 0. Rate limiting check (60 requests/min)
    if await is_rate_limited(request, "collect", limit=60, window_seconds=60):
        raise HTTPException(status_code=429, detail="Too many events sent. Please slow down.")

    # 1. Fetch registered site details (from Redis cache or DB)
    details = await get_site_details(event.site_id, event.public_token, session)
    if not details:
        raise HTTPException(status_code=404, detail="Site not found or inactive")

    # Automated AI Bot & Scraper Filter
    user_agent = request.headers.get("user-agent", "")
    known_ai_bots = ['ChatGPT-User', 'GPTBot', 'ClaudeBot', 'PerplexityBot', 'Anthropic-AI', 'Google-Extended', 'Applebot-Extended']
    matched_bot = None
    for bot in known_ai_bots:
        if bot.lower() in user_agent.lower():
            matched_bot = bot
            break

    if matched_bot:
        try:
            from app.core.database import BotTrafficLog
            bot_log = BotTrafficLog(
                site_id=details["site_id"],
                bot_name=matched_bot,
                target_url=str(event.url),
                timestamp=int(datetime.datetime.utcnow().timestamp())
            )
            session.add(bot_log)
            session.commit()
            logging.info(f"Intercepted and logged AI bot traffic: {matched_bot}")
        except Exception as exc:
            logging.warning(f"Bot traffic log save failed: {exc}")
        return Response(status_code=204)

    cleaned_registered = extract_domain(details["domain"])


    # 2. Validate payload URL domain
    event_url = event.url or ""
    payload_domain = extract_domain(event_url) if event_url else cleaned_registered
    if payload_domain != cleaned_registered:
        is_local = payload_domain in ("localhost", "127.0.0.1") or cleaned_registered in ("localhost", "127.0.0.1")
        is_subdomain = payload_domain.endswith("." + cleaned_registered) or cleaned_registered.endswith("." + payload_domain)
        if not is_local and not is_subdomain:
            raise HTTPException(status_code=400, detail="Event URL domain does not match registered site domain")

    # 3. Validate HTTP headers (Origin / Referer) if they are present
    referer = request.headers.get("referer")
    origin = request.headers.get("origin")
    
    if referer:
        referer_domain = extract_domain(referer)
        if referer_domain != cleaned_registered and not referer_domain.endswith("." + cleaned_registered):
            is_local_ref = referer_domain in ("localhost", "127.0.0.1") or cleaned_registered in ("localhost", "127.0.0.1")
            if not is_local_ref:
                raise HTTPException(status_code=403, detail="Forbidden: HTTP Referer mismatch")
            
    if origin:
        origin_domain = extract_domain(origin)
        if origin_domain != cleaned_registered and not origin_domain.endswith("." + cleaned_registered):
            is_local_orig = origin_domain in ("localhost", "127.0.0.1") or cleaned_registered in ("localhost", "127.0.0.1")
            if not is_local_orig:
                raise HTTPException(status_code=403, detail="Forbidden: HTTP Origin mismatch")


    # 4. Check and increment quota limit
    # Key format: quota:{site_id}:{year}-{month}
    now = datetime.datetime.utcnow()
    month_str = now.strftime("%Y-%m")
    quota_key = f"quota:{details['site_id']}:{month_str}"
    
    try:
        current_usage = await redis_client.get(quota_key)
        if current_usage and int(current_usage) >= details["monthly_pageview_limit"]:
            raise HTTPException(
                status_code=402, 
                detail="Monthly event quota exceeded. Please upgrade your subscription plan."
            )
            
        # Increment quota and set expiration of 35 days (covers next month start)
        async with redis_client.pipeline(transaction=True) as pipe:
            await pipe.incr(quota_key)
            if not current_usage:
                await pipe.expire(quota_key, 35 * 86400)
            await pipe.execute()
    except HTTPException:
        raise
    except Exception as exc:
        logging.error(f"Quota check error for site {details['site_id']}: {exc}")

    # 5. Ingest event
    payload = enrich_event(event, request)

    # Publish to Redis Queue
    queue_success = await publish_event(payload)
    await update_realtime(payload)

    # If Redis queue is unavailable, write directly to database as a synchronous fallback
    if not queue_success:
        try:
            from user_agents import parse
            from app.core.database import EventRecord

            ua_str = payload.get("user_agent", "")
            ua = parse(ua_str)
            dev_type = "mobile" if ua.is_mobile else ("tablet" if ua.is_tablet else "desktop")
            browser_name = ua.browser.family or "Chrome"

            record = EventRecord(
                event_id=payload.get("event_id"),
                site_id=payload.get("site_id"),
                event_type=payload.get("event_type", "pageview"),
                timestamp=payload.get("timestamp", int(datetime.datetime.utcnow().timestamp())),
                url=payload.get("url", ""),
                path=payload.get("path", "/"),
                referrer=payload.get("referrer", ""),
                session_id=payload.get("session_id", ""),
                visitor_id=payload.get("visitor_id", ""),
                screen=payload.get("screen", ""),
                device_type=dev_type,
                browser=browser_name,
                country="Unknown",
            )
            session.add(record)
            session.commit()
            logging.info("Synched event to DB because Redis was offline.")
        except Exception as exc:
            logging.warning(f"Sync DB fallback ingest failed: {exc}")

    return Response(status_code=204)