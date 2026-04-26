"""
Polls GDELT for disruption events and persists structured shocks.

Default mode runs forever on a 15-minute schedule.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlencode

import requests
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger("pharmashield.shock_detector")

BASE_DIR = Path(__file__).resolve().parent.parent
SHOCKS_FILE = BASE_DIR / "data" / "shocks.json"
LEGACY_SHOCKS_FILE = BASE_DIR / "data" / "seed" / "live_shocks.json"
SEED_ALERTS_FILE = BASE_DIR / "data" / "seed" / "alerts.json"

GDELT_API = "https://api.gdeltproject.org/api/v2/doc/doc"
POLL_INTERVAL_SECONDS = 15 * 60
RETENTION_HOURS = 48
MAX_STORED_SHOCKS = 200

# Required disruption signals from MVP spec.
DISRUPTION_KEYWORDS = (
    "factory shutdown",
    "export ban",
    "port closure",
    "contamination",
)

KEYWORD_ALIASES = {
    "factory shutdown": ("factory shutdown", "plant shutdown", "production halt", "manufacturing halt", "factory closure"),
    "export ban": ("export ban", "export curb", "export restriction", "export control", "export freeze"),
    "port closure": ("port closure", "port shutdown", "port disruption", "shipping terminal closure"),
    "contamination": ("contamination", "contaminated", "product recall", "quality failure"),
}

# Search space tuned to pharma APIs and rare earth supply chain signals.
GDELT_SEARCH_QUERIES = (
    "\"factory shutdown\" pharma API China",
    "\"factory shutdown\" rare earth processing China",
    "\"export ban\" rare earth China India",
    "\"export ban\" pharmaceutical API China",
    "\"port closure\" China chemical exports",
    "\"contamination\" drug manufacturing recall",
)

PROVINCES = (
    "Hebei",
    "Jiangsu",
    "Zhejiang",
    "Shandong",
    "Hubei",
    "Guangdong",
    "Sichuan",
    "Fujian",
    "Inner Mongolia",
    "Jiangxi",
    "Hunan",
    "Liaoning",
    "Anhui",
    "Henan",
)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now_utc().isoformat()


def _parse_datetime(value: Any) -> Optional[datetime]:
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        pass
    for fmt in ("%Y%m%dT%H%M%SZ", "%Y%m%d%H%M%S"):
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _normalize_text(article: dict[str, Any]) -> str:
    parts = [
        article.get("title", ""),
        article.get("seendate", ""),
        article.get("sourcecommonname", ""),
        article.get("domain", ""),
        article.get("url", ""),
    ]
    return " ".join(str(p) for p in parts if p).lower()


def _match_keyword(article: dict[str, Any]) -> str | None:
    text = _normalize_text(article)
    for canonical, aliases in KEYWORD_ALIASES.items():
        if any(alias in text for alias in aliases):
            return canonical
    return None


def _infer_sector(text: str) -> str:
    lowered = text.lower()
    rare_earth_tokens = (
        "rare earth",
        "neodymium",
        "dysprosium",
        "terbium",
        "yttrium",
        "lanthanum",
        "cerium",
        "praseodymium",
    )
    return "rare_earth" if any(token in lowered for token in rare_earth_tokens) else "pharma"


def _infer_province(text: str) -> Optional[str]:
    lowered = text.lower()
    for province in PROVINCES:
        if province.lower() in lowered:
            return province
    return None


def _infer_severity(keyword: str) -> str:
    if keyword in ("export ban", "factory shutdown"):
        return "CRITICAL"
    if keyword == "port closure":
        return "HIGH"
    if keyword == "contamination":
        return "MEDIUM"
    return "LOW"


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=8))
def _fetch_gdelt_articles(query: str, max_records: int = 50) -> list[dict[str, Any]]:
    params = {
        "query": query,
        "mode": "artlist",
        "format": "json",
        "maxrecords": max_records,
        "timespan": "240",
        "sort": "DateDesc",
    }
    url = f"{GDELT_API}?{urlencode(params)}"
    response = requests.get(url, timeout=12)
    response.raise_for_status()
    payload = response.json()
    return payload.get("articles", [])


def _build_shock(article: dict[str, Any], keyword: str) -> dict[str, Any]:
    title = str(article.get("title", "")).strip()
    url = str(article.get("url", "")).strip()
    source = str(article.get("sourcecommonname", "GDELT")).strip() or "GDELT"
    published = article.get("seendate") or _now_iso()
    text_blob = f"{title} {source} {article.get('query', '')} {url}"

    stable_key = f"{title}|{url}|{published}"
    shock_id = "shock_" + hashlib.sha1(stable_key.encode("utf-8")).hexdigest()[:16]

    return {
        "id": shock_id,
        "sector": _infer_sector(text_blob),
        "title": title or "Untitled disruption event",
        "summary": title or "Supply-chain disruption signal detected from GDELT",
        "province": _infer_province(text_blob),
        "keyword_trigger": keyword,
        "event_type": keyword.replace(" ", "_"),
        "severity": _infer_severity(keyword),
        "source": source,
        "source_url": url,
        "published_at": published,
        "detected_at": _now_iso(),
        "gdelt_query": article.get("query", ""),
        "gdelt_sources": 1,
    }


def detect_shocks() -> list[dict[str, Any]]:
    collected: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for query in GDELT_SEARCH_QUERIES:
        try:
            articles = _fetch_gdelt_articles(query=query, max_records=50)
        except Exception as exc:
            logger.warning("GDELT fetch failed for query '%s': %s", query, exc)
            continue

        for article in articles:
            keyword = _match_keyword(article)
            if not keyword:
                continue

            article = dict(article)
            article["query"] = query
            shock = _build_shock(article, keyword)

            if shock["id"] in seen_ids:
                continue
            seen_ids.add(shock["id"])
            collected.append(shock)

    collected.sort(key=lambda item: item.get("detected_at", ""), reverse=True)
    return collected


def _read_existing(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    try:
        with open(path, "r", encoding="utf-8") as file:
            data = json.load(file)
            if isinstance(data, list):
                return data
    except Exception:
        pass
    return []


def _retain_recent(shocks: list[dict[str, Any]], hours: int = RETENTION_HOURS) -> list[dict[str, Any]]:
    cutoff = _now_utc() - timedelta(hours=hours)
    kept: list[dict[str, Any]] = []
    for shock in shocks:
        dt = _parse_datetime(shock.get("detected_at")) or _parse_datetime(shock.get("published_at"))
        if dt and dt >= cutoff:
            kept.append(shock)
    return kept


def _merge_shocks(new_shocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    existing = _read_existing(SHOCKS_FILE)
    recent_existing = _retain_recent(existing)

    by_id: dict[str, dict[str, Any]] = {}
    for shock in recent_existing:
        sid = shock.get("id")
        if sid:
            by_id[sid] = shock

    for shock in new_shocks:
        sid = shock.get("id")
        if sid:
            by_id[sid] = shock

    merged = list(by_id.values())
    merged.sort(
        key=lambda item: _parse_datetime(item.get("detected_at")) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return merged[:MAX_STORED_SHOCKS]


def _fallback_from_seed_alerts(limit: int = 20) -> list[dict[str, Any]]:
    alerts = _read_existing(SEED_ALERTS_FILE)
    if not alerts:
        return []

    shocks: list[dict[str, Any]] = []
    for alert in alerts[:limit]:
        created_at = alert.get("created_at") or _now_iso()
        summary = str(alert.get("summary", "Seed disruption event")).strip()
        affected = alert.get("affected_drugs") or []
        sector = "rare_earth" if any("rare" in str(item).lower() for item in affected) else "pharma"
        shock_id = f"seed_{alert.get('id', hashlib.sha1(summary.encode('utf-8')).hexdigest()[:10])}"

        text_blob = f"{summary} {alert.get('gemini_explainer', '')}"
        shock = {
            "id": shock_id,
            "sector": sector,
            "title": summary,
            "summary": summary,
            "province": _infer_province(text_blob),
            "keyword_trigger": "seed_fallback",
            "event_type": "seed_fallback",
            "severity": alert.get("severity", "MEDIUM"),
            "source": alert.get("source", "SeedFallback"),
            "source_url": alert.get("source_url"),
            "published_at": created_at,
            "detected_at": created_at,
            "gdelt_query": "seed_fallback_alerts",
            "gdelt_sources": 1,
            "extraction_method": "seed_fallback",
        }
        shocks.append(shock)

    shocks.sort(
        key=lambda item: _parse_datetime(item.get("detected_at")) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return shocks


def _write_json(path: Path, payload: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2, ensure_ascii=False)


def run_once() -> list[dict[str, Any]]:
    new_shocks = detect_shocks()
    merged = _merge_shocks(new_shocks)
    if not merged:
        merged = _fallback_from_seed_alerts()
    _write_json(SHOCKS_FILE, merged)
    _write_json(LEGACY_SHOCKS_FILE, merged)
    logger.info(
        "Persisted %d shocks (%d new) to %s",
        len(merged),
        len(new_shocks),
        SHOCKS_FILE,
    )
    return merged


def run_scheduler(interval_seconds: int = POLL_INTERVAL_SECONDS) -> None:
    logger.info("Starting shock detector scheduler (interval=%ss)", interval_seconds)
    while True:
        try:
            run_once()
        except Exception as exc:
            logger.exception("Shock detector cycle failed: %s", exc)
        time.sleep(interval_seconds)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    parser = argparse.ArgumentParser(description="Run the PharmaShield shock detector.")
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run one fetch cycle and exit.",
    )
    args = parser.parse_args()

    if args.once:
        run_once()
    else:
        run_scheduler()
