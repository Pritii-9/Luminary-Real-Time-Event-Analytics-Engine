import clickhouse_connect

from app.core.config import settings


def main():
    client = clickhouse_connect.get_client(
        host=settings.clickhouse_host,
        port=settings.clickhouse_port,
        username=settings.clickhouse_user,
        password=settings.clickhouse_password,
        database="analytics",
        secure=settings.clickhouse_secure,
        verify=False,
    )

    print("Querying ClickHouse Cloud...")

    result = client.query("""
        SELECT event_id, site_id, path, browser, os
        FROM analytics.events
        ORDER BY event_time DESC
        LIMIT 20
    """)

    print(f"Total rows returned: {len(result.result_rows)}")

    for row in result.result_rows:
        print(row)


if __name__ == "__main__":
    main()