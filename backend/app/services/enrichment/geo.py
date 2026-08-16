"""GeoIP enrichment using MaxMind GeoLite2 database (optional)."""

import logging

from app.core.config import settings

_reader = None
_init_attempted = False


def _get_reader():
    """Lazily initialize the GeoIP reader. Returns None if unavailable."""
    global _reader, _init_attempted
    if _init_attempted:
        return _reader

    _init_attempted = True
    db_path = settings.geoip_db_path

    if not db_path:
        logging.info("GeoIP: No GEOIP_DB_PATH configured, skipping geo enrichment.")
        return None

    try:
        import maxminddb
        _reader = maxminddb.open_database(db_path)
        logging.info(f"GeoIP: Loaded database from {db_path}")
    except ImportError:
        logging.warning("GeoIP: maxminddb package not installed, skipping geo enrichment.")
    except Exception as e:
        logging.warning(f"GeoIP: Could not open database at {db_path}: {e}")

    return _reader


def enrich_geo(ip: str) -> dict:
    """Return country and city for an IP address. Gracefully returns empty if unavailable."""
    reader = _get_reader()
    if not reader or not ip or ip == "unknown":
        return {"country": "", "city": ""}

    try:
        result = reader.get(ip)
        if not result:
            return {"country": "", "city": ""}

        country = ""
        city = ""

        country_data = result.get("country") or result.get("registered_country")
        if country_data:
            names = country_data.get("names", {})
            country = names.get("en", "")

        city_data = result.get("city")
        if city_data:
            names = city_data.get("names", {})
            city = names.get("en", "")

        return {"country": country, "city": city}
    except Exception as e:
        logging.debug(f"GeoIP lookup failed for {ip}: {e}")
        return {"country": "", "city": ""}
