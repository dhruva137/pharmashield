# ShockMap — Final Polish & Deployment Prompt Guide
### Google Solution Challenge 2026 | Phase 1 Completion

> **How to use this file:** Each section is a self-contained prompt. Paste it directly into Claude, Cursor, or your AI coding tool. Work top to bottom — the design system must come first, then features, then deployment. Mock data is explicitly permitted in every prompt.

---

## Table of Contents

1. [Design System Overhaul](#1-design-system-overhaul)
2. [Dashboard — Animated HHI Globe + Live Ticker](#2-dashboard)
3. [Propagation Graph — THE WOW FEATURE](#3-propagation-graph-wow)
4. [War Room — Cinematic Incident Command](#4-war-room)
5. [Supply Map — Animated Shock Corridors](#5-supply-map)
6. [Query Interface — Streaming Analyst](#6-query-interface)
7. [Alerts Feed — Live Signal Wall](#7-alerts-feed)
8. [Global Bug Fixes & UX Hardening](#8-global-bug-fixes)
9. [Demo Mode — Autopilot & Keyboard Shortcuts](#9-demo-mode)
10. [Deployment — Docker + Railway/Render](#10-deployment)

---

## 1. Design System Overhaul

> **Run this first. Everything else builds on this.**

```
I am building ShockMap — a real-time supply shock intelligence platform for India's critical import dependencies (pharma APIs, rare earth minerals). The stack is React 19 + Vite + Tailwind CSS + FastAPI. Judges are Google engineers evaluating real-world impact and technical polish.

I need you to implement a complete design system in `frontend/src/styles/tokens.css` and a global `theme.ts` config. The aesthetic is **military-grade command center + editorial data journalism** — think Bloomberg Terminal meets a dark ops war room. NOT purple-gradient AI slop.

Design decisions to commit to:
- **Color palette**: Near-black base `#080C10`, with a single electric accent `#00E5A0` (toxic teal for active/safe states) and `#FF4444` (alarm red for critical shocks). Muted `#1A2332` for cards. Text: `#E8EDF2` primary, `#6B7E94` secondary.
- **Typography**: Import `Syne` (display headings — bold, slightly condensed geometric) + `JetBrains Mono` (data values, metrics, codes) + `IBM Plex Sans` (body UI text). All via Google Fonts.
- **Motion system**: Define three animation tiers in CSS vars:
  - `--anim-instant`: 80ms (micro, hover states)
  - `--anim-fast`: 200ms (panel transitions)
  - `--anim-slow`: 600ms (page reveals, shock propagation)
- **Data states**: CSS classes for `state-critical` (red pulse glow), `state-elevated` (amber), `state-normal` (teal), `state-stale` (grey). Each should have a subtle animated border-glow keyframe.
- **Card system**: `.card-glass` — dark semi-transparent background, 1px border using `rgba(255,255,255,0.06)`, subtle inset shadow, no border-radius above 8px (this is ops software, not a consumer app).
- **Grid**: Define a strict 12-column CSS grid. Include `.grid-dashboard` (3 cols large, 2 medium, 1 small) and `.grid-detail` (sidebar + main).
- **Scrollbars**: Custom thin scrollbar in the accent color.

Also create `frontend/src/components/ui/` with these base components:
- `<RiskBadge level="critical|elevated|normal" />` — animated pill with pulsing dot
- `<MetricCard title value delta trend />` — large mono number, small label, optional sparkline div slot
- `<SectionHeader title subtitle eyebrow />` — Syne display font, eyebrow in mono caps
- `<LoadingShock />` — a custom loader: animated horizontal scan line, not a spinner

Apply the design system globally in `App.tsx`. The overall feel: someone looking at this should feel like they're in a Bloomberg terminal crossed with a Pentagon situation room.
```

---

## 2. Dashboard

```
In ShockMap's React 19 frontend, I need to rebuild `frontend/src/pages/Dashboard.tsx` with three major enhancements. The design system (Syne + JetBrains Mono + dark command center palette) is already in place.

**Enhancement 1: Animated HHI Concentration Heatmap (replace the static version)**
- Use `react-simple-maps` + custom SVG overlays to render a China province map
- Color provinces using HHI score: a gradient from `#1A2332` (low) → `#FF8800` (medium) → `#FF4444` (critical concentration)
- On load: provinces should fade in with staggered 40ms delays using CSS animation
- On hover: show a tooltip with: Province name, HHI score, top 3 APIs sourced, % of India's supply
- Active shock provinces: add a continuous `pulse-ring` CSS animation (expanding ring, opacity fade) in alarm red
- Use this mock data inline (no API needed): Hebei (HHI: 0.82, APIs: Paracetamol API, 6-APA, Para-aminophenol), Shandong (HHI: 0.71, APIs: Ciprofloxacin API, Metformin), Inner Mongolia (HHI: 0.65, APIs: Rare Earth Oxides, Neodymium)

**Enhancement 2: Real-time Shock Ticker (top of page)**
- A horizontally auto-scrolling ticker bar pinned below the nav
- Each item: severity dot + shock title + province + time-ago
- CSS marquee-style infinite scroll, pausable on hover
- Items pulse red when severity is CRITICAL
- Wire to `/api/v1/shocks` with 30s polling; use mock data if API is offline

**Enhancement 3: System Status Bar (bottom of page)**
- Sticky bottom bar showing: Engine 1 status (live/demo mode indicator), Engine 2 last propagation run timestamp, Engine 3 (Gemini) status (green/grey), total shocks monitored count, feed mode badge
- All values animate in with a typewriter effect on mount
- If `DEMO_MODE=true`, show a distinct amber "DEMO SCENARIO ACTIVE" badge

Keep all existing metric cards but upgrade them to use `<MetricCard>` with a mini sparkline (7-day fake data array is fine).
```

---

## 3. Propagation Graph — WOW

> **This is your single most impressive visual. Spend the most time here.**

```
I need to build the most visually stunning feature of ShockMap: the Shock Propagation Graph in `frontend/src/pages/GraphExplorer.tsx`. This must be the "jaw-drop" moment for Google Solution Challenge judges. Use React 19 + Vite. The design system (dark command center, Syne/JetBrains Mono) is in place.

**Library**: Use `@react-sigma/core` with `graphology` (Sigma.js v3). This handles large graph rendering at 60fps in WebGL. Install: `npm install @react-sigma/core graphology graphology-layout-forceatlas2 sigma`.

**Graph Data (use this mock, no API needed):**
```json
{
  "nodes": [
    {"id": "hebei", "label": "Hebei Province", "type": "province", "risk": 95, "x": 0, "y": 0},
    {"id": "pap", "label": "Para-Aminophenol", "type": "ksm", "risk": 88, "x": 1, "y": 1},
    {"id": "6apa", "label": "6-APA", "type": "ksm", "risk": 72, "x": 1, "y": -1},
    {"id": "paracetamol_api", "label": "Paracetamol API", "type": "api", "risk": 85, "x": 2, "y": 1},
    {"id": "amoxicillin_api", "label": "Amoxicillin API", "type": "api", "risk": 68, "x": 2, "y": -1},
    {"id": "paracetamol", "label": "Paracetamol", "type": "drug", "risk": 82, "x": 3, "y": 1.5},
    {"id": "ceftriaxone", "label": "Ceftriaxone", "type": "drug", "risk": 74, "x": 3, "y": 0},
    {"id": "amoxicillin", "label": "Amoxicillin", "type": "drug", "risk": 65, "x": 3, "y": -1.5},
    {"id": "shandong", "label": "Shandong Province", "type": "province", "risk": 45, "x": 0, "y": -3},
    {"id": "ciprofloxacin_api", "label": "Ciprofloxacin API", "type": "api", "risk": 40, "x": 2, "y": -3},
    {"id": "ciprofloxacin", "label": "Ciprofloxacin", "type": "drug", "risk": 38, "x": 3, "y": -3}
  ],
  "edges": [
    {"source": "hebei", "target": "pap", "weight": 0.9},
    {"source": "hebei", "target": "6apa", "weight": 0.7},
    {"source": "pap", "target": "paracetamol_api", "weight": 0.85},
    {"source": "6apa", "target": "amoxicillin_api", "weight": 0.68},
    {"source": "paracetamol_api", "target": "paracetamol", "weight": 0.82},
    {"source": "paracetamol_api", "target": "ceftriaxone", "weight": 0.6},
    {"source": "amoxicillin_api", "target": "amoxicillin", "weight": 0.65},
    {"source": "shandong", "target": "ciprofloxacin_api", "weight": 0.4},
    {"source": "ciprofloxacin_api", "target": "ciprofloxacin", "weight": 0.38}
  ]
}
```

**Visual specifications — this is what makes it WOW:**

1. **Node appearance by type:**
   - `province`: large hexagon shape, bright red glow if risk > 70, with a slow rotating outer ring animation
   - `ksm` (key starting material): medium diamond shape, amber
   - `api`: medium circle, orange-red gradient based on risk score
   - `drug`: rounded square, color interpolated from green (risk 0) to red (risk 100)
   - All nodes: size proportional to risk score (min 8px, max 30px)
   - Node label: show below, JetBrains Mono font, small

2. **Edge appearance:**
   - Edge width proportional to `weight`
   - Color: interpolate from `#334455` (low risk) to `#FF4444` (high risk path)
   - **Animated shock pulse**: When a shock is "active" on a node, animate a glowing particle traveling along each outgoing edge — a bright dot that moves from source to target repeatedly. This is the single most impressive visual. Implement using a CSS/SVG overlay or Sigma's edge renderer with a custom `drawEdge` that uses a time-based offset to place a bright circle along the edge path.

3. **Interactions:**
   - Click a node: right panel slides in showing node details (risk score, buffer days, substitutability, upstream/downstream list)
   - Hover: edge highlights in bright white, connected nodes glow
   - "Trigger Shock" button: clicking this on a province node animates a ripple outward — all connected nodes briefly flash their risk color, with a 150ms stagger per hop

4. **Layout:**
   - Left: full-height Sigma canvas (WebGL)
   - Right: 320px sliding details panel (transforms in from right)
   - Top: filter bar — filter by node type, min risk threshold slider

5. **Metrics overlay (top-left corner of canvas):**
   - Semi-transparent card showing: Nodes at risk: X, Critical paths: Y, Avg propagation depth: Z
   - These animate as numbers count up on mount

6. **Background**: Dark canvas `#080C10` with a very subtle dot grid pattern using CSS `radial-gradient`

Make all interactions smooth, 60fps. No page reloads.
```

---

## 4. War Room

```
Rebuild `frontend/src/pages/WarRoom.tsx` (the Shock Detail page) for ShockMap. This is the "command center" moment judges will remember. Design system is in place (dark, Syne/JetBrains Mono). Mock data is fine.

**Mock shock data to use:**
- Shock: "Hebei Analgesic Stress — Factory Shutdown"
- Severity: CRITICAL
- Province: Hebei, China
- Affected drugs: Paracetamol (risk 82), Ceftriaxone (risk 74)
- Days to stockout: 18
- Exposure estimate: ₹2,340 Cr
- Aggregate risk score: 87/100

**Enhancement 1: Cinematic Page Entry**
- On mount: the page enters with a full-screen flash of alarm red (200ms), then fades to the dark background. This signals "incident activated."
- The title "WAR ROOM" appears with a glitch text effect (3-frame flicker using CSS animation) in JetBrains Mono caps
- Severity badge drops in from top with a bounce-settle easing

**Enhancement 2: Days-to-Stockout Countdown**
- Replace the static metric with an animated circular arc gauge
- The arc fills clockwise, colored from red (0 days) through amber (14 days) to green (30+ days)
- Current value in large JetBrains Mono in center
- On load, it counts up from 0 to the actual value over 1.2 seconds with easeOutCubic

**Enhancement 3: 72-Hour Action Ladder**
- Each action card shows: priority number, action title, quantity/amount, estimated cost, and impact delta
- Use this mock data:
  - Action 1: "Advance-buy 18 MT Para-Aminophenol from alternate Indian supplier" — Cost: ₹4.2 Cr — Impact: -12 risk pts, +8 days
  - Action 2: "Lock 40 MT Paracetamol API from SE Asia spot market" — Cost: ₹18 Cr — Impact: -20 risk pts, +12 days  
  - Action 3: "Activate strategic buffer release for Ceftriaxone" — Cost: ₹0 — Impact: -8 risk pts, +5 days
- Each card has a "▶ Run Simulation" button
- When clicked: the card expands to show a before/after delta panel:
  - Aggregate Risk: 87 → 67 (animated counter)
  - Days to Stockout: 18 → 26 (animated counter)
  - Exposure: ₹2,340 Cr → ₹1,890 Cr
  - A green checkmark animates in with a subtle bounce
- Only one simulation can be "active" at a time

**Enhancement 4: Evidence Pack**
- A collapsible section showing 3 source articles as citation cards
- Each card: favicon placeholder, headline, source name, timestamp, a one-line excerpt
- Use mock sources: Reuters, Bloomberg, DGFT India notification
- Cards fan in with 80ms stagger on expand

**Enhancement 5: Propagation Path Visual (mini)**
- A horizontal flow diagram showing: Hebei → PAP → Paracetamol API → Paracetamol
- Nodes are colored by risk, connected by animated dashed lines
- Each node shows risk score below it
- Clicking any node opens the full Graph Explorer in a new tab

Layout: two-column. Left col (60%): shock summary, countdown gauge, propagation mini-map, evidence. Right col (40%): sticky action ladder.
```

---

## 5. Supply Map

```
Upgrade `frontend/src/pages/SupplyMap.tsx` in ShockMap (React 19 + Leaflet/react-leaflet). The design system is in place. This page shows supply corridors from China provinces to Indian states.

**Enhancement 1: Animated Supply Corridors**
Using Leaflet's SVG overlay, draw animated "flow lines" between source provinces and destination states:
- Each corridor is an SVG path (great-circle arc) between coordinates
- Animate small bright dots traveling along each path continuously (like a pulse in a circuit board)
- Corridor width proportional to trade volume (use mock weights)
- Corridor color: `#00E5A0` (healthy flow) → `#FF4444` (disrupted flow)
- When a province has an active shock: the corridor flashes and the dots speed up + turn red

**Mock corridors to render:**
```json
[
  {"from": [39.9, 116.4], "to": [28.7, 77.1], "label": "Hebei → Delhi NCR", "volume": 0.9, "disrupted": true},
  {"from": [36.7, 117.0], "to": [19.1, 72.9], "label": "Shandong → Mumbai", "volume": 0.7, "disrupted": false},
  {"from": [41.8, 123.4], "to": [12.9, 77.6], "label": "Liaoning → Bangalore", "volume": 0.5, "disrupted": false},
  {"from": [40.8, 111.7], "to": [22.6, 88.4], "label": "Inner Mongolia → Kolkata", "volume": 0.6, "disrupted": true}
]
```

**Enhancement 2: Province Shock Overlays**
- Use GeoJSON for Chinese provinces (use a CDN-hosted simplified version)
- Fill provinces by current risk: dark base → amber → red
- Active shock provinces: add a pulsing circle marker with 3 expanding rings (CSS animation via Leaflet DivIcon)
- Clicking a province: popup card showing shock summary + "Open War Room" button

**Enhancement 3: Indian State Risk Absorption View**
- Toggle button: "Source View" / "Impact View"
- In Impact View: color Indian states by absorbed downstream risk (Maharashtra high, Delhi NCR high, others lower)
- Tooltip on hover: state name, # of APIs at risk, top exposed medicine

**Enhancement 4: Map UI Polish**
- Use a dark map tile: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
- Custom zoom controls (styled to match the command center theme)
- A legend card (bottom left): explaining the corridor color coding
- Fit map bounds to show both China and India on load with smooth flyTo animation
```

---

## 6. Query Interface

```
Rebuild `frontend/src/pages/QueryPage.tsx` for ShockMap's "Operator Analyst" feature powered by Gemini Flash via `/api/v1/query`. Design system in place.

**Enhancement 1: Streaming Typewriter Response**
- When the API returns an answer, render it character-by-character with a 12ms delay per character using a streaming typewriter effect
- Show a blinking cursor `█` (JetBrains Mono) while streaming
- Implement this even if the API returns all at once (fake the stream on the frontend)

**Enhancement 2: Suggested Query Chips**
- Below the input, show 4 pre-built query chips:
  - "Which drugs depend most on Hebei?"
  - "What should procurement do in the next 72 hours?"
  - "Which APIs have substitutes available?"
  - "Show me the highest risk propagation path"
- Chips are pill-shaped, dark background, teal border, hover glow
- Clicking a chip populates the input and auto-submits after 300ms

**Enhancement 3: Response Cards with Citations**
Structure every response as:
- Main answer block (typewriter animated)
- A "Referenced entities" section: small cards for each drug/API mentioned with its current risk badge
- A "Suggested next steps" section: 2-3 action bullets with arrow icons
- A "Confidence" indicator: 3 dots, filled based on score (use mock: 0.87)

Use this mock response for when the API is offline (graceful degradation):
> "Based on current shock data, Paracetamol and Ceftriaxone face the highest downstream risk from the Hebei disruption. Para-Aminophenol sourcing is the critical bottleneck. Recommend immediate spot-market sourcing from SE Asia and activation of DGFT buffer release protocols within 24 hours."

**Enhancement 4: Query History**
- Left sidebar (240px) showing past queries in the current session
- Each entry: truncated query text + timestamp + a small risk-level dot
- Click to reload that response
- "Clear history" button at bottom

**Enhancement 5: Input UX**
- Large, prominent input with placeholder "Ask ShockMap anything about current supply risks..."
- CMD+Enter submits
- Textarea auto-expands (max 4 lines)
- Show a character count warning at 280+ chars
- Subtle animated border glow on focus using the teal accent
```

---

## 7. Alerts Feed

```
Upgrade `frontend/src/pages/AlertsFeed.tsx` for ShockMap. Design system in place.

**Enhancement 1: Live Signal Wall Layout**
Change the layout from a plain list to a "signal wall" — 3-column masonry-style card grid (CSS columns, not JS masonry).

Each alert card shows:
- Severity badge (CRITICAL / ELEVATED / NORMAL) with animated pulse dot
- Shock type icon (factory: 🏭, port: ⚓, export ban: 🚫, contamination: ⚗️ — rendered as styled SVG, not emoji)
- Province + sector tags
- Headline in Syne medium weight
- Time since detected (live-updating relative time: "4 minutes ago")
- Affected entities list (max 3 drug names, then "+2 more")
- A thin progress bar at card bottom showing risk score 0-100

**Enhancement 2: Filter Bar**
- Horizontal filter row with toggle pills: All / Critical / Elevated / Pharma / Rare Earth / China / India
- Active filter highlighted in teal
- Filter transitions: cards that don't match fade to 30% opacity + blur (CSS transition, no re-render)

**Enhancement 3: New Alert Animation**
- When a new alert arrives (poll every 15s), it doesn't just append — it slides in from the top with a brief red flash border, then settles
- A "NEW" badge appears for 8 seconds then fades

**Enhancement 4: Card Hover State**
- On hover: card lifts (translateY -4px), border brightens to the risk-level color, a subtle scanline effect sweeps across
- "Open War Room" CTA appears with a slide-up from card bottom

Use 6 mock alerts in varying severity levels if the API is unavailable.
```

---

## 8. Global Bug Fixes & UX Hardening

```
Apply these cross-cutting fixes and polish to all pages of ShockMap (React 19 + Vite + Tailwind + FastAPI backend):

**Fix 1: API Offline Graceful Degradation**
In `frontend/src/lib/api.ts`, wrap every fetch call with a try-catch that:
- Catches network errors and 5xx responses
- Returns mock data from `frontend/src/lib/mockData.ts` automatically
- Shows a subtle amber banner "Using demo data — live API offline" at the top of the page
- Does NOT crash the app or show blank screens

Create `frontend/src/lib/mockData.ts` with realistic mock responses for every endpoint: `/shocks`, `/shocks/:id/war-room`, `/graph`, `/query`.

**Fix 2: Loading States**
Every page that fetches data must show the custom `<LoadingShock />` component (the scanline loader) while loading, not a blank screen or default spinner.

**Fix 3: Empty States**
If the shocks list is empty, show an illustrated empty state: a dark card with a pulsing radar circle animation and text "No active shocks detected — system monitoring". Not a blank div.

**Fix 4: Mobile Responsiveness (basic)**
The judges may view on a tablet. Add responsive breakpoints:
- Nav collapses to hamburger below 768px
- Dashboard grid goes to 1 column
- War Room stacks vertically (action ladder moves below shock summary)
- Graph Explorer shows a message "Best viewed on desktop" with a simplified node list fallback

**Fix 5: Page Transitions**
Wrap all `<Route>` components in a fade transition using Framer Motion `<AnimatePresence>`. Each page enters with `opacity: 0 → 1` + `translateY: 8px → 0` over 250ms. This makes navigation feel polished and intentional.

**Fix 6: Navigation Active States**
The nav currently doesn't clearly show which page is active. Add: active page gets a left border accent in teal + background highlight. Non-active items have a hover state.

**Fix 7: Number Formatting**
All risk scores, currency values, and percentages should be formatted consistently using `Intl.NumberFormat`. ₹2340 Cr should display as "₹2,340 Cr". Risk score 82.3456 should display as "82.3".

**Fix 8: Favicon and Page Titles**
- Create a simple SVG favicon: a hexagon with a lightning bolt inside, in the teal accent color
- Set dynamic `document.title` per page: "War Room — Hebei Shock | ShockMap", "Dashboard | ShockMap", etc.
```

---

## 9. Demo Mode — Autopilot & Keyboard Shortcuts

```
Add a demo autopilot system to ShockMap for the hackathon presentation. This lets the presenter run a flawless demo hands-free.

**Component: `<DemoController />`**
Create `frontend/src/components/DemoController.tsx` — a floating controller (bottom-right corner, outside normal flow):
- A small "DEMO" pill button that expands on click to show controls
- **Autopilot mode**: walks through the golden path automatically:
  1. Navigate to Dashboard (3s pause, HHI map animates in)
  2. Navigate to Alerts, highlight the Hebei CRITICAL shock (2s)
  3. Navigate to War Room for that shock (auto-opens)
  4. Wait 3s, then auto-click "Run Simulation" on Action 1
  5. Wait 3s, navigate to Graph Explorer, trigger the shock ripple animation
  6. Wait 4s, navigate to Query, auto-type and submit "What should procurement do about the Hebei shutdown?"
  7. Loop back to Dashboard

**Keyboard shortcuts** (active globally, shown in a help modal on `?` key):
- `D` → Dashboard
- `A` → Alerts  
- `W` → War Room (most recent critical shock)
- `G` → Graph Explorer
- `Q` → Query
- `Space` → trigger shock ripple on Graph page (if open)
- `S` → run simulation on War Room (if open)
- `Escape` → close any open panel

**Demo Reset button**: One click resets all simulation states, clears query history, and returns to Dashboard. Useful between judge demos.

Show a subtle keyboard shortcut hint bar at the bottom of each page (dismissible, only shown in DEMO_MODE).
```

---

## 10. Deployment

```
Set up production deployment for ShockMap. Stack: React 19 + Vite (frontend), FastAPI + Python (backend). I want to deploy cheaply and reliably for the hackathon demo.

**Step 1: Docker Setup**

Create `backend/Dockerfile`:
- Base: `python:3.11-slim`
- Install deps from `requirements.txt`
- Expose port 8000
- Start with: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Include a `.dockerignore` that excludes `__pycache__`, `.env`, `venv`, `*.pyc`

Create `frontend/Dockerfile`:
- Two-stage build: node:20-alpine for build, nginx:alpine for serve
- Build: `npm ci && npm run build`
- Copy `dist/` to nginx html dir
- Add `nginx.conf` that: serves static files, proxies `/api/` → `http://backend:8000/api/`, handles React Router (try_files fallback to index.html)

Create `docker-compose.yml` at project root:
- `backend` service: build from `./backend`, env_file `.env`, ports `8000:8000`
- `frontend` service: build from `./frontend`, ports `80:80`, depends_on backend
- A shared network `shockmap-net`

**Step 2: Environment Config**

Create `backend/.env.example`:
```
GEMINI_API_KEY=your_key_here
DEMO_MODE=true
ALLOWED_ORIGINS=http://localhost,https://your-domain.com
ENABLE_GNN=false
```

In the FastAPI app, load `.env` using `python-dotenv`. Add a startup check that logs which env vars are missing and continues with degraded mode (not crash).

**Step 3: Railway Deployment (recommended for hackathon)**

Create `railway.toml` at project root:
```toml
[build]
builder = "dockerfile"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/healthz"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
```

Create `railway-frontend.toml` for the frontend service similarly.

Also create `frontend/vercel.json` for optional Vercel frontend deployment:
```json
{
  "rewrites": [
    {"source": "/api/:path*", "destination": "https://your-railway-backend.up.railway.app/api/:path*"},
    {"source": "/(.*)", "destination": "/index.html"}
  ]
}
```

**Step 4: Health Check Endpoint**
Ensure `GET /healthz` returns:
```json
{
  "status": "ok",
  "demo_mode": true,
  "engines": {"signal": "ok", "propagation": "ok", "action": "ok"},
  "shocks_loaded": 6,
  "timestamp": "2026-04-27T10:00:00Z"
}
```

**Step 5: Production Build Check**
Add a `scripts/check_build.sh`:
- Runs `npm run build` in frontend and checks for errors
- Runs `python -c "from app.main import app"` to check backend imports
- Prints "✅ Build ready for deployment" or lists errors

**Step 6: README Update**
Update the root `README.md` to include:
- A "Deploy in 5 minutes" section with the Railway one-click instructions
- A "Demo credentials" section (if auth is added)
- Badges: build status, demo mode, license
- A GIF/screenshot placeholder section (add images later)
```

---

## Execution Order

Run these prompts in this sequence for best results:

```
1 → Design System     (foundation, do first)
2 → Dashboard         (first page judges see)
3 → Propagation Graph (the wow moment — most effort)
4 → War Room          (core MVP value)
5 → Supply Map        (visual depth)
8 → Bug Fixes         (stability before showing anything else)
9 → Demo Mode         (last before deployment)
10 → Deployment       (final step)
6 → Query Interface   (can be parallel with 5)
7 → Alerts Feed       (can be parallel with 6)
```

---

## Rare Techniques Worth Mentioning to Judges

These are implemented in the prompts above but worth calling out explicitly during the demo:

| Technique | Where | Why It Impresses |
|---|---|---|
| **Personalized PageRank** | Engine 2 | Not just BFS — directional probabilistic influence flow |
| **Louvain Community Detection** | Engine 2 | Co-propagating cluster identification (graph theory) |
| **WebGL-rendered graph** (Sigma.js) | Graph Explorer | 60fps with hundreds of nodes — not a D3 toy |
| **Animated particle flow on edges** | Graph Explorer | Unique visual — shock literally "flows" through graph |
| **Schema-constrained Gemini output** | Engine 3 | Deterministic JSON from LLM — production-safe |
| **HHI concentration index** | Dashboard | Economic inequality metric applied to supply chains |
| **Propagation formula with decay** | Engine 2 | Physics-inspired: `R = PR * (1-S) * exp(-B/τ) * C` |
| **Demo autopilot** | DemoController | Shows product thinking beyond just code |

---

*Built for Google Solution Challenge 2026 — Phase 1: ShockMap MVP*
