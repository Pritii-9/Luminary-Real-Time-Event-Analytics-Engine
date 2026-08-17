"""Stats query service with Redis caching, ClickHouse aggregation, and SQLite standalone fallback."""

from datetime import datetime, timedelta
from sqlalchemy import text
from sqlmodel import Session as SQLSession, select, func

from app.services.clickhouse_client import get_clickhouse_client
from app.services.cache_service import get_cached, set_cached
from app.core.database import engine, EventRecord


def _rows_to_dicts(result):
    columns = result.column_names
    return [dict(zip(columns, row)) for row in result.result_rows]


import time

_clickhouse_disabled_until = 0

def _query(query: str, params: dict):
    global _clickhouse_disabled_until
    if time.time() < _clickhouse_disabled_until:
        class DummyResult:
            column_names = []
            result_rows = []
        return DummyResult()

    try:
        client = get_clickhouse_client()
        return client.query(query, parameters=params)
    except Exception:
        _clickhouse_disabled_until = time.time() + 60
        class DummyResult:
            column_names = []
            result_rows = []
        return DummyResult()





def _sqlite_cutoff(days: int) -> int:
    return int((datetime.utcnow() - timedelta(days=days)).timestamp())


def _with_session(fn, session=None):
    if session is not None:
        return fn(session)
    with SQLSession(engine) as s:
        return fn(s)


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

def get_summary(site_id: str, days: int, session: SQLSession = None):
    cached = get_cached(site_id, "summary", days)
    if cached is not None:
        return cached

    data = None
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
        if rows and rows[0].get("pageviews"):
            data = rows[0]
    except Exception:
        pass

    if not data or not data.get("pageviews"):
        try:
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
            if rows and rows[0].get("pageviews"):
                data = rows[0]
        except Exception:
            pass

    # Database fallback
    if not data or not data.get("pageviews"):
        cutoff = _sqlite_cutoff(days)
        def _run(sess):
            pv = sess.exec(select(func.count(EventRecord.id)).where(EventRecord.site_id == site_id, EventRecord.timestamp >= cutoff)).first() or 0
            v = sess.exec(select(func.count(func.distinct(EventRecord.visitor_id))).where(EventRecord.site_id == site_id, EventRecord.timestamp >= cutoff)).first() or 0
            s = sess.exec(select(func.count(func.distinct(EventRecord.session_id))).where(EventRecord.site_id == site_id, EventRecord.timestamp >= cutoff)).first() or 0
            return {"pageviews": pv, "visitors": v, "sessions": s}
        data = _with_session(_run, session)

    set_cached(site_id, "summary", days, data)
    return data


# ---------------------------------------------------------------------------
# Timeseries
# ---------------------------------------------------------------------------

def get_timeseries(site_id: str, days: int, session: SQLSession = None):

    cached = get_cached(site_id, "timeseries", days)
    if cached is not None:
        return cached

    data = None
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
        rows = _rows_to_dicts(result)
        if rows:
            data = rows
    except Exception:
        pass

    if not data:
        try:
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
            rows = _rows_to_dicts(result)
            if rows:
                data = rows
        except Exception:
            pass

    # Database fallback
    if not data:
        cutoff = _sqlite_cutoff(days)
        def _run(sess):
            if engine.dialect.name == "postgresql":
                date_expr = "to_char(to_timestamp(timestamp), 'YYYY-MM-DD')"
            else:
                date_expr = "date(timestamp, 'unixepoch')"

            stmt = text(f"""
                SELECT 
                    {date_expr} as event_date,
                    count(*) as pageviews,
                    count(distinct visitor_id) as visitors
                FROM event_records
                WHERE site_id = :site_id AND timestamp >= :cutoff
                GROUP BY event_date
                ORDER BY event_date ASC
            """)
            result = sess.execute(stmt, {"site_id": site_id, "cutoff": cutoff}).all()
            return [{"event_date": str(r[0]), "pageviews": r[1], "visitors": r[2]} for r in result]
        data = _with_session(_run, session)

    set_cached(site_id, "timeseries", days, data)
    return data


# ---------------------------------------------------------------------------
# Top Pages
# ---------------------------------------------------------------------------

def get_top_pages(site_id: str, days: int, session: SQLSession = None):
    cached = get_cached(site_id, "pages", days)
    if cached is not None:
        return cached

    data = None
    try:
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
        rows = _rows_to_dicts(result)
        if rows:
            data = rows
    except Exception:
        pass

    if not data:
        cutoff = _sqlite_cutoff(days)
        def _run(sess):
            stmt = text("""
                SELECT path, count(*) as views
                FROM event_records
                WHERE site_id = :site_id AND timestamp >= :cutoff
                GROUP BY path
                ORDER BY views DESC
                LIMIT 10
            """)
            result = sess.execute(stmt, {"site_id": site_id, "cutoff": cutoff}).all()
            return [{"path": r[0], "views": r[1]} for r in result]
        data = _with_session(_run, session)

    set_cached(site_id, "pages", days, data)
    return data


