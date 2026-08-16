"""Stats API routes — requires authentication and site ownership."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session as SQLSession, select

from app.core.auth import get_current_user
from app.core.database import Site, User, get_session
from app.services import stats_service

router = APIRouter(prefix="/api/v1/stats")


def _verify_site_access(site_id: str, user: User, session: SQLSession) -> Site:
    """Ensure the authenticated user owns this site."""
    site = session.exec(
        select(Site).where(Site.site_id == site_id, Site.user_id == user.id)
    ).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found or access denied")
    return site


@router.get("/summary")
def summary(
    site_id: str,
    days: int = Query(default=7, ge=1, le=90),
    user: User = Depends(get_current_user),
    session: SQLSession = Depends(get_session),
):
    _verify_site_access(site_id, user, session)
    return stats_service.get_summary(site_id, days)


@router.get("/timeseries")
def timeseries(
    site_id: str,
    days: int = Query(default=7, ge=1, le=90),
    user: User = Depends(get_current_user),
    session: SQLSession = Depends(get_session),
):
    _verify_site_access(site_id, user, session)
    return stats_service.get_timeseries(site_id, days)


@router.get("/pages")
def pages(
    site_id: str,
    days: int = Query(default=7, ge=1, le=90),
    user: User = Depends(get_current_user),
    session: SQLSession = Depends(get_session),
):
    _verify_site_access(site_id, user, session)
    return stats_service.get_top_pages(site_id, days)


@router.get("/referrers")
def referrers(
    site_id: str,
    days: int = Query(default=7, ge=1, le=90),
    user: User = Depends(get_current_user),
    session: SQLSession = Depends(get_session),
):
    _verify_site_access(site_id, user, session)
    return stats_service.get_top_referrers(site_id, days)


@router.get("/devices")
def devices(
    site_id: str,
    days: int = Query(default=7, ge=1, le=90),
    user: User = Depends(get_current_user),
    session: SQLSession = Depends(get_session),
):
    _verify_site_access(site_id, user, session)
    return stats_service.get_devices(site_id, days)


@router.get("/browsers")
def browsers(
    site_id: str,
    days: int = Query(default=7, ge=1, le=90),
    user: User = Depends(get_current_user),
    session: SQLSession = Depends(get_session),
):
    _verify_site_access(site_id, user, session)
    return stats_service.get_browsers(site_id, days)


@router.get("/countries")
def countries(
    site_id: str,
    days: int = Query(default=7, ge=1, le=90),
    user: User = Depends(get_current_user),
    session: SQLSession = Depends(get_session),
):
    _verify_site_access(site_id, user, session)
    return stats_service.get_countries(site_id, days)