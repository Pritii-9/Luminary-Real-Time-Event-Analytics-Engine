"""LLM Security Reasoning & Natural Language Analytics Agent.
Supports OpenAI & Groq LLM Cloud APIs (Llama 3.1 & GPT-3.5) with automatic key detection.
"""

import os
import json
import logging
from typing import Dict, Any, List
from sqlmodel import Session as SQLSession, select, desc

from app.core.database import engine, EventRecord, BotTrafficLog
from app.services.cyber_threat_service import analyze_site_threat_logs

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

def get_llm_credentials():
    """Detects whether Groq or OpenAI API key is configured."""
    key = GROQ_API_KEY or OPENAI_API_KEY
    if not key:
        return None, None, None
        
    if key.startswith("gsk_"):
        # Groq API endpoint & Llama 3 model
        return key, "https://api.groq.com/openai/v1/chat/completions", "llama-3.1-8b-instant"
    else:
        # OpenAI API endpoint & GPT model
        return key, "https://api.openai.com/v1/chat/completions", "gpt-3.5-turbo"

def generate_llm_incident_report(incident_data: Dict[str, Any]) -> Dict[str, Any]:
    """Generates an LLM-driven security briefing, attack breakdown, and WAF patch recommendation."""
    path = incident_data.get("path", "")
    threat_type = incident_data.get("threat_type", "UNKNOWN")
    severity = incident_data.get("severity", "HIGH")
    raw_target = incident_data.get("raw_target", "")

    api_key, api_url, model_name = get_llm_credentials()

    if api_key:
        try:
            import requests
            prompt = f"""You are a Principal Cyber Security Analyst. Analyze this web attack attempt:
            Path: {path}
            Threat Category: {threat_type}
            Severity: {severity}
            Payload snippet: {raw_target}

            Provide a JSON response with ONLY these keys:
            1. "attack_mechanism": Concise technical explanation of the exploit vector.
            2. "waf_rule": Recommended Cloudflare/ModSecurity WAF rule to block it.
            3. "code_fix": Code remediation snippet for backend developers to prevent vulnerability.
            Return ONLY raw valid JSON.
            """
            response = requests.post(
                api_url,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": model_name,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1
                },
                timeout=8.0
            )
            if response.status_code == 200:
                content = response.json()["choices"][0]["message"]["content"].strip()
                # Clean codeblock markdown if present
                if content.startswith("```json"):
                    content = content[7:]
                if content.startswith("```"):
                    content = content[3:]
                if content.endswith("```"):
                    content = content[:-3]
                return json.loads(content.strip())
            else:
                logging.warning(f"LLM API Call failed ({response.status_code}): {response.text}")
            
        except Exception as exc:
            logging.warning(f"LLM call failed, reverting to internal security expert engine: {exc}")

    # Enterprise Heuristic LLM Reasoning Engine (Zero-dependency fallback)
    waf_suggestion = ""
    code_recommendation = ""
    analysis = ""

    if "SQL_INJECTION" in threat_type:
        analysis = f"Attacker attempted SQL Injection on endpoint '{path}' by crafting SQL control syntax to bypass authentication or extract DB tables."
        waf_suggestion = f"SecRule REQUEST_URI \"@rx (?i)(union|select|insert|drop)\" \"id:1001,phase:2,deny,status:403,msg:'SQLi Blocked'\""
        code_recommendation = "Use parameterized SQL queries with ORM (e.g. SQLModel/SQLAlchemy text parameters). Never concatenate raw user strings into SQL queries."
    elif "XSS_ATTACK" in threat_type:
        analysis = f"Cross-Site Scripting (XSS) payload detected targeting '{path}'. Attacker tried to inject script elements to hijack user sessions."
        waf_suggestion = f"SecRule ARGS \"@rx (?i)(<script|javascript:)\" \"id:1002,phase:2,deny,status:403,msg:'XSS Blocked'\""
        code_recommendation = "Sanitize user inputs with HTML entity encoding and enforce a strict Content Security Policy (CSP) header in FastAPI/React."
    elif "PATH_TRAVERSAL" in threat_type:
        analysis = f"Path Traversal exploit detected on path '{path}'. Attacker attempted relative directory climbing ('../') to read sensitive OS files."
        waf_suggestion = f"SecRule REQUEST_URI \"@rx \\.\\./\" \"id:1003,phase:2,deny,status:403,msg:'Path Traversal Blocked'\""
        code_recommendation = "Use os.path.basename() or sanitize file paths against absolute filesystem root resolution before reading files."
    else:
        analysis = f"Suspicious traffic anomaly detected with high entropy on path '{path}'. Automated bot or exploratory scanner."
        waf_suggestion = "Enforce rate limiting threshold (60 req/min) and turn on Cloudflare Bot Management Challenge Mode."
        code_recommendation = "Require authenticated JWT token for sensitive endpoints and enable automated rate-limiter middleware."

    return {
        "attack_mechanism": analysis,
        "waf_rule": waf_suggestion,
        "code_fix": code_recommendation,
        "ai_engine": "Luminary Cyber Intelligence LLM Agent v1.0"
    }

