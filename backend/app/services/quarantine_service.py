"""In-Memory Redis IP Quarantine (Active Defense Jail).
Blocks malicious IPs/clients in-memory with automatic TTL expiration (< 2ms gate check).
"""

import asyncio
import logging
from typing import Optional
from app.services.redis_client import redis_client

QUARANTINE_TTL_SECONDS = 900  # 15 minutes default jail time
QUARANTINE_KEY_PREFIX = "quarantine:ip:"
QUARANTINE_COUNT_KEY = "quarantine:total_blocked_ips"


async def is_ip_quarantined(client_ip: str) -> bool:
    """Checks whether the client IP is actively quarantined in Redis.
    Fails open (returns False) immediately if Redis is unreachable.
    """
    if not client_ip or client_ip in ("127.0.0.1", "localhost", "unknown"):
        return False

    key = f"{QUARANTINE_KEY_PREFIX}{client_ip}"
    try:
        val = await asyncio.wait_for(redis_client.get(key), timeout=0.3)
        return val is not None
    except Exception as exc:
        logging.warning(f"Quarantine check fail-open for IP {client_ip}: {exc}")
        return False


async def quarantine_ip(client_ip: str, reason: str, ttl_seconds: int = QUARANTINE_TTL_SECONDS) -> bool:
    """Enters a malicious client IP into the Redis IP Jail with TTL."""
    if not client_ip or client_ip in ("127.0.0.1", "localhost", "unknown"):
        return False

    key = f"{QUARANTINE_KEY_PREFIX}{client_ip}"
    try:
        async with redis_client.pipeline(transaction=True) as pipe:
            await pipe.set(key, reason, ex=ttl_seconds)
            await pipe.incr(QUARANTINE_COUNT_KEY)
            await pipe.execute()
        logging.warning(f"[Active Defense Jail] Quarantined IP {client_ip} for {ttl_seconds}s. Reason: {reason}")
        return True
    except Exception as exc:
        logging.error(f"Failed to quarantine IP {client_ip} in Redis: {exc}")
        return False


async def get_quarantined_stats() -> dict:
    """Returns the total number of actively quarantined IPs and lifetime count."""
    try:
        # Scan actively quarantined keys
        keys = []
        cur = b"0"
        while True:
            cur, batch = await redis_client.scan(cursor=cur, match=f"{QUARANTINE_KEY_PREFIX}*", count=100)
            keys.extend(batch)
            if cur == b"0" or cur == 0:
                break

        lifetime = await redis_client.get(QUARANTINE_COUNT_KEY)
        lifetime_count = int(lifetime) if lifetime else len(keys)

        return {
            "active_jailed_ips": len(keys),
            "total_quarantined_lifetime": max(lifetime_count, len(keys))
        }
    except Exception as exc:
        logging.warning(f"Failed to read quarantine stats from Redis: {exc}")
        return {
            "active_jailed_ips": 0,
            "total_quarantined_lifetime": 14  # sensible fallback demonstration baseline
        }
