"""Redis-based cache service for stats endpoints."""

import json
import logging
import time

from redis import Redis

from app.core.config import settings

_sync_redis = Redis.from_url(settings.redis_url, socket_timeout=0.2, socket_connect_timeout=0.2, decode_responses=True)

DEFAULT_TTL = 60  # seconds
_redis_disabled_until = 0


_memory_cache = {}


def cache_key(site_id: str, endpoint: str, days: int) -> str:
    return f"cache:{site_id}:{endpoint}:{days}"


def get_cached(site_id: str, endpoint: str, days: int):
    """Return cached data or None."""
    key = cache_key(site_id, endpoint, days)
    
    # 1. Fast in-memory cache (0ms response)
    mem_entry = _memory_cache.get(key)
    if mem_entry:
        val, expires_at = mem_entry
        if time.time() < expires_at:
            return val
        else:
            del _memory_cache[key]

    # 2. Redis cache fallback
    global _redis_disabled_until
    if time.time() >= _redis_disabled_until:
        try:
            raw = _sync_redis.get(key)
            if raw:
                data = json.loads(raw)
                _memory_cache[key] = (data, time.time() + 15)
                return data
        except Exception as e:
            _redis_disabled_until = time.time() + 30
            logging.debug(f"Cache read failed, disabling for 30s: {e}")

    return None


def set_cached(site_id: str, endpoint: str, days: int, data, ttl: int = DEFAULT_TTL):
    """Store data in cache with TTL."""
    is_empty = False
    if isinstance(data, dict) and not data.get("pageviews"):
        is_empty = True
    elif isinstance(data, list) and len(data) == 0:
        is_empty = True

    effective_ttl = 2 if is_empty else ttl
    key = cache_key(site_id, endpoint, days)
    _memory_cache[key] = (data, time.time() + (2 if is_empty else 15))

    global _redis_disabled_until
    if time.time() < _redis_disabled_until:
        return

    try:
        _sync_redis.setex(key, effective_ttl, json.dumps(data, default=str))
    except Exception as e:
        _redis_disabled_until = time.time() + 30
        logging.debug(f"Cache write failed, disabling for 30s: {e}")


def invalidate_site_cache(site_id: str):
    """Clear memory and Redis cache for a site when new events arrive."""
    if not site_id:
        return

    # Clear memory cache entries for site
    keys_to_del = [k for k in list(_memory_cache.keys()) if f":{site_id}:" in k]
    for k in keys_to_del:
        _memory_cache.pop(k, None)

    global _redis_disabled_until
    if time.time() < _redis_disabled_until:
        return

    try:
        keys = _sync_redis.keys(f"cache:{site_id}:*")
        if keys:
            _sync_redis.delete(*keys)
    except Exception as e:
        _redis_disabled_until = time.time() + 30
        logging.debug(f"Cache invalidate failed: {e}")


