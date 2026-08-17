"""Redis-based cache service for stats endpoints."""

import json
import logging

from redis import Redis

from app.core.config import settings

_sync_redis = Redis.from_url(settings.redis_url, socket_timeout=1, socket_connect_timeout=1, decode_responses=True)


DEFAULT_TTL = 60  # seconds


def cache_key(site_id: str, endpoint: str, days: int) -> str:
    return f"cache:{site_id}:{endpoint}:{days}"


def get_cached(site_id: str, endpoint: str, days: int):
    """Return cached data or None."""
    key = cache_key(site_id, endpoint, days)
    try:
        raw = _sync_redis.get(key)
        if raw:
            return json.loads(raw)
    except Exception as e:
        logging.debug(f"Cache read failed: {e}")
    return None


def set_cached(site_id: str, endpoint: str, days: int, data, ttl: int = DEFAULT_TTL):
    """Store data in cache with TTL."""
    key = cache_key(site_id, endpoint, days)
    try:
        _sync_redis.setex(key, ttl, json.dumps(data, default=str))
    except Exception as e:
        logging.debug(f"Cache write failed: {e}")
