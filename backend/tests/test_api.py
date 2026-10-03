"""Simple, fresher-friendly API integration tests.
Uses Python's standard `unittest` framework and FastAPI `TestClient`.
Easy to run, read, and explain during software engineering interviews.
"""

import os
import sys
import unittest

# Ensure the backend directory is in the Python search path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import create_tables
from app.services.cyber_threat_service import scan_payload_threats


class TestLuminaryAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Create database tables and initialize the TestClient."""
        create_tables()
        cls.client = TestClient(app)

    def test_1_health_check(self):
        """Verify backend health check returns HTTP 200 OK."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_2_auth_register_and_login(self):
        """Test registration and login flow for a new user."""
        email = "fresher_test@luminary.dev"
        password = "Password123!"

        # 1. Register new user
        reg_response = self.client.post("/api/v1/auth/register", json={
            "email": email,
            "password": password
        })
        self.assertIn(reg_response.status_code, [201, 409])

        # 2. Login user
        login_response = self.client.post("/api/v1/auth/login", json={
            "email": email,
            "password": password
        })
        self.assertEqual(login_response.status_code, 200)
        self.assertIn("access_token", login_response.json())

    def test_3_cyber_threat_sqli(self):
        """Verify ML cyber threat detector flags SQL Injection attacks."""
        sqli_url = "https://example.com/search?q=1' UNION SELECT username, password FROM users --"
        threat = scan_payload_threats(
            url=sqli_url,
            path="/search",
            referrer="",
            user_agent="Mozilla/5.0"
        )
        self.assertTrue(threat["threat_detected"])
        self.assertIn("SQL_INJECTION", threat["categories"])
        self.assertEqual(threat["severity"], "CRITICAL")

    def test_4_cyber_threat_xss(self):
        """Verify ML scanner flags Cross-Site Scripting (XSS) payloads."""
        xss_url = "https://example.com/comment?body=<script>alert('xss')</script>"
        threat = scan_payload_threats(
            url=xss_url,
            path="/comment",
            referrer="",
            user_agent="Mozilla/5.0"
        )
        self.assertTrue(threat["threat_detected"])
        self.assertIn("XSS_ATTACK", threat["categories"])


if __name__ == "__main__":
    unittest.main()
