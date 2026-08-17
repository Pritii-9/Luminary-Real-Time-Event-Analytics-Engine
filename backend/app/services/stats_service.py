"""Stats query service with Redis caching and ClickHouse aggregation fallback."""

from app.services.clickhouse_client import get_clickhouse_client
from app.services.cache_service import get_cached, set_cached


def _rows_to_dicts(result):
    columns = result.column_names
    return [dict(zip(columns, row)) for row in result.result_rows]


def _query(query: str, params: dict):
    client = get_clickhouse_client()
    return client.query(query, parameters=params)


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

def get_summary(site_id: str, days: int):
    cached = get_cached(site_id, "summary", days)
    if cached is not None:
        return cached

    # Try querying daily_stats aggregate table first
    try:
        query = """
            SELECT
                sum(pageviews) AS pageviews,
                uniqMerge(visitors) AS visitors,
                uniqMerge(sessions) AS sessions
            FROM analytics.daily_stats
            WHERE site_id = {site_id:String}
              AND event_date >= today() - {days:Int32}
        """
        result = _query(query, {"site_id": site_id, "days": days})
        rows = _rows_to_dicts(result)
        data = rows[0] if rows else {}
        # If no pageviews recorded in aggregates yet, use fallback
        if not data or not data.get("pageviews"):
            raise ValueError("No daily_stats data")
    except Exception:
        # Fallback to raw events table
        query = """
            SELECT
                count() AS pageviews,
                uniq(visitor_id) AS visitors,
                uniq(session_id) AS sessions
            FROM analytics.events
            WHERE site_id = {site_id:String}
              AND event_date >= today() - {days:Int32}
        """
        result = _query(query, {"site_id": site_id, "days": days})
        rows = _rows_to_dicts(result)
        data = rows[0] if rows else {}

    set_cached(site_id, "summary", days, data)
    return data


# ---------------------------------------------------------------------------
# Timeseries
# ---------------------------------------------------------------------------

def get_timeseries(site_id: str, days: int):
    cached = get_cached(site_id, "timeseries", days)
    if cached is not None:
        return cached

    # Try querying daily_stats aggregate table first
    try:
        query = """
            SELECT
                event_date,
                sum(pageviews) AS pageviews,
                uniqMerge(visitors) AS visitors
            FROM analytics.daily_stats
            WHERE site_id = {site_id:String}
              AND event_date >= today() - {days:Int32}
            GROUP BY event_date
            ORDER BY event_date
        """
        result = _query(query, {"site_id": site_id, "days": days})
        data = _rows_to_dicts(result)
        if not data:
            raise ValueError("No daily_stats timeseries")
    except Exception:
        # Fallback to raw events table
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
        result = _query(query, {"site_id": site_id, "days": days})
        data = _rows_to_dicts(result)

    set_cached(site_id, "timeseries", days, data)
    return data


# ---------------------------------------------------------------------------
# Top Pages
# ---------------------------------------------------------------------------

def get_top_pages(site_id: str, days: int):
    cached = get_cached(site_id, "pages", days)
    if cached is not None:
        return cached

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
    result = _query(query, {"site_id": site_id, "days": days})
    data = _rows_to_dicts(result)
    set_cached(site_id, "pages", days, data)
    return data


# ---------------------------------------------------------------------------
# Top Referrers
# ---------------------------------------------------------------------------

def get_top_referrers(site_id: str, days: int):
    cached = get_cached(site_id, "referrers", days)
    if cached is not None:
        return cached

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
    result = _query(query, {"site_id": site_id, "days": days})
    data = _rows_to_dicts(result)
    set_cached(site_id, "referrers", days, data)
    return data


# ---------------------------------------------------------------------------
# Devices
# ---------------------------------------------------------------------------

def get_devices(site_id: str, days: int):
    cached = get_cached(site_id, "devices", days)
    if cached is not None:
        return cached

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
    result = _query(query, {"site_id": site_id, "days": days})
    data = _rows_to_dicts(result)
    set_cached(site_id, "devices", days, data)
    return data


# ---------------------------------------------------------------------------
# Browsers
# ---------------------------------------------------------------------------

def get_browsers(site_id: str, days: int):
    cached = get_cached(site_id, "browsers", days)
    if cached is not None:
        return cached

    query = """
        SELECT
            browser,
            count() AS views
        FROM analytics.events
        WHERE site_id = {site_id:String}
          AND event_date >= today() - {days:Int32}
        GROUP BY browser
        ORDER BY views DESC
        LIMIT 10
    """
    result = _query(query, {"site_id": site_id, "days": days})
    data = _rows_to_dicts(result)
    set_cached(site_id, "browsers", days, data)
    return data


# ---------------------------------------------------------------------------
# Countries
# ---------------------------------------------------------------------------

def get_countries(site_id: str, days: int):
    cached = get_cached(site_id, "countries", days)
    if cached is not None:
        return cached

    query = """
        SELECT
            country,
            count() AS views
        FROM analytics.events
        WHERE site_id = {site_id:String}
          AND event_date >= today() - {days:Int32}
          AND country != ''
        GROUP BY country
        ORDER BY views DESC
        LIMIT 10
    """
    result = _query(query, {"site_id": site_id, "days": days})
    data = _rows_to_dicts(result)
    set_cached(site_id, "countries", days, data)
    return data


# ---------------------------------------------------------------------------
# Custom Events
# ---------------------------------------------------------------------------

def get_custom_events(site_id: str, days: int):
    cached = get_cached(site_id, "custom_events", days)
    if cached is not None:
        return cached

    query = """
        SELECT
            path AS event_name,
            count() AS count,
            uniq(visitor_id) AS unique_visitors
        FROM analytics.events
        WHERE site_id = {site_id:String}
          AND event_type = 'custom'
          AND event_date >= today() - {days:Int32}
        GROUP BY event_name
        ORDER BY count DESC
        LIMIT 50
    """
    result = _query(query, {"site_id": site_id, "days": days})
    data = _rows_to_dicts(result)
    set_cached(site_id, "custom_events", days, data)
    return data