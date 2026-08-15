from fastapi import APIRouter, Query

from app.services import stats_service

router = APIRouter(prefix="/api/v1/stats")


@router.get("/summary")
def summary(
    site_id: str,
    days: int = Query(default=7, ge=1, le=90),
):
    return stats_service.get_summary(site_id, days)


@router.get("/timeseries")
def timeseries(
    site_id: str,
    days: int = Query(default=7, ge=1, le=90),
):
    return stats_service.get_timeseries(site_id, days)


@router.get("/pages")
def pages(
    site_id: str,
    days: int = Query(default=7, ge=1, le=90),
):
    return stats_service.get_top_pages(site_id, days)


@router.get("/referrers")
def referrers(
    site_id: str,
    days: int = Query(default=7, ge=1, le=90),
):
    return stats_service.get_top_referrers(site_id, days)


@router.get("/devices")
def devices(
    site_id: str,
    days: int = Query(default=7, ge=1, le=90),
):
    return stats_service.get_devices(site_id, days)