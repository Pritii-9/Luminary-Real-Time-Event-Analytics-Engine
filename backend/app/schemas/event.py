from typing import Literal, Optional
from pydantic import BaseModel, Field


class EventIn(BaseModel):
    # site_id OR public_token — at least one must be provided
    site_id: Optional[str] = Field(default=None, max_length=256)
    public_token: Optional[str] = Field(default=None, max_length=256)

    event_type: str = "pageview"
    url: Optional[str] = ""
    path: Optional[str] = "/"
    referrer: Optional[str] = ""
    session_id: Optional[str] = Field(default=None, max_length=256)
    visitor_id: Optional[str] = Field(default=None, max_length=256)
    screen: Optional[str] = ""
    timestamp: Optional[int] = None

    # Optional metadata & UTMs
    language: Optional[str] = None
    timezone: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None