"""Real-time active users endpoints — polling and SSE."""

import asyncio
import time

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.services.redis_client import redis_client

router = APIRouter(prefix="/api/v1/realtime", tags=["realtime"])


async def _get_active_count(site_id: str) -> int:
    """Get active visitor count from Redis sorted set after pruning old entries."""
    key = f"realtime:{site_id}"
    cutoff = time.time() - 300  # 5 minutes
    await redis_client.zremrangebyscore(key, "-inf", cutoff)
    count = await redis_client.zcard(key)
    return count


@router.get("/active")
async def active_users(site_id: str = Query(...)):
    count = await _get_active_count(site_id)
    return {"site_id": site_id, "active_visitors": count}


@router.get("/stream")
async def realtime_stream(site_id: str = Query(...)):
    """Server-Sent Events endpoint that pushes active visitor count every 5 seconds."""

    async def event_generator():
        while True:
            count = await _get_active_count(site_id)
            yield f"data: {{\"active_visitors\": {count}}}\n\n"
            await asyncio.sleep(5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
