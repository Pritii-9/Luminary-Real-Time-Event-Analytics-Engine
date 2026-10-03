"""Conversion Funnel & Drop-off Analysis Service."""

from datetime import datetime, timedelta
import json
from sqlalchemy import text
from sqlmodel import Session as SQLSession, select

from app.core.database import engine, Funnel, EventRecord


def create_funnel(user_id: int, site_id: str, name: str, steps: list, session: SQLSession = None) -> Funnel:
    """Creates a new conversion funnel definition."""
    def _run(sess):
        funnel = Funnel(
            user_id=user_id,
            site_id=site_id,
            name=name,
            steps_json=json.dumps(steps),
        )
        sess.add(funnel)
        sess.commit()
        sess.refresh(funnel)
        return funnel

    if session:
        return _run(session)
    with SQLSession(engine) as sess:
        return _run(sess)


def get_funnels_for_site(site_id: str, user_id: int, session: SQLSession = None) -> list:
    """Retrieves all funnels configured for a site."""
    def _run(sess):
        funnels = sess.exec(
            select(Funnel).where(Funnel.site_id == site_id, Funnel.user_id == user_id)
        ).all()
        result = []
        for f in funnels:
            result.append({
                "id": f.id,
                "site_id": f.site_id,
                "name": f.name,
                "steps": json.loads(f.steps_json),
                "created_at": f.created_at.isoformat(),
            })
        return result

    if session:
        return _run(session)
    with SQLSession(engine) as sess:
        return _run(sess)


def delete_funnel(funnel_id: int, user_id: int, session: SQLSession = None) -> bool:
    """Deletes a funnel definition."""
    def _run(sess):
        funnel = sess.exec(
            select(Funnel).where(Funnel.id == funnel_id, Funnel.user_id == user_id)
        ).first()
        if not funnel:
            return False
        sess.delete(funnel)
        sess.commit()
        return True

    if session:
        return _run(session)
    with SQLSession(engine) as sess:
        return _run(sess)


def analyze_funnel(funnel_id: int, days: int = 30, session: SQLSession = None) -> dict:
    """Computes step-by-step visitor counts, retention %, and drop-off % for a funnel."""
    cutoff_timestamp = int((datetime.utcnow() - timedelta(days=days)).timestamp())

    def _run(sess):
        funnel = sess.exec(select(Funnel).where(Funnel.id == funnel_id)).first()
        if not funnel:
            return None

        steps = json.loads(funnel.steps_json)
        if not steps:
            return {
                "funnel_id": funnel.id,
                "name": funnel.name,
                "overall_conversion_rate": "0.0%",
                "total_entrants": 0,
                "total_conversions": 0,
                "step_analysis": [],
            }

        step_results = []
        previous_count = 0
        initial_count = 0

        # Evaluate sequential step conversion
        for idx, step in enumerate(steps):
            step_path = step.get("path", "")
            step_name = step.get("name", f"Step {idx + 1}")

            # Find distinct session_ids that reached this step within time window
            stmt = text("""
                SELECT count(distinct session_id)
                FROM event_records
                WHERE site_id = :site_id 
                  AND path = :path 
                  AND timestamp >= :cutoff
            """)
            count = sess.execute(stmt, {
                "site_id": funnel.site_id,
                "path": step_path,
                "cutoff": cutoff_timestamp,
            }).scalar() or 0

            # For sequential funnel modeling, cap step count to previous step count if idx > 0
            if idx > 0 and count > previous_count:
                count = previous_count

            if idx == 0:
                initial_count = count
                retention_pct = 100.0 if count > 0 else 0.0
                dropoff_pct = 0.0
                dropoff_count = 0
            else:
                retention_pct = (count / initial_count * 100.0) if initial_count > 0 else 0.0
                dropoff_count = previous_count - count
                dropoff_pct = (dropoff_count / previous_count * 100.0) if previous_count > 0 else 0.0

            step_results.append({
                "step_number": idx + 1,
                "name": step_name,
                "path": step_path,
                "visitors": count,
                "retention_rate": f"{round(retention_pct, 1)}%",
                "dropoff_count": dropoff_count,
                "dropoff_rate": f"{round(dropoff_pct, 1)}%",
            })

            previous_count = count

        final_conversions = step_results[-1]["visitors"] if step_results else 0
        overall_conversion_rate = (final_conversions / initial_count * 100.0) if initial_count > 0 else 0.0

        return {
            "funnel_id": funnel.id,
            "site_id": funnel.site_id,
            "name": funnel.name,
            "overall_conversion_rate": f"{round(overall_conversion_rate, 1)}%",
            "total_entrants": initial_count,
            "total_conversions": final_conversions,
            "step_analysis": step_results,
        }

    if session:
        return _run(session)
    with SQLSession(engine) as sess:
        return _run(sess)
