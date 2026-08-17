import logging
from fastapi import Request, HTTPException
from app.services.redis_client import redis_client

async def is_rate_limited(request: Request, key_prefix: str, limit: int, window_seconds: int) -> bool:
    """
    Returns True if the client IP has exceeded the limit within the specified window.
    """
    client_ip = request.client.host if request.client else "unknown"
    if client_ip == "unknown":
        return False  # Do not block if IP cannot be resolved

    key = f"rate_limit:{key_prefix}:{client_ip}"
    try:
        current = await redis_client.get(key)
        if current and int(current) >= limit:
            return True

        async with redis_client.pipeline(transaction=True) as pipe:
            await pipe.incr(key)
            if not current:
                await pipe.expire(key, window_seconds)
            await pipe.execute()
            
        return False
    except Exception as e:
        logging.error(f"Rate limiter error for IP {client_ip}: {e}")
        return False  # Fail-open: do not block users if Redis has issues
