from app.services.clickhouse_client import get_clickhouse_client


def _rows_to_dicts(result):
    columns = result.column_names
    return [dict(zip(columns, row)) for row in result.result_rows]


def get_summary(site_id: str, days: int):
    client = get_clickhouse_client()

    query = """
        SELECT
            count() AS pageviews,
            uniq(visitor_id) AS visitors,
            uniq(session_id) AS sessions
        FROM analytics.events
        WHERE site_id = {site_id:String}
          AND event_date >= today() - {days:Int32}
    """

    result = client.query(
        query,
        parameters={
            "site_id": site_id,
            "days": days,
        },
    )

    rows = _rows_to_dicts(result)
    return rows[0] if rows else {}


def get_timeseries(site_id: str, days: int):
    client = get_clickhouse_client()

    query = """
        SELECT
            event_date,
            count() AS pageviews,
            uniq(visitor_id) AS visitors
        FROM analytics.events
        WHERE site_id = {site_id:String}
          AND event_date >= today() - {days:Int32}
        GROUP BY event_date
        ORDER BY event_date
    """

    result = client.query(
        query,
        parameters={
            "site_id": site_id,
            "days": days,
        },
    )

    return _rows_to_dicts(result)


def get_top_pages(site_id: str, days: int):
    client = get_clickhouse_client()

    query = """
        SELECT
            path,
            count() AS views
        FROM analytics.events
        WHERE site_id = {site_id:String}
          AND event_date >= today() - {days:Int32}
        GROUP BY path
        ORDER BY views DESC
        LIMIT 10
    """

    result = client.query(
        query,
        parameters={
            "site_id": site_id,
            "days": days,
        },
    )

    return _rows_to_dicts(result)


def get_top_referrers(site_id: str, days: int):
    client = get_clickhouse_client()

    query = """
        SELECT
            referrer,
            count() AS views
        FROM analytics.events
        WHERE site_id = {site_id:String}
          AND event_date >= today() - {days:Int32}
          AND referrer != ''
        GROUP BY referrer
        ORDER BY views DESC
        LIMIT 10
    """

    result = client.query(
        query,
        parameters={
            "site_id": site_id,
            "days": days,
        },
    )

    return _rows_to_dicts(result)


def get_devices(site_id: str, days: int):
    client = get_clickhouse_client()

    query = """
        SELECT
            device_type,
            count() AS views
        FROM analytics.events
        WHERE site_id = {site_id:String}
          AND event_date >= today() - {days:Int32}
        GROUP BY device_type
        ORDER BY views DESC
    """

    result = client.query(
        query,
        parameters={
            "site_id": site_id,
            "days": days,
        },
    )

    return _rows_to_dicts(result)