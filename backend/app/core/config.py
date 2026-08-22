import os
from pathlib import Path
from pydantic_settings import BaseSettings
import logging
import secrets
from typing import Optional
import logging
import secrets
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    redis_url: str = "redis://localhost:6379/0"
    redis_stream_key: str = "events:raw"
    redis_stream_maxlen: int = 100000
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:8000,http://127.0.0.1:8000,https://luminary-web-event-engine.vercel.app"


    # ClickHouse settings
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8443
    clickhouse_user: str = "default"
    clickhouse_password: str = ""
    clickhouse_secure: bool = False

    # Auth / JWT
    jwt_secret: Optional[str] = None
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hours

    sqlite_path: str = str(BASE_DIR / "data" / "luminary.db")
    database_url: str = ""

    # GeoIP (optional MaxMind GeoLite2-City.mmdb path)
    geoip_db_path: str = ""

    # SMTP Settings for OTP verification
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_sender: str = "noreply@luminary.dev"

    # Stripe Settings
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_pro_price_id: str = "price_mock_pro"
    stripe_enterprise_price_id: str = "price_mock_enterprise"
    frontend_url: str = "http://localhost:3001"
    app_url: str = ""

    class Config:
        env_file = (os.path.join(BASE_DIR, ".env"), ".env")


settings = Settings()

# If JWT_SECRET is not set in the environment, generate an ephemeral secret for
# local development and warn loudly. In production (Render, Vercel, etc.) set
# the JWT_SECRET env var to a secure, random value so tokens cannot be forged.
if not settings.jwt_secret:
    logging.warning(
        "JWT secret not set; generating an ephemeral secret for development. Set JWT_SECRET in the environment for production."
    )
    settings.jwt_secret = secrets.token_hex(32)
