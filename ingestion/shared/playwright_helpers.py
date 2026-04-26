"""
Async helpers for Playwright browser-based scraping.
"""

import asyncio
import logging
from typing import List, Dict, Optional
from playwright.async_api import async_playwright

# Setup Logging
logger = logging.getLogger("ingestion.playwright")

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


async def fetch_page_html(
    url: str, 
    wait_for_selector: Optional[str] = None, 
    timeout_ms: int = 30000
) -> str:
    """
    Launches a headless browser, navigates to a URL, and returns the full HTML content.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=USER_AGENT)
        page = await context.new_page()
        
        try:
            logger.info(f"Navigating to {url}...")
            await page.goto(url, timeout=timeout_ms)
            
            if wait_for_selector:
                await page.wait_for_selector(wait_for_selector, timeout=timeout_ms)
                
            html = await page.content()
            return html
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            return ""
        finally:
            await browser.close()


async def fetch_pages_concurrent(
    urls: List[str], 
    max_concurrency: int = 3, 
    rate_limit_per_sec: float = 0.5
) -> Dict[str, str]:
    """
    Fetches multiple pages concurrently with a semaphore and rate limiting.
    """
    semaphore = asyncio.Semaphore(max_concurrency)
    results = {}

    async def _bound_fetch(url: str):
        async with semaphore:
            html = await fetch_page_html(url)
            results[url] = html
            # Rate limit wait
            await asyncio.sleep(1.0 / rate_limit_per_sec)

    tasks = [asyncio.create_task(_bound_fetch(url)) for url in urls]
    await asyncio.gather(*tasks)
    
    return results