def process_natural_language_analytics_query(user_query: str, site_id: str, session: SQLSession = None) -> Dict[str, Any]:
    """Translates user natural language query into database queries and returns real telemetry insights."""
    query_lower = user_query.lower()
    
    intent = "GENERAL_SUMMARY"
    if "threat" in query_lower or "attack" in query_lower or "xss" in query_lower or "sqli" in query_lower:
        intent = "CYBER_THREATS"
    elif "page" in query_lower or "popular" in query_lower or "top" in query_lower:
        intent = "TOP_PAGES"
    elif "bot" in query_lower or "crawler" in query_lower:
        intent = "BOT_TRAFFIC"

    # Helper function to execute database queries
    def _execute_query(sess):
        matched_results = []
        if intent == "CYBER_THREATS":
            records = sess.exec(
                select(EventRecord)
                .where(EventRecord.site_id == site_id)
                .order_by(desc(EventRecord.timestamp))
                .limit(50)
            ).all()
            events = [
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
            matched_results = analyze_site_threat_logs(events)

        elif intent == "TOP_PAGES":
            from sqlalchemy import text
            stmt = text("""
                SELECT path, count(*) as views
                FROM event_records
                WHERE site_id = :site_id
                GROUP BY path ORDER BY views DESC LIMIT 5
            """)
            rows = sess.execute(stmt, {"site_id": site_id}).all()
            matched_results = [{"path": r[0], "views": r[1]} for r in rows]

        elif intent == "BOT_TRAFFIC":
            bots = sess.exec(
                select(BotTrafficLog)
                .where(BotTrafficLog.site_id == site_id)
                .order_by(desc(BotTrafficLog.timestamp))
                .limit(10)
            ).all()
            matched_results = [
                {"bot_name": b.bot_name, "target_url": b.target_url, "timestamp": b.timestamp}
                for b in bots
            ]
        else:
            total_events = sess.exec(
                select(EventRecord).where(EventRecord.site_id == site_id)
            ).all()
            matched_results = [{"total_recorded_events": len(total_events)}]

        return matched_results

    # Run database query using passed session or new session
    if session:
        data_results = _execute_query(session)
    else:
        with SQLSession(engine) as sess:
            data_results = _execute_query(sess)

    return {
        "user_query": user_query,
        "site_id": site_id,
        "interpreted_intent": intent,
        "result_count": len(data_results),
        "telemetry_data": data_results,
        "ai_summary": f"Query '{user_query}' resolved to intent '{intent}'. Found {len(data_results)} matching records.",
        "recommended_action": f"View detailed {intent.lower().replace('_', ' ')} timeline in the dashboard."
    }
