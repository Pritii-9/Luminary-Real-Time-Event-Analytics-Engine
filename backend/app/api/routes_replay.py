from fastapi import APIRouter, Request, Depends
from sqlmodel import Session, select
from app.core.database import get_session, SessionReplay
import json

router = APIRouter(tags=["session-replay"])

@router.post("/api/session-replay")
@router.post("/api/v1/session-replay")
async def save_session_replay(request: Request, session: Session = Depends(get_session)):
    body_bytes = await request.body()
    try:
        data = json.loads(body_bytes.decode("utf-8"))
    except Exception:
        try:
            form_data = await request.form()
            data = dict(form_data)
        except Exception:
            return {"status": "error", "message": "Invalid format"}

    site_id = data.get("site_id", "unknown")
    session_id = data.get("session_id", "unknown")
    path = data.get("path", "/")
    coordinates = data.get("coordinates", [])

    if not isinstance(coordinates, str):
        coordinates_str = json.dumps(coordinates)
    else:
        coordinates_str = coordinates

    replay = SessionReplay(
        site_id=site_id,
        session_id=session_id,
        path=path,
        coordinates=coordinates_str
    )
    session.add(replay)
    session.commit()
    return {"status": "ok"}


@router.get("/api/session-replay/list/{site_id}")
@router.get("/api/v1/session-replay/list/{site_id}")
def list_site_replays(site_id: str, session: Session = Depends(get_session)):
    replays = session.exec(
        select(SessionReplay).where(SessionReplay.site_id == site_id).order_by(SessionReplay.created_at.desc())
    ).all()
    
    result = []
    seen = set()
    for r in replays:
        if r.session_id not in seen:
            seen.add(r.session_id)
            result.append({
                "id": r.session_id,
                "user": f"Visitor #{r.session_id[:6]}",
                "location": "United States",
                "pages": 1,
                "duration": "1m 15s",
                "device": "Desktop / Chrome",
                "time": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "Recently"
            })
    return result


@router.get("/api/session-replay/{session_id}")
@router.get("/api/v1/session-replay/{session_id}")
def get_session_replay(session_id: str, session: Session = Depends(get_session)):
    replays = session.exec(
        select(SessionReplay).where(SessionReplay.session_id == session_id)
    ).all()
    
    result = []
    for r in replays:
        try:
            coords = json.loads(r.coordinates)
        except Exception:
            coords = []
        result.append({
            "id": r.id,
            "site_id": r.site_id,
            "session_id": r.session_id,
            "path": r.path,
            "coordinates": coords,
            "created_at": r.created_at
        })
    return result
