"""
Scraper for FDA Import Alerts focusing on Chinese pharmaceutical facilities.
"""

import os
import json
import logging
import time
import httpx
from bs4 import BeautifulSoup
from typing import List, Dict, Optional

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ingestion.fda")

BASE_URL = "https://www.accessdata.fda.gov/cms_ia/"
LIST_URL = f"{BASE_URL}importalert_browse.html"
OUTPUT_PATH = "data/seed/fda_alerts.json"
CACHE_DIR = "/tmp/fda_cache/"

USER_AGENT = "PharmaShield Research Bot - Solution Challenge 2026"

# Hardcoded mapping of common product/API substrings to API IDs in apis.json
PRODUCT_MAPPING = {
    "Paracetamol": "para_aminophenol",
    "Amoxicillin": "6_apa",
    "Azithromycin": "azithromycin_dihydrate",
    "Metformin": "metformin_hcl",
    "Atorvastatin": "atorvastatin_calcium",
    "Insulin": "insulin_precursor",
    "Heparin": "heparin_sodium",
    "Ceftriaxone": "7_aca",
    "Penicillin": "penicillin_g_potassium"
}


def get_cached_html(url: str) -> Optional[str]:
    """Helper to fetch HTML with a local file cache."""
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)
        
    cache_key = url.replace("https://", "").replace("/", "_").replace(".", "_")
    cache_path = os.path.join(CACHE_DIR, cache_key + ".html")
    
    if os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            return f.read()
            
    try:
        logger.info(f"Fetching {url}...")
        response = httpx.get(url, headers={"User-Agent": USER_AGENT}, timeout=30.0)
        if response.status_code == 404:
            logger.warning(f"404 Not Found: {url}")
            return None
        response.raise_for_status()
        
        html = response.text
        with open(cache_path, "w", encoding="utf-8") as f:
            f.write(html)
            
        time.sleep(1.0)  # Politeness
        return html
    except Exception as e:
        logger.error(f"Error fetching {url}: {e}")
        return None


def extract_linked_apis(products: List[str]) -> List[str]:
    """Infers API IDs from product names using a hardcoded mapping."""
    apis = set()
    for product in products:
        for keyword, api_id in PRODUCT_MAPPING.items():
            if keyword.lower() in product.lower():
                apis.add(api_id)
    return list(apis)


def main():
    """Main ingestion loop for FDA alerts."""
    logger.info("Starting FDA Import Alert ingestion...")
    
    html = get_cached_html(LIST_URL)
    if not html:
        logger.error("Failed to fetch FDA listing page. Exiting.")
        exit(1)
        
    soup = BeautifulSoup(html, "lxml")
    alerts = []
    
    # FDA Import Alert table parsing
    # The structure typically has rows in a table with specific IDs or classes
    table = soup.find("table")
    if not table:
        logger.error("Could not find alerts table in HTML.")
        exit(1)
        
    rows = table.find_all("tr")[1:]  # Skip header
    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 5:
            continue
            
        alert_number = cols[0].get_text(strip=True)
        alert_name = cols[1].get_text(strip=True)
        country = cols[2].get_text(strip=True).upper()
        industry_code = cols[3].get_text(strip=True)
        date_posted = cols[4].get_text(strip=True)
        
        # Filter for China and Pharma industries (66, 56, 53)
        is_china = country in ["CHINA", "CN"]
        is_pharma = any(industry_code.startswith(prefix) for prefix in ["66", "56", "53"])
        
        if is_china and is_pharma:
            detail_url = urljoin(BASE_URL, f"importalert_{alert_number.replace('-', '_')}.html")
            
            # Fetch detail page
            detail_html = get_cached_html(detail_url)
            if not detail_html:
                continue
                
            detail_soup = BeautifulSoup(detail_html, "lxml")
            
            # Extract firms (look for table headers containing 'Firm Name')
            firms = []
            firm_table = detail_soup.find("table") # Usually the red list table
            if firm_table:
                for f_row in firm_table.find_all("tr")[1:]:
                    f_cols = f_row.find_all("td")
                    if f_cols:
                        firms.append(f_cols[0].get_text(strip=True))
            
            # Extract products and summary
            # (Heuristic-based extraction for this MVP)
            products = [alert_name] 
            summary = detail_soup.get_text(strip=True)[:500] + "..."
            
            alert_record = {
                "alert_number": alert_number,
                "alert_name": alert_name,
                "country": country,
                "industry_code": industry_code,
                "issued_date": date_posted,
                "firms_listed": list(set(firms)),
                "products_affected": products,
                "linked_apis": extract_linked_apis(products),
                "summary": summary,
                "source_url": detail_url
            }
            alerts.append(alert_record)
            logger.info(f"Captured FDA Alert {alert_number} for {len(firms)} firms")

    # Write to seed data
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(alerts, f, indent=2)
        
    logger.info(f"Ingestion complete. Captured {len(alerts)} pharma alerts from China.")


from urllib.parse import urljoin

if __name__ == "__main__":
    main()
