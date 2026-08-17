from redis.asyncio import from_url

from app.core.config import settings

redis_client = from_url(
    settings.redis_url,
    decode_responses=True,
    socket_connect_timeout=1.0,
    socket_timeout=1.0,
)