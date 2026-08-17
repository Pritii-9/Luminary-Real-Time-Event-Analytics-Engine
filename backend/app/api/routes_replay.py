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
