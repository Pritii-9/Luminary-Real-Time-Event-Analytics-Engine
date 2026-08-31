import asyncio
import logging
from fastapi import Request
from app.services.redis_client import redis_client

async def _check_rate_limit_internal(client_ip: str, key_prefix: str, limit: int, window_seconds: int) -> bool:
    key = f"rate_limit:{key_prefix}:{client_ip}"
    current = await redis_client.get(key)
    if current and int(current) >= limit:
        return True

    async with redis_client.pipeline(transaction=True) as pipe:
        await pipe.incr(key)
        if not current:
            await pipe.expire(key, window_seconds)
        await pipe.execute()
        
    return False

async def is_rate_limited(request: Request, key_prefix: str, limit: int, window_seconds: int) -> bool:
    """
    Returns True if the client IP has exceeded the limit within the specified window.
    Fails open (returns False) immediately if Redis is unreachable or times out.
    """
    client_ip = request.client.host if request.client else "unknown"
    if client_ip == "unknown":
        return False

    try:
        return await asyncio.wait_for(
            _check_rate_limit_internal(client_ip, key_prefix, limit, window_seconds),
            timeout=0.5
        )
    except Exception as e:
        logging.error(f"Rate limiter fail-open for IP {client_ip}: {e}")
        return False

