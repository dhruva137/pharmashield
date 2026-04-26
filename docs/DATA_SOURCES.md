# Data Sources

Everything in this doc is what you need to collect manually. The code is built to absorb it without modification — drop the file in the right place, restart the backend, done.

---

## 1. Chinese Provincial Environmental Notices (HIGHEST PRIORITY)

**This is the differentiator. Everything else is supporting evidence.**

### Hebei Province EPB
- **Source:** https://hbsthjt.hebei.gov.cn/
- **Section:** 公示公告 → 行政处罚公告 (Administrative Penalty Notices)
- **What to look for:** Notices mentioning 制药 (pharma), 化工 (chemical), 停产 (halt production), 整改 (rectification)
- **Drop into:** `data/seed/epb_notices.json`
- **Schema:**
```json
{
  "id": "hebei_2026_04_15",
  "source_url": "https://hbsthjt.hebei.gov.cn/notice/...",
  "scraped_at": "2026-04-15T10:00:00Z",
  "factory_name_zh": "石家庄某制药企业",
  "factory_name_en": "Shijiazhuang Pharmaceutical Enterprise",
  "industry": "API manufacturing",
  "violation_type": "环保不达标",
  "violation_type_en": "Environmental compliance failure",
  "severity": "HIGH",
  "duration_days_estimate": 30,
  "linked_apis": ["para_aminophenol"],
  "raw_text_zh": "...full notice text in Chinese...",
  "gemini_translation": "...full English translation..."
}
```

**To run the scraper that does this automatically:**
```bash
cd ingestion
playwright install chromium
python scrape_hebei_epb.py
# Output appended to data/seed/epb_notices.json
```

### Other Chinese provinces to consider
- **Jiangsu:** http://hbj.jiangsu.gov.cn/
- **Zhejiang:** https://sthjt.zj.gov.cn/
- **Shandong:** http://sthjt.shandong.gov.cn/
- **Hubei:** http://sthjt.hubei.gov.cn/

The scraper is parameterizable — just change `BASE_URL` and `LISTING_PATH` at the top of `scrape_hebei_epb.py`.

---

## 2. FDA Import Alerts on Chinese Pharma Facilities

- **Source:** https://www.accessdata.fda.gov/cms_ia/ialist.html
- **Filter:** Country = China, Industry = 66 (Pharmaceuticals) or 56 (Cosmetics) or 53 (Drugs)
- **What to look for:** OAI status (Official Action Indicated), Refused For Import, Detention Without Physical Examination
- **Drop into:** `data/seed/fda_alerts.json`
- **Schema:**
```json
{
  "id": "fda_66-40_2026-03-12",
  "alert_number": "66-40",
  "publish_date": "2026-03-12",
  "firm_name": "Hebei Welcome Pharmaceutical Co.",
  "city": "Shijiazhuang",
  "products": ["Penicillin G Potassium API"],
  "linked_apis": ["penicillin_g_potassium"],
  "reason": "Data integrity violations during pre-approval inspection",
  "source_url": "https://www.accessdata.fda.gov/cms_ia/importalert_..."
}
```

**To run the scraper:**
```bash
cd ingestion
python scrape_fda_alerts.py
# Output: data/seed/fda_alerts.json
```

This requires no auth — runs in 60 seconds.

---

## 3. DGCI&S Trade Data (India's official import statistics)

- **Source:** https://commerce.gov.in/eidb/
- **What to download:** Monthly import data by HS code
  - **HS 29** — Organic chemicals (covers most APIs)
  - **HS 30** — Pharmaceutical products (finished formulations)
  - **HS 2941** — Antibiotics specifically
- **Format:** CSV download (sometimes Excel — convert to CSV)
- **Drop into:** `data/seed/trade_data.csv`
- **Required columns:**
```csv
month,api_id,hs_code,country_origin,import_value_usd,import_quantity_kg
2024-01,para_aminophenol,29222910,China,42500000,1180000
2024-02,para_aminophenol,29222910,China,38000000,1050000
```

**Mapping HS codes to API IDs:** Many APIs share HS codes (commodity-level). The mapping is in `data/seed/hs_code_mapping.json` (placeholder). You'll need to research which 8-digit HS codes correspond to which API. Alternative: just track at the HS code level and don't try to map every drug.

**Easier alternative:** Pharmexcil publishes monthly digest PDFs with import volumes already broken down by chemical. Source: https://pharmexcil.com/

---

## 4. NLEM 2022 Drug List (to expand from 20 → all 800+ drugs)

