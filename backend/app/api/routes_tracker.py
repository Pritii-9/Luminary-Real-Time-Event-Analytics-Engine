"""Serves the lightweight tracker.js SDK."""

from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse

router = APIRouter(tags=["tracker"])

TRACKER_PATH = Path(__file__).resolve().parent.parent.parent / "static" / "tracker.js"


@router.get("/tracker.js")
async def serve_tracker():
    return FileResponse(
        TRACKER_PATH,
        media_type="application/javascript",
        headers={"Cache-Control": "public, max-age=3600"},
    )
