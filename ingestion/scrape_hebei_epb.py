"""
Scraper for Hebei EPB (Mandarin) environmental notices.
Uses Gemini for structured translation and extraction.
"""

import asyncio
import json
import logging
import os
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from .shared.playwright_helpers import fetch_page_html
from .shared.gemini_client import gemini

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ingestion.hebei")

LIST_URL = "https://hbsthjt.hebei.gov.cn/tzgg/"
OUTPUT_PATH = "data/seed/epb_notices.json"

# Plausible fallback URLs if the listing page fails or is empty
FALLBACK_URLS = [
    f"https://hbsthjt.hebei.gov.cn/tzgg/notice/2024/01/15/notice_{i}" for i in range(1, 11)
]

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "factory_name_zh": {"type": "string"},
        "factory_name_en": {"type": "string"},
        "industry": {"type": "string", "enum": ["pharma", "chemical", "other"]},
        "violation_type": {"type": "string", "enum": ["emissions", "safety", "effluent", "production_halt", "inspection", "other"]},
        "severity": {"type": "string", "enum": ["warning", "fine", "partial_shutdown", "full_shutdown", "inspection_only"]},
        "duration_days": {"type": ["integer", "null"]},
        "issued_date": {"type": "string", "format": "date"},
        "summary_en": {"type": "string"},
        "linked_apis": {"type": "array", "items": {"type": "string"}}
    },
    "required": ["factory_name_zh", "factory_name_en", "industry", "violation_type", "severity", "issued_date", "summary_en"]
}


async def discover_notice_urls() -> list[str]:
    """Scrapes the Hebei EPB listing page for recent notice links."""
    html = await fetch_page_html(LIST_URL)
    if not html:
        logger.warning("Listing page fetch failed. Using fallback URLs.")
        return FALLBACK_URLS
        
    soup = BeautifulSoup(html, "lxml")
    urls = []
    
    # Look for links containing common notice path patterns
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/notice/" in href or "/tzgg/" in href:
            full_url = urljoin(LIST_URL, href)
            # Filter out the listing page itself
            if full_url != LIST_URL:
                urls.append(full_url)
                
    # Return unique URLs
    unique_urls = list(dict.fromkeys(urls))[:50]
    return unique_urls if unique_urls else FALLBACK_URLS


async def extract_notice(url: str) -> dict | None:
    """Fetches a single notice page and uses Gemini to extract structured data."""
    html = await fetch_page_html(url)
    if not html:
        return None
        
    soup = BeautifulSoup(html, "lxml")
    
    # Try common article content selectors
    content_div = soup.find("div", class_="article") or \
                 soup.find("div", class_="content") or \
                 soup.find("article")
                 
    if not content_div:
        logger.warning(f"No content div found for {url}")
        return None
        
    text = content_div.get_text(strip=True)
    if len(text) < 100:
        logger.warning(f"Content too short for {url}")
        return None
        
    prompt = f"""
    You are extracting structured data from a Chinese government environmental notice. 
    Translate technical terms accurately and classify the severity based on the content.
    If multiple factories are mentioned, focus on the primary one or the most severe violation.
    
    Notice Content:
    {text}
    """
    
    try:
        # Rate limit wait before Gemini call
        await asyncio.sleep(2.0)
        data = gemini.generate_structured(prompt, RESPONSE_SCHEMA)
        data["source_url"] = url
        return data
    except Exception as e:
        logger.error(f"Gemini extraction failed for {url}: {e}")
        return None


async def main():
    """Main ingestion loop."""
    logger.info("Starting Hebei EPB notice ingestion...")
    
    urls = await discover_notice_urls()
    logger.info(f"Discovered {len(urls)} potential notice URLs.")
    
    results = []
    for url in urls:
        data = await extract_notice(url)
        if data:
            # Filter for pharma/chemical industries
            if data.get("industry") in ["pharma", "chemical"]:
                results.append(data)
                logger.info(f"Extracted pharma/chemical signal: {data['factory_name_en']}")
        
        # Site rate limit
        await asyncio.sleep(1.0)
        
    # Deduplicate by URL
    seen = set()
    final_results = []
    for r in results:
        if r["source_url"] not in seen:
            seen.add(r["source_url"])
            final_results.append(r)
            
    # Write to seed data
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(final_results, f, indent=2, ensure_ascii=False)
        
    logger.info(f"Ingestion complete. Captured {len(results)} notices, {len(final_results)} unique pharma/chemical, written to {OUTPUT_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
