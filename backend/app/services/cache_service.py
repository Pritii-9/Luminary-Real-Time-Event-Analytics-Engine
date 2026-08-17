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
    key = cache_key(site_id, endpoint, days)
    _memory_cache[key] = (data, time.time() + 15)

    global _redis_disabled_until
    if time.time() < _redis_disabled_until:
        return

    try:
        _sync_redis.setex(key, ttl, json.dumps(data, default=str))
    except Exception as e:
        _redis_disabled_until = time.time() + 30
        logging.debug(f"Cache write failed, disabling for 30s: {e}")


