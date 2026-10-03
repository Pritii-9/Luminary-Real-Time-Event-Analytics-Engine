"""API Routes for AI Security Analysis, Cyber Vulnerability Scans, and LLM Reasoning."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, desc
from typing import List, Dict, Any
from pydantic import BaseModel

from app.core.database import get_session, EventRecord, BotTrafficLog
from app.services.cyber_threat_service import analyze_site_threat_logs, scan_payload_threats
from app.services.llm_security_service import generate_llm_incident_report, process_natural_language_analytics_query

router = APIRouter(prefix="/api/v1/ai-security", tags=["AI & Cyber Security"])

class LLMAnalysisRequest(BaseModel):
    event_id: str | None = None
    path: str
    threat_type: str
    severity: str
    raw_target: str

class NLQueryRequest(BaseModel):
    site_id: str
    query: str

@router.get("/threats", response_model=List[Dict[str, Any]])
def get_cyber_threats(
    site_id: str = Query(...),
    limit: int = Query(50),
    session: Session = Depends(get_session)
):
    """Scans recent telemetry records and returns ML-detected cyber attack incidents."""
    records = session.exec(
        select(EventRecord)
        .where(EventRecord.site_id == site_id)
        .order_by(desc(EventRecord.timestamp))
        .limit(limit)
    ).all()

    events_list = [
        {
            "event_id": r.event_id,
            "site_id": r.site_id,
            "timestamp": r.timestamp,
            "url": r.url,
            "path": r.path,
            "referrer": r.referrer,
            "visitor_id": r.visitor_id,
            "user_agent": r.browser
        }
        for r in records
    ]

    incidents = analyze_site_threat_logs(events_list)
    return incidents

@router.post("/llm-analyze")
def analyze_threat_with_llm(req: LLMAnalysisRequest):
    """Uses LLM Cyber Reasoning Agent to generate attack breakdown, WAF rules, and remediation code."""
    report = generate_llm_incident_report(req.model_dump())
    return report

@router.post("/nl-query")
def query_telemetry_with_nl(req: NLQueryRequest, session: Session = Depends(get_session)):
    """Translates user natural language query into telemetry insights via LLM Agent."""
    result = process_natural_language_analytics_query(req.query, req.site_id, session=session)
    return result
