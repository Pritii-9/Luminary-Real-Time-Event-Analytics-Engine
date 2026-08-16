import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    redis_url: str = "redis://localhost:6379/0"
    redis_stream_key: str = "events:raw"
    redis_stream_maxlen: int = 100000
    cors_origins: str = "http://localhost:3000"

    # ClickHouse settings
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8443
    clickhouse_user: str = "default"
    clickhouse_password: str = ""
    clickhouse_secure: bool = False

    # Auth / JWT
    jwt_secret: str = "luminary-dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hours

    # SQLite metadata DB
    sqlite_path: str = str(BASE_DIR / "data" / "luminary.db")

    # GeoIP (optional MaxMind GeoLite2-City.mmdb path)
    geoip_db_path: str = ""

    class Config:
        env_file = (os.path.join(BASE_DIR, ".env"), ".env")


settings = Settings()