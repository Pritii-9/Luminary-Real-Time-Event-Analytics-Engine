from fastapi import APIRouter, Request, Response

from app.schemas.event import EventIn
from app.services.event_service import enrich_event, publish_event

router = APIRouter()


@router.post("/api/v1/collect", status_code=204)
async def collect(event: EventIn, request: Request):
    payload = enrich_event(event, request)
    await publish_event(payload)
    return Response(status_code=204)