from typing import Literal, Optional
from pydantic import BaseModel, Field


class EventIn(BaseModel):
    # site_id OR public_token — at least one must be provided
    site_id: Optional[str] = Field(default=None, max_length=64)
    public_token: Optional[str] = Field(default=None, max_length=64)

    event_type: Literal["pageview", "custom"] = "pageview"
    url: str
    path: str
    referrer: Optional[str] = None
    session_id: Optional[str] = Field(default=None, max_length=128)
    visitor_id: Optional[str] = Field(default=None, max_length=128)
    screen: Optional[str] = None
    timestamp: Optional[int] = None

    # New fields from JS SDK
    language: Optional[str] = None
    timezone: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None