"""ML & Pattern-based Cyber Threat Detection Engine.
Inspects incoming web telemetry payloads for OWASP Top 10 vulnerabilities (SQLi, XSS, Path Traversal, Command Injection)
and calculates an ML anomaly threat score.
"""

import re
import math
from typing import Dict, Any, List

# Security Attack Vectors Patterns
THREAT_PATTERNS = {
    "SQL_INJECTION": [
        r"(?i)(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|UNION|TRUNCATE|EXEC)\b)",
        r"(?i)(\bOR\b\s+\d+=\d+)",
        r"(?i)('--|#|/\*)",
        r"(?i)(\bCONCAT\b|\bCHAR\b|\bSLEEP\b\s*\()"
    ],
    "XSS_ATTACK": [
        r"(?i)(<script[^>]*>)",
        r"(?i)(javascript\s*:)",
        r"(?i)(onerror\s*=|onload\s*=|onclick\s*=)",
        r"(?i)(<iframe|<img|<svg[^>]*src=)"
    ],
    "PATH_TRAVERSAL": [
        r"(\.\./|\.\.\\)",
        r"(?i)(/etc/passwd|/etc/shadow|c:\\windows\\system32)"
    ],
    "COMMAND_INJECTION": [
        r"(;\s*(cat|ls|pwd|whoami|curl|wget|nc|bash|sh|cmd|powershell))",
        r"(\|\s*(cat|ls|whoami|bash))",
        r"(`.*`)"
    ]
}

def calculate_shannon_entropy(text: str) -> float:
    """Calculates Shannon entropy of string to detect obfuscated payloads / encoded exploits."""
    if not text:
        return 0.0
    prob = [float(text.count(c)) / len(text) for c in set(text)]
    return round(-sum([p * math.log2(p) for p in prob]), 3)

def scan_payload_threats(url: str, path: str, referrer: str, user_agent: str) -> Dict[str, Any]:
    """Scans telemetry attributes using ML features + regex heuristics to output a Threat Risk Score."""
    combined_target = f"{url} {path} {referrer}".strip()
    detected_categories = []
    
    # 1. Regex Vulnerability Scan
    for category, patterns in THREAT_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, combined_target):
                if category not in detected_categories:
                    detected_categories.append(category)
                break

    # 2. Scanner & Exploit Bot Detection
    known_scanners = ["nikto", "sqlmap", "acunetix", "nmap", "dirbuster", "masscan", "zgrab"]
    for scanner in known_scanners:
        if scanner in user_agent.lower() or scanner in combined_target.lower():
            detected_categories.append("AUTOMATED_SECURITY_SCANNER")
            break

    # 3. Machine Learning Feature Scoring (Entropy + Length Anomaly)
    entropy = calculate_shannon_entropy(combined_target)
    length = len(combined_target)
    
    # High entropy (> 4.5) in URL/Path typically indicates base64/hex obfuscated payload
    entropy_risk = 0.3 if entropy > 4.5 else 0.0
    length_risk = 0.2 if length > 300 else 0.0
    pattern_risk = len(detected_categories) * 0.35

    total_threat_score = min(1.0, round(entropy_risk + length_risk + pattern_risk, 2))

    # Severity Level Mapping
    if total_threat_score >= 0.7 or "SQL_INJECTION" in detected_categories or "COMMAND_INJECTION" in detected_categories:
        severity = "CRITICAL"
    elif total_threat_score >= 0.4:
        severity = "HIGH"
    elif total_threat_score >= 0.2:
        severity = "MEDIUM"
    else:
        severity = "LOW"

    return {
        "threat_detected": total_threat_score > 0.25,
        "threat_score": total_threat_score,  # Scale 0.00 to 1.00
        "severity": severity,
        "categories": detected_categories,
        "payload_entropy": entropy,
        "analyzed_target": combined_target[:150]
    }

def analyze_site_threat_logs(events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Analyzes recent site event records and returns detected cyber attack incidents."""
    incidents = []
    for ev in events:
        res = scan_payload_threats(
            url=ev.get("url", ""),
            path=ev.get("path", ""),
            referrer=ev.get("referrer", ""),
            user_agent=ev.get("user_agent", "")
        )
        if res["threat_detected"]:
            incidents.append({
                "event_id": ev.get("event_id"),
                "timestamp": ev.get("timestamp"),
                "site_id": ev.get("site_id"),
                "ip": ev.get("visitor_id", "Unknown"),
                "path": ev.get("path"),
                "threat_type": ", ".join(res["categories"]) if res["categories"] else "ANOMALOUS_PAYLOAD",
                "severity": res["severity"],
                "threat_score": res["threat_score"],
                "entropy": res["payload_entropy"],
                "raw_target": res["analyzed_target"]
            })
    return incidents
