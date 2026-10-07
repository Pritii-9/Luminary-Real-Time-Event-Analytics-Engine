"""Cryptographically Signed Security Webhook Dispatcher (HMAC-SHA256).
Enables automated SecOps / SIEM alerting to Slack, Discord, Datadog, or custom webhooks
whenever a CRITICAL/HIGH cyber threat or statistical anomaly is detected.
"""

import hmac
import hashlib
import json
import time
import uuid
import logging
from typing import Dict, Any, Optional

import requests

from app.core.config import settings
from app.services.metrics_service import inc_counter


def compute_hmac_signature(payload_bytes: bytes, secret: str) -> str:
    """Computes SHA256 HMAC signature for webhook payload verification."""
    return hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()


def dispatch_security_webhook(
    incident: Dict[str, Any],
    webhook_url: str,
    secret: Optional[str] = None
) -> Dict[str, Any]:
    """
    Asynchronously delivers a cryptographically signed security alert to the target webhook.
    Automatically detects Slack/Discord endpoints and formats rich embeds.
    """
    if not webhook_url:
        return {"status": "skipped", "reason": "No webhook URL provided"}

    secret_key = secret or settings.jwt_secret or "luminary-default-hmac-secret"
    delivery_id = str(uuid.uuid4())
    timestamp = int(time.time())

    # 1. Base incident payload
    base_payload = {
        "event": "security.threat_detected",
        "delivery_id": delivery_id,
        "timestamp": timestamp,
        "incident": incident,
        "platform": "Luminary Edge Threat Detection Engine v2.0"
    }

    # 2. Format specifically for Discord / Slack if detected
    is_discord = "discord.com/api/webhooks" in webhook_url
    is_slack = "hooks.slack.com" in webhook_url

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Luminary-Security-Engine/2.0",
    }

    post_data: Any = base_payload

    if is_discord:
        color = 0xFF0033 if incident.get("severity") == "CRITICAL" else 0xFF9900
        post_data = {
            "content": f"🚨 **Security Alert Triggered** on `{incident.get('site_id', 'unknown')}`",
            "embeds": [
                {
                    "title": f"OWASP Threat Detected: {incident.get('threat_type')}",
                    "color": color,
                    "fields": [
                        {"name": "Severity", "value": f"**{incident.get('severity')}**", "inline": True},
                        {"name": "Attacker IP", "value": f"`{incident.get('ip', 'Unknown')}`", "inline": True},
                        {"name": "Entropy", "value": f"`{incident.get('entropy', 0.0)}`", "inline": True},
                        {"name": "Target Path", "value": f"`{incident.get('path', '/')}`", "inline": False},
                        {"name": "Payload Snippet", "value": f"```{str(incident.get('raw_target', ''))[:200]}```", "inline": False},
                    ],
                    "footer": {"text": f"Luminary SOAR • Delivery ID {delivery_id[:8]}"},
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(timestamp))
                }
            ]
        }
    elif is_slack:
        post_data = {
            "text": f"🚨 *[Luminary Security Alert]* {incident.get('threat_type')} ({incident.get('severity')})",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*OWASP Threat Detected: {incident.get('threat_type')}*\n*Severity:* {incident.get('severity')} | *Path:* `{incident.get('path')}`\n*Payload:* `{incident.get('raw_target', '')[:120]}`"
                    }
                }
            ]
        }
    else:
        # Standard Enterprise Webhook: Attach HMAC Signature headers
        payload_bytes = json.dumps(base_payload, separators=(',', ':')).encode("utf-8")
        signature = compute_hmac_signature(payload_bytes, secret_key)
        headers["X-Luminary-Signature"] = f"sha256={signature}"
        headers["X-Luminary-Event"] = "security.threat_detected"
        headers["X-Luminary-Delivery"] = delivery_id

    # 3. Fire HTTP POST dispatch
    try:
        resp = requests.post(
            webhook_url,
            json=post_data,
            headers=headers,
            timeout=4.0
        )
        if resp.status_code in (200, 204):
            inc_counter('luminary_webhooks_dispatched_total{status="success"}')
            return {
                "status": "delivered",
                "status_code": resp.status_code,
                "delivery_id": delivery_id,
                "signature_generated": f"sha256={compute_hmac_signature(json.dumps(base_payload).encode(), secret_key)}"
            }
        else:
            inc_counter('luminary_webhooks_dispatched_total{status="failed"}')
            logging.warning(f"Webhook dispatch received HTTP {resp.status_code}: {resp.text[:100]}")
            return {
                "status": "failed",
                "status_code": resp.status_code,
                "detail": resp.text[:100]
            }
    except Exception as exc:
        inc_counter('luminary_webhooks_dispatched_total{status="failed"}')
        logging.error(f"Webhook dispatch network error: {exc}")
        return {"status": "error", "error": str(exc)}