- **Source:** https://cdsco.gov.in/opencms/opencms/en/NLEM-2022/
- **Format:** PDF
- **Action:** For each drug not in `data/seed/drugs.json`, add an entry:
```json
{
  "id": "drug_id_lowercase",
  "name": "Display Name",
  "generic_name": "Generic Name",
  "nlem_tier": "TIER_1",
  "patient_population_estimate": 50000000,
  "primary_apis": ["api_id_1"],
  "has_substitute": false,
  "therapeutic_class": "antibiotic"
}
```
**Tier mapping:** NLEM 2022 doesn't have explicit tiers. Approximate by category:
- TIER_1: critical / life-saving (insulin, antibiotics, paracetamol, anti-TB)
- TIER_2: chronic disease management (statins, antihypertensives)
- TIER_3: specialty / less common

**Each entry takes ~3 minutes.** Top 50 drugs would be ~2.5 hours of work and get you to demo-quality data density.

---

## 5. Historical Disruption Events (the GNN training labels)

- **Source:** News archives + WHO drug shortage database + FDA shortage database
- **Drop into:** `data/seed/historical_disruptions.json` (already has 5 events; add more)
- **Schema:**
```json
{
  "date": "2024-01-15",
  "source_event": "Hebei pharma plant environmental inspection wave",
  "province": "Hebei",
  "severity": 0.7,
  "duration_days": 21,
  "affected_drugs": ["paracetamol", "ibuprofen"],
  "lead_time_days": 23,
  "indian_consumer_price_impact_pct": 100.0,
  "citation_url": "https://news-source-url"
}
```

**This is what makes the GNN training real instead of circular.** With 20+ events with measured `indian_consumer_price_impact_pct` as labels, the GNN learns actual market response patterns rather than just regurgitating edge weights.

**Where to find them:**
- LiveMint, Economic Times, Business Standard archives — search "API shortage India"
- WHO drug shortage database: https://list.essentialmeds.org/
- FDA Drug Shortage database: https://www.accessdata.fda.gov/scripts/drugshortages/

Aim for 20 events spanning 2018-2026.

---

## 6. Policy Snippets (RAG quality)

- **Drop into:** `data/seed/policy_snippets.json` (already has 10; needs ~20 more)
- **What to add:**
  - **ORF report** — full text from "Securing India's Pharmaceutical Supply Chain" (Nov 2025)
  - **NLEM 2022 preamble** — first 3 paragraphs
  - **NITI Aayog PLI scheme document** — sections on bulk drugs and KSMs
  - **Department of Pharmaceuticals annual reports** — sections on import dependency
  - **WHO essential medicines criteria** — sections on supply security

**Format:** Each entry is a 2-4 sentence chunk (Qdrant indexes these for semantic search).
```json
{
  "id": "orf_2025_05",
  "source": "ORF Research Brief, Nov 2025, p.12",
  "source_url": "https://orfonline.org/...",
  "text": "The fragility of the global paracetamol supply chain was exposed during the 2024 Hebei environmental inspections...",
  "keywords": ["paracetamol", "Hebei", "fragility"]
}
```

**Quality > quantity.** 20 well-chosen snippets give better RAG answers than 200 random paragraphs.

---

## 7. Live source URLs (verifier badge)

For every alert in `alerts.json`, the `source_url` field MUST resolve to a real page. Currently many are fake (e.g. `reuters.com/business/pharma/jiangsu-industrial-accident-impacts-pharma` — 404).

**Action:** Replace fake URLs with real ones. If the news source has paywalled, link to archive.org snapshot:
```
https://web.archive.org/web/2024*/<original-url>
```

A judge clicking through and seeing real Chinese government text or real news is worth 30 minutes of slide content.

---

## Refresh schedule (Phase 2)

For production, schedule the scrapers:
```cron
# Hebei EPB — every 6 hours
0 */6 * * * cd /app/ingestion && python scrape_hebei_epb.py

# FDA — daily at 3am UTC
0 3 * * * cd /app/ingestion && python scrape_fda_alerts.py

# DGCI&S — manual monthly (data only published monthly)
```

After scraper runs, hit `POST /api/v1/ingest/refresh` to make the backend re-read the JSON files without restart.

---

## TL;DR — what to do if you have 1 hour

1. Run `python scrape_fda_alerts.py` — populates real FDA alerts (10 min, no setup).
2. Manually fetch 3-5 Hebei EPB notices, paste into `epb_notices.json` (20 min).
3. Add 10 more drugs to `drugs.json` from NLEM PDF (20 min).
4. Add 5 more historical disruptions with real news URLs (10 min).

That's enough to make the demo feel real.
