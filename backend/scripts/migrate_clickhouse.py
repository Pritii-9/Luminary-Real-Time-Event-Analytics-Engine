"""ClickHouse schema migration: adds new columns if they don't exist."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.clickhouse_client import get_clickhouse_client


NEW_COLUMNS = [
    ("country", "String", "''"),
    ("city", "String", "''"),
    ("language", "String", "''"),
    ("timezone", "String", "''"),
    ("utm_source", "String", "''"),
    ("utm_medium", "String", "''"),
    ("utm_campaign", "String", "''"),
    ("utm_term", "String", "''"),
    ("utm_content", "String", "''"),
    ("browser_version", "String", "''"),
    ("os_version", "String", "''"),
    ("is_bot", "UInt8", "0"),
]


def migrate():
    client = get_clickhouse_client()

    # Get existing columns
    result = client.query("DESCRIBE TABLE analytics.events")
    existing = {row[0] for row in result.result_rows}
    print(f"Existing columns: {sorted(existing)}")

    for col_name, col_type, default in NEW_COLUMNS:
        if col_name not in existing:
            ddl = f"ALTER TABLE analytics.events ADD COLUMN IF NOT EXISTS {col_name} {col_type} DEFAULT {default}"
            print(f"  [+] Adding column: {col_name} {col_type}")
            client.command(ddl)
        else:
            print(f"  [=] Column already exists: {col_name}")

    print("\n[OK] ClickHouse migration complete!")


if __name__ == "__main__":
    migrate()
