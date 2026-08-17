import threading
import clickhouse_connect

from app.core.config import settings

_local = threading.local()


def get_clickhouse_client():
    if not hasattr(_local, "client"):
        _local.client = clickhouse_connect.get_client(
            host=settings.clickhouse_host,
            port=settings.clickhouse_port,
            username=settings.clickhouse_user,
            password=settings.clickhouse_password,
            database="analytics",
            secure=settings.clickhouse_secure,
            verify=False,
            connect_timeout=0.5,
            send_receive_timeout=0.5,
        )

    return _local.client