# ---------------------------------------------------------------------------
# Top Referrers
# ---------------------------------------------------------------------------

def get_top_referrers(site_id: str, days: int, session: SQLSession = None):
    cached = get_cached(site_id, "referrers", days)
    if cached is not None:
        return cached

    data = None
    try:
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
        rows = _rows_to_dicts(result)
        if rows:
            data = rows
    except Exception:
        pass

    if not data:
        cutoff = _sqlite_cutoff(days)
        def _run(sess):
            stmt = text("""
                SELECT referrer, count(*) as views
                FROM event_records
                WHERE site_id = :site_id AND timestamp >= :cutoff AND referrer != ''
                GROUP BY referrer
                ORDER BY views DESC
                LIMIT 10
            """)
            result = sess.execute(stmt, {"site_id": site_id, "cutoff": cutoff}).all()
            return [{"referrer": r[0], "views": r[1]} for r in result]
        data = _with_session(_run, session)

    set_cached(site_id, "referrers", days, data)
    return data


# ---------------------------------------------------------------------------
# Devices
# ---------------------------------------------------------------------------

def get_devices(site_id: str, days: int, session: SQLSession = None):
    cached = get_cached(site_id, "devices", days)
    if cached is not None:
        return cached

    data = None
    try:
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
        rows = _rows_to_dicts(result)
        if rows:
            data = rows
    except Exception:
        pass

    if not data:
        cutoff = _sqlite_cutoff(days)
        def _run(sess):
            stmt = text("""
                SELECT device_type, count(*) as views
                FROM event_records
                WHERE site_id = :site_id AND timestamp >= :cutoff
                GROUP BY device_type
                ORDER BY views DESC
            """)
            result = sess.execute(stmt, {"site_id": site_id, "cutoff": cutoff}).all()
            return [{"device_type": r[0], "views": r[1]} for r in result]
        data = _with_session(_run, session)

    set_cached(site_id, "devices", days, data)
    return data


# ---------------------------------------------------------------------------
# Browsers
# ---------------------------------------------------------------------------

def get_browsers(site_id: str, days: int, session: SQLSession = None):
    cached = get_cached(site_id, "browsers", days)
    if cached is not None:
        return cached

    data = None
    try:
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
        rows = _rows_to_dicts(result)
        if rows:
            data = rows
    except Exception:
        pass

    if not data:
        cutoff = _sqlite_cutoff(days)
        def _run(sess):
            stmt = text("""
                SELECT browser, count(*) as views
                FROM event_records
                WHERE site_id = :site_id AND timestamp >= :cutoff
                GROUP BY browser
                ORDER BY views DESC
                LIMIT 10
            """)
            result = sess.execute(stmt, {"site_id": site_id, "cutoff": cutoff}).all()
            return [{"browser": r[0], "views": r[1]} for r in result]
        data = _with_session(_run, session)

    set_cached(site_id, "browsers", days, data)
    return data


# ---------------------------------------------------------------------------
# Countries
# ---------------------------------------------------------------------------

def get_countries(site_id: str, days: int, session: SQLSession = None):
    cached = get_cached(site_id, "countries", days)
    if cached is not None:
        return cached

    data = None
    try:
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
        rows = _rows_to_dicts(result)
        if rows:
            data = rows
    except Exception:
        pass

    if not data:
        cutoff = _sqlite_cutoff(days)
        def _run(sess):
            stmt = text("""
                SELECT country, count(*) as views
                FROM event_records
                WHERE site_id = :site_id AND timestamp >= :cutoff AND country != ''
                GROUP BY country
                ORDER BY views DESC
                LIMIT 10
            """)
            result = sess.execute(stmt, {"site_id": site_id, "cutoff": cutoff}).all()
            return [{"country": r[0], "views": r[1]} for r in result]
        data = _with_session(_run, session)

    set_cached(site_id, "countries", days, data)
    return data


# ---------------------------------------------------------------------------
# Custom Events
# ---------------------------------------------------------------------------

def get_custom_events(site_id: str, days: int, session: SQLSession = None):
    cached = get_cached(site_id, "custom_events", days)
    if cached is not None:
        return cached

    data = None
    try:
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
        rows = _rows_to_dicts(result)
        if rows:
            data = rows
    except Exception:
        pass

    if not data:
        cutoff = _sqlite_cutoff(days)
        def _run(sess):
            stmt = text("""
                SELECT path as event_name, count(*) as count, count(distinct visitor_id) as unique_visitors
                FROM event_records
                WHERE site_id = :site_id AND event_type = 'custom' AND timestamp >= :cutoff
                GROUP BY event_name
                ORDER BY count DESC
                LIMIT 50
            """)
            result = sess.execute(stmt, {"site_id": site_id, "cutoff": cutoff}).all()
            return [{"event_name": r[0], "count": r[1], "unique_visitors": r[2]} for r in result]
        data = _with_session(_run, session)

    set_cached(site_id, "custom_events", days, data)
    return data