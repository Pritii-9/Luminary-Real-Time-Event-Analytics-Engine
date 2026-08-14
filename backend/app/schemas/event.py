from typing import Literal, Optional
from pydantic import BaseModel, Field


class EventIn(BaseModel):
    site_id: str = Field(min_length=1, max_length=64)
    event_type: Literal["pageview", "custom"] = "pageview"
    url: str
    path: str
    referrer: Optional[str] = None
    session_id: str = Field(min_length=1, max_length=128)
    visitor_id: str = Field(min_length=1, max_length=128)
    screen: Optional[str] = None
    timestamp: Optional[int] = None