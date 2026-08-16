"""Bot detection enrichment."""

import re

# Common bot patterns in user-agent strings
BOT_PATTERNS = re.compile(
    r"bot|crawler|spider|scraper|headless|phantom|selenium|puppeteer"
    r"|slurp|bingpreview|facebookexternalhit|twitterbot|linkedinbot"
    r"|googlebot|yandexbot|baiduspider|duckduckbot|rogerbot|ia_archiver"
    r"|applebot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot",
    re.IGNORECASE,
)


def is_bot(user_agent: str, webdriver: bool = False) -> bool:
    """Detect if the request is from a bot.

    Args:
        user_agent: Raw user-agent string.
        webdriver: Whether navigator.webdriver was true on the client (sent by SDK).
    """
    if webdriver:
        return True
    if not user_agent:
        return True
    return bool(BOT_PATTERNS.search(user_agent))
