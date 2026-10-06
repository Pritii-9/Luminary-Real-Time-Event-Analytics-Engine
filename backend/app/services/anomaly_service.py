"""AI & Statistical Anomaly Detection Service using NumPy and Pandas."""

from datetime import datetime, timedelta, timezone
import numpy as np
import pandas as pd
from sqlalchemy import text
from sqlmodel import Session as SQLSession

from app.core.database import engine


def detect_traffic_anomalies(site_id: str, days: int = 7, session: SQLSession = None) -> dict:
    """Calculates rolling Z-scores and moving averages to detect traffic spikes or drop-offs."""
    cutoff_timestamp = int((datetime.now(timezone.utc) - timedelta(days=days)).timestamp())

    def _query_hourly_counts(sess):
        dialect_name = sess.get_bind().dialect.name if hasattr(sess, "get_bind") and sess.get_bind() else engine.dialect.name
        if dialect_name == "postgresql":
            hour_expr = "to_char(to_timestamp(timestamp), 'YYYY-MM-DD HH24:00:00')"
        else:
            hour_expr = "strftime('%Y-%m-%d %H:00:00', datetime(timestamp, 'unixepoch'))"

        stmt = text(f"""
            SELECT 
                {hour_expr} AS hour_bucket,
                count(*) AS count
            FROM event_records
            WHERE site_id = :site_id AND timestamp >= :cutoff
            GROUP BY hour_bucket
            ORDER BY hour_bucket ASC
        """)
        results = sess.execute(stmt, {"site_id": site_id, "cutoff": cutoff_timestamp}).all()
        return [{"hour": r[0], "count": int(r[1])} for r in results]

    if session:
        data = _query_hourly_counts(session)
    else:
        with SQLSession(engine) as sess:
            data = _query_hourly_counts(sess)

    if not data or len(data) < 3:
        return {
            "status": "NORMAL",
            "z_score": 0.0,
            "current_hourly_traffic": data[-1]["count"] if data else 0,
            "mean_hourly_traffic": 0.0,
            "std_dev": 0.0,
            "pct_deviation": "0.0%",
            "analysis_window_days": days,
            "recommendation": "Insufficient traffic data points to establish statistical baseline.",
            "hourly_trend": data,
        }

    df = pd.DataFrame(data)
    counts = df["count"].to_numpy(dtype=float)

    mean_val = float(np.mean(counts[:-1])) if len(counts) > 1 else float(np.mean(counts))
    std_val = float(np.std(counts[:-1])) if len(counts) > 1 else float(np.std(counts))
    latest_val = float(counts[-1])

    # Avoid division by zero
    epsilon = 1e-5
    z_score = float((latest_val - mean_val) / (std_val + epsilon))

    pct_deviation = float(((latest_val - mean_val) / (mean_val + epsilon)) * 100)

    # Classify anomaly level
    if z_score > 3.0:
        status = "SPIKE_CRITICAL"
        recommendation = "Critical traffic spike detected! Potential viral surge or bot traffic anomaly."
    elif z_score > 2.0:
        status = "SPIKE_WARNING"
        recommendation = "Unusual traffic surge detected above standard 2-sigma moving average baseline."
    elif z_score < -2.0:
        status = "DROP_OFF_WARNING"
        recommendation = "Unusual traffic drop-off detected! Verify site tracking snippet or server status."
    else:
        status = "NORMAL"
        recommendation = "Traffic baseline is stable and operating within expected statistical limits."

    return {
        "status": status,
        "z_score": round(z_score, 2),
        "current_hourly_traffic": int(latest_val),
        "mean_hourly_traffic": round(mean_val, 1),
        "std_dev": round(std_val, 1),
        "pct_deviation": f"{'+' if pct_deviation >= 0 else ''}{round(pct_deviation, 1)}%",
        "analysis_window_days": days,
        "recommendation": recommendation,
        "hourly_trend": df.to_dict(orient="records"),
    }
