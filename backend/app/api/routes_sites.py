"""Site management API routes."""

import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlmodel import Session as SQLSession, select

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.database import Site, User, get_session


router = APIRouter(prefix="/api/v1/sites", tags=["sites"])


class CreateSiteRequest(BaseModel):
    name: str
    domain: str


class SiteResponse(BaseModel):
    id: int
    name: str
    domain: str
    public_token: str
    site_id: str
    created_at: str


class SnippetResponse(BaseModel):
    snippet: str
    public_token: str


def _generate_site_id() -> str:
    return f"site_{secrets.token_hex(8)}"


def _generate_public_token() -> str:
    return f"lum_{secrets.token_urlsafe(24)}"


def _site_to_response(site: Site) -> SiteResponse:
    return SiteResponse(
        id=site.id,
        name=site.name,
        domain=site.domain,
        public_token=site.public_token,
        site_id=site.site_id,
        created_at=site.created_at.isoformat(),
    )


@router.post("", response_model=SiteResponse, status_code=status.HTTP_201_CREATED)
def create_site(
    body: CreateSiteRequest,
    user: User = Depends(get_current_user),
    session: SQLSession = Depends(get_session),
):
    site = Site(
        user_id=user.id,
        name=body.name,
        domain=body.domain,
        public_token=_generate_public_token(),
        site_id=_generate_site_id(),
    )
    session.add(site)
    session.commit()
    session.refresh(site)
    return _site_to_response(site)


@router.get("", response_model=list[SiteResponse])
def list_sites(
    user: User = Depends(get_current_user),
    session: SQLSession = Depends(get_session),
):
    sites = session.exec(select(Site).where(Site.user_id == user.id)).all()
    return [_site_to_response(s) for s in sites]


@router.get("/{site_id}", response_model=SiteResponse)
def get_site(
    site_id: str,
    user: User = Depends(get_current_user),
    session: SQLSession = Depends(get_session),
):
    site = session.exec(
        select(Site).where(Site.site_id == site_id, Site.user_id == user.id)
    ).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return _site_to_response(site)


@router.get("/{site_id}/snippet", response_model=SnippetResponse)
def get_snippet(
    site_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    session: SQLSession = Depends(get_session),
):
    site = session.exec(
        select(Site).where(Site.site_id == site_id, Site.user_id == user.id)
    ).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    base_url = settings.app_url.rstrip("/") if settings.app_url else str(request.base_url).rstrip("/")
    snippet = (
        f'<script src="{base_url}/tracker.js?site={site.public_token}" defer></script>'
    )
    return SnippetResponse(snippet=snippet, public_token=site.public_token)


@router.delete("/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/{site_id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_site(
    site_id: str,
    user: User = Depends(get_current_user),
    session: SQLSession = Depends(get_session),
):
    site = session.exec(
        select(Site).where(
            (Site.site_id == site_id) | (Site.public_token == site_id),
            Site.user_id == user.id,
        )
    ).first()

    if not site and site_id.isdigit():
        site = session.exec(
            select(Site).where(Site.id == int(site_id), Site.user_id == user.id)
        ).first()

    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    session.delete(site)
    session.commit()
    return None
