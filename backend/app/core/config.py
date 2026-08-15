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

    class Config:
        env_file = (os.path.join(BASE_DIR, ".env"), ".env")


settings = Settings()