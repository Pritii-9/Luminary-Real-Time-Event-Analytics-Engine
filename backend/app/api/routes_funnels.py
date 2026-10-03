"""FastAPI route handlers for conversion funnels."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlmodel import Session

from app.core.auth import get_current_user
from app.core.database import User, get_session
from app.services.funnel_service import (
    create_funnel,
    get_funnels_for_site,
    delete_funnel,
    analyze_funnel,
)

router = APIRouter(prefix="/api/v1/funnels", tags=["Funnels"])


class StepItem(BaseModel):
    name: str
    path: str


class FunnelCreatePayload(BaseModel):
    site_id: str
    name: str
    steps: List[StepItem]


@router.get("")
def list_site_funnels(
    site_id: str,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Retrieves all funnels created for a site property."""
    return get_funnels_for_site(site_id=site_id, user_id=user.id, session=session)


@router.post("")
def create_site_funnel(
    body: FunnelCreatePayload,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Creates a new multi-step conversion funnel definition."""
    if len(body.steps) < 2:
        raise HTTPException(status_code=400, detail="A funnel must contain at least 2 steps.")

    steps_dict = [step.model_dump() for step in body.steps]
    funnel = create_funnel(
        user_id=user.id,
        site_id=body.site_id,
        name=body.name,
        steps=steps_dict,
        session=session,
    )
    return {"message": "Funnel created successfully", "funnel_id": funnel.id}


@router.delete("/{funnel_id}")
def remove_funnel(
    funnel_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Deletes a funnel definition."""
    success = delete_funnel(funnel_id=funnel_id, user_id=user.id, session=session)
    if not success:
        raise HTTPException(status_code=404, detail="Funnel not found or unauthorized.")
    return {"message": "Funnel deleted successfully"}


@router.get("/{funnel_id}/analysis")
def get_funnel_analysis(
    funnel_id: int,
    days: int = 30,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Calculates step retention, drop-off percentages, and overall conversion rate for a funnel."""
    analysis = analyze_funnel(funnel_id=funnel_id, days=days, session=session)
    if not analysis:
        raise HTTPException(status_code=404, detail="Funnel not found.")
    return analysis
