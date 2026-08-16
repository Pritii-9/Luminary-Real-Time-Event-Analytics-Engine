"""SQLite metadata database: users and sites tables."""

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel, create_engine, Session as SQLSession

from app.core.config import settings


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True, max_length=255)
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Site(SQLModel, table=True):
    __tablename__ = "sites"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    name: str = Field(max_length=128)
    domain: str = Field(max_length=255)
    public_token: str = Field(unique=True, index=True, max_length=64)
    site_id: str = Field(unique=True, index=True, max_length=64)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Engine & session helpers
# ---------------------------------------------------------------------------

import os

_db_dir = os.path.dirname(settings.sqlite_path)
if _db_dir:
    os.makedirs(_db_dir, exist_ok=True)

engine = create_engine(f"sqlite:///{settings.sqlite_path}", echo=False)


def create_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI dependency that yields a SQLModel session."""
    with SQLSession(engine) as session:
        yield session
