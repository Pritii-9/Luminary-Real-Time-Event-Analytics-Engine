import clickhouse_connect

from app.core.config import settings

_client = None


def get_clickhouse_client():
    global _client

    if _client is None:
        _client = clickhouse_connect.get_client(
            host=settings.clickhouse_host,
            port=settings.clickhouse_port,
            username=settings.clickhouse_user,
            password=settings.clickhouse_password,
            database="analytics",
            secure=settings.clickhouse_secure,
            verify=False,
        )

    return _client