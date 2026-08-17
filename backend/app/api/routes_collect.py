from fastapi import APIRouter, Request, Response, Depends, HTTPException
from urllib.parse import urlparse
from sqlmodel import Session, select

from app.schemas.event import EventIn
from app.services.event_service import enrich_event, publish_event, update_realtime
from app.core.database import get_session, Site
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

async def get_site_domain(site_id: str | None, public_token: str | None, session: Session) -> str:
    if not site_id and not public_token:
        return ""
        
    cache_key = f"site_domain:{site_id or public_token}"
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            return cached.decode("utf-8")
    except Exception:
        pass

    site = None
    if site_id:
        site = session.exec(select(Site).where(Site.site_id == site_id)).first()
    elif public_token:
        site = session.exec(select(Site).where(Site.public_token == public_token)).first()

    if not site:
        return ""

    try:
        await redis_client.set(cache_key, site.domain, ex=3600)
    except Exception:
        pass

    return site.domain

@router.post("/api/v1/collect", status_code=204)
async def collect(event: EventIn, request: Request, session: Session = Depends(get_session)):
    # 0. Rate limiting check (60 requests/min)
    if await is_rate_limited(request, "collect", limit=60, window_seconds=60):
        raise HTTPException(status_code=429, detail="Too many events sent. Please slow down.")

    # 1. Fetch registered site domain (from Redis cache or DB)
    registered_domain = await get_site_domain(event.site_id, event.public_token, session)
    if not registered_domain:
        raise HTTPException(status_code=404, detail="Site not found or inactive")

    cleaned_registered = extract_domain(registered_domain)

    # 2. Validate payload URL domain
    payload_domain = extract_domain(event.url)
    if payload_domain != cleaned_registered:
        raise HTTPException(status_code=400, detail="Event URL domain does not match registered site domain")

    # 3. Validate HTTP headers (Origin / Referer) if they are present
    referer = request.headers.get("referer")
    origin = request.headers.get("origin")
    
    if referer:
        referer_domain = extract_domain(referer)
        if referer_domain != cleaned_registered and not referer_domain.endswith("." + cleaned_registered):
            raise HTTPException(status_code=403, detail="Forbidden: HTTP Referer mismatch")
            
    if origin:
        origin_domain = extract_domain(origin)
        if origin_domain != cleaned_registered and not origin_domain.endswith("." + cleaned_registered):
            raise HTTPException(status_code=403, detail="Forbidden: HTTP Origin mismatch")

    # 4. Ingest event
    payload = enrich_event(event, request)
    await publish_event(payload)
    await update_realtime(payload)
    return Response(status_code=204)