"""Setup ClickHouse aggregate tables and materialized views for query optimization."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.clickhouse_client import get_clickhouse_client


def setup():
    client = get_clickhouse_client()

    print("[+] Creating daily_stats AggregatingMergeTree table...")
    # Using SimpleAggregateFunction for count/sum, and AggregateFunction for uniqState
    create_table_ddl = """
    CREATE TABLE IF NOT EXISTS analytics.daily_stats (
        site_id String,
        event_date Date,
        pageviews SimpleAggregateFunction(sum, UInt64),
        visitors AggregateFunction(uniq, String),
        sessions AggregateFunction(uniq, String)
    ) ENGINE = AggregatingMergeTree()
    ORDER BY (site_id, event_date);
    """
    client.command(create_table_ddl)

    print("[+] Creating daily_stats_mv materialized view...")
    create_mv_ddl = """
    CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.daily_stats_mv
    TO analytics.daily_stats
    AS SELECT
        site_id,
        event_date,
        count() AS pageviews,
        uniqState(visitor_id) AS visitors,
        uniqState(session_id) AS sessions
    FROM analytics.events
    GROUP BY site_id, event_date;
    """
    client.command(create_mv_ddl)

    print("[OK] ClickHouse aggregates and materialized views setup successfully!")


if __name__ == "__main__":
    setup()
