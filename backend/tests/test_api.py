"""Tests for auth, sites, collect, and stats endpoints."""

import os
import sys
import pytest
from unittest.mock import AsyncMock

# Ensure the backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Override SQLite path before importing app
os.environ["SQLITE_PATH"] = os.path.join(os.path.dirname(__file__), "test.db")

# Mock Redis client before importing routes/services to avoid loop errors
mock_redis = AsyncMock()
mock_redis.xadd = AsyncMock(return_value="1-0")
mock_redis.zadd = AsyncMock(return_value=1)
mock_redis.zremrangebyscore = AsyncMock(return_value=0)
mock_redis.zcard = AsyncMock(return_value=5)

import app.services.redis_client
app.services.redis_client.redis_client = mock_redis

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import engine
from sqlmodel import SQLModel


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    """Create test database tables before tests, drop after."""
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)
    # Dispose engine to close all connections and release file lock on Windows
    engine.dispose()
    db_path = os.environ.get("SQLITE_PATH", "")
    if db_path and os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception as e:
            print(f"Warning: Could not remove test database file: {e}")


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def auth_token(client):
    """Register a test user and return the JWT token."""
    resp = client.post("/api/v1/auth/register", json={
        "email": "test@luminary.dev",
        "password": "testpass123",
    })
    assert resp.status_code == 201
    return resp.json()["access_token"]


@pytest.fixture(scope="module")
def test_site(client, auth_token):
    """Create a test site and return the site data."""
    resp = client.post(
        "/api/v1/sites",
        json={"name": "Test Site", "domain": "test.com"},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert resp.status_code == 201
    return resp.json()


# ---------------------------------------------------------------------------
# Auth Tests
# ---------------------------------------------------------------------------

class TestAuth:
    def test_register_success(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "email": "user2@test.com",
            "password": "pass123",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == "user2@test.com"

    def test_register_duplicate(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "email": "user2@test.com",
            "password": "pass123",
        })
        assert resp.status_code == 409

    def test_login_success(self, client, auth_token):
        resp = client.post("/api/v1/auth/login", json={
            "email": "test@luminary.dev",
            "password": "testpass123",
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_login_wrong_password(self, client, auth_token):
        resp = client.post("/api/v1/auth/login", json={
            "email": "test@luminary.dev",
            "password": "wrongpass",
        })
        assert resp.status_code == 401

    def test_me_requires_auth(self, client):
        client.cookies.clear()
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_me_with_token(self, client, auth_token):
        # Explicitly pass token in header
        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == "test@luminary.dev"


# ---------------------------------------------------------------------------
# Site Tests
# ---------------------------------------------------------------------------

class TestSites:
    def test_create_site(self, test_site):
        assert test_site["name"] == "Test Site"
        assert test_site["domain"] == "test.com"
        assert "public_token" in test_site
        assert "site_id" in test_site

    def test_list_sites(self, client, auth_token):
        resp = client.get(
            "/api/v1/sites",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert resp.status_code == 200
        sites = resp.json()
        assert len(sites) >= 1

    def test_get_site(self, client, auth_token, test_site):
        resp = client.get(
            f"/api/v1/sites/{test_site['site_id']}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Test Site"

    def test_get_snippet(self, client, auth_token, test_site):
        resp = client.get(
            f"/api/v1/sites/{test_site['site_id']}/snippet",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert resp.status_code == 200
        assert "tracker.js" in resp.json()["snippet"]

    def test_sites_require_auth(self, client):
        client.cookies.clear()
        resp = client.get("/api/v1/sites")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Collect Tests
# ---------------------------------------------------------------------------

class TestCollect:
    def test_collect_with_site_id(self, client):
        resp = client.post("/api/v1/collect", json={
            "site_id": "site_123",
            "event_type": "pageview",
            "url": "https://example.com/home",
            "path": "/home",
            "session_id": "sess_1",
            "visitor_id": "vis_1",
        })
        assert resp.status_code == 204

    def test_collect_with_public_token(self, client, test_site):
        resp = client.post("/api/v1/collect", json={
            "public_token": test_site["public_token"],
            "event_type": "pageview",
            "url": "https://test.com/about",
            "path": "/about",
            "session_id": "sess_2",
            "visitor_id": "vis_2",
        })
        assert resp.status_code == 204

    def test_collect_with_utm(self, client):
        resp = client.post("/api/v1/collect", json={
            "site_id": "site_123",
            "event_type": "pageview",
            "url": "https://example.com/?utm_source=google",
            "path": "/",
            "session_id": "sess_3",
            "visitor_id": "vis_3",
            "utm_source": "google",
            "utm_medium": "cpc",
            "utm_campaign": "summer",
        })
        assert resp.status_code == 204

    def test_collect_invalid_token(self, client):
        resp = client.post("/api/v1/collect", json={
            "public_token": "invalid_token_xyz",
            "event_type": "pageview",
            "url": "https://example.com/",
            "path": "/",
            "session_id": "sess_4",
            "visitor_id": "vis_4",
        })
        assert resp.status_code == 400

    def test_collect_no_site(self, client):
        resp = client.post("/api/v1/collect", json={
            "event_type": "pageview",
            "url": "https://example.com/",
            "path": "/",
            "session_id": "sess_5",
            "visitor_id": "vis_5",
        })
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Stats Tests
# ---------------------------------------------------------------------------

class TestStats:
    def test_stats_require_auth(self, client, test_site):
        client.cookies.clear()
        resp = client.get(f"/api/v1/stats/summary?site_id={test_site['site_id']}")
        assert resp.status_code == 401

    def test_stats_wrong_site(self, client, auth_token):
        resp = client.get(
            "/api/v1/stats/summary?site_id=nonexistent_site",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Realtime Tests
# ---------------------------------------------------------------------------

class TestRealtime:
    def test_active_users(self, client):
        resp = client.get("/api/v1/realtime/active?site_id=site_123")
        assert resp.status_code == 200
        assert "active_visitors" in resp.json()


# ---------------------------------------------------------------------------
# Enrichment Tests
# ---------------------------------------------------------------------------

class TestEnrichment:
    def test_user_agent_parsing(self):
        from app.services.enrichment.user_agent import parse_user_agent

        result = parse_user_agent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        assert result["browser"] == "Chrome"
        assert result["os"] == "Windows"
        assert result["device_type"] == "desktop"

    def test_bot_detection(self):
        from app.services.enrichment.bot import is_bot

        assert is_bot("Googlebot/2.1") is True
        assert is_bot("Mozilla/5.0 (Windows NT 10.0)") is False
        assert is_bot("", webdriver=True) is True

    def test_geo_graceful_fallback(self):
        from app.services.enrichment.geo import enrich_geo

        result = enrich_geo("127.0.0.1")
        assert "country" in result
        assert "city" in result
