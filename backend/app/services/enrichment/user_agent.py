"""User-Agent parsing enrichment using ua-parser library."""

from ua_parser import parse as ua_parse


def parse_user_agent(user_agent: str) -> dict:
    """Return browser, browser_version, os, os_version, device_type from UA string."""
    if not user_agent:
        return {
            "browser": "Unknown",
            "browser_version": "",
            "os": "Unknown",
            "os_version": "",
            "device_type": "unknown",
        }

    result = ua_parse(user_agent)

    # Browser
    browser = "Unknown"
    browser_version = ""
    if result.user_agent:
        browser = result.user_agent.family or "Unknown"
        parts = [
            str(v) for v in [
                result.user_agent.major,
                result.user_agent.minor,
                result.user_agent.patch,
            ]
            if v is not None
        ]
        browser_version = ".".join(parts)

    # OS
    os_name = "Unknown"
    os_version = ""
    if result.os:
        os_name = result.os.family or "Unknown"
        parts = [
            str(v) for v in [
                result.os.major,
                result.os.minor,
                result.os.patch,
            ]
            if v is not None
        ]
        os_version = ".".join(parts)

    # Device type
    device_type = "desktop"
    if result.device:
        family = (result.device.family or "").lower()
        if family in ("spider", "bot"):
            device_type = "bot"
        elif "tablet" in family or "ipad" in family:
            device_type = "tablet"
        elif "mobile" in family or "phone" in family:
            device_type = "mobile"

    # Fallback device detection from UA string
    ua_lower = user_agent.lower()
    if device_type == "desktop":
        if "mobile" in ua_lower and "tablet" not in ua_lower:
            device_type = "mobile"
        elif "tablet" in ua_lower or "ipad" in ua_lower:
            device_type = "tablet"
        elif "android" in ua_lower and "mobile" not in ua_lower:
            device_type = "tablet"

    return {
        "browser": browser,
        "browser_version": browser_version,
        "os": os_name,
        "os_version": os_version,
        "device_type": device_type,
    }
