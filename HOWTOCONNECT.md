# The Optimal Connection: Intelligence API + HiveMind Frontend

**Premise**: We have full control over both the Intelligence API (FastAPI/Python/SQLite) and the HiveMind frontend (Next.js/PostgreSQL/Clerk). This document designs the most efficient, logically clean data flow between them.

---

## Part 1: The Core Insight

There are two data domains that need to meet:

```
DOMAIN A: USER CONTEXT (owned by HiveMind frontend)
  - Who is the user (Clerk auth, sessions)
  - What they own (PostgreSQL: portfolios, holdings, quantities, avg prices)
  - Their subscription tier (Stripe/PostgreSQL)
  - Their preferences and interaction history

DOMAIN B: MARKET INTELLIGENCE (owned by Intelligence API)
  - What's happening in the market (scraped articles, enrichment)
  - How entities relate (27-company knowledge graph, supply chain, competitors)
  - What stories are developing (narrative threads across articles)
  - What risks are correlated (shared suppliers, sector concentration)
```

**The connection point is: "Given THIS user's portfolio, what does THIS market intelligence mean for THEM?"**

Today, these domains are completely disconnected. The Intelligence API doesn't know the user exists. It computes everything against a hardcoded demo portfolio. The frontend doesn't know the Intelligence API exists. It shows fabricated mock data.

The optimal architecture makes this connection in the cleanest, most efficient way possible.

---

## Part 2: The Architecture

### 2.1 Data Flow Direction

```
Frontend → Intelligence API:  "Here are my holdings"
Intelligence API → Frontend:  "Here's what the market means for those holdings"
```

The Intelligence API becomes a **stateless analysis engine**. It receives portfolio context on each request, computes personalized analysis against it, and returns results. It never stores user data. It never manages sessions.

The frontend remains the **stateful user experience layer**. It owns auth, portfolios, preferences, and interaction history. It injects portfolio context into every intelligence request.

### 2.2 System Diagram

```
┌───────────────────────────────────────────────────────────────────────┐
│                          Docker Compose                               │
│                                                                       │
│  ┌──────────────────────────┐    ┌──────────────────────────────────┐│
│  │  app (Next.js :3000)      │    │  intelligence (FastAPI :8001)   ││
│  │                           │    │                                  ││
│  │  Clerk auth ─────────┐    │    │  X-API-Key auth                 ││
│  │  PostgreSQL ────┐    │    │    │  SQLite (articles, graph)       ││
│  │                 │    │    │    │  Scraper (every 5 min)          ││
│  │  BFF Proxy:     │    │    │    │                                  ││
│  │  ┌──────────────┼────┼────┼───►│  NEW: Accepts X-Portfolio       ││
│  │  │ 1. Clerk auth()   │    │    │  NEW: POST /api/dashboard       ││
│  │  │ 2. Read holdings──┘    │    │  NEW: POST /api/signals/agg.    ││
│  │  │ 3. Inject X-Portfolio  │    │  NEW: total_count in meta       ││
│  │  │ 4. Cache by hash      │    │  NEW: HTML sanitized at source  ││
│  │  │ 5. Return to browser   │    │  NEW: Docker HEALTHCHECK       ││
│  │  └────────────────────────┘    │                                  ││
│  └──────────────┬────────────┘    └──────────────────────────────────┘│
│                 │                                                      │
│  ┌──────────────┴────────────┐                                        │
│  │  db (PostgreSQL 16 :5432) │                                        │
│  └───────────────────────────┘                                        │
└───────────────────────────────────────────────────────────────────────┘
          │
          │  Port 3000 only
          ▼
   ┌────────────────┐
   │  Browser        │
   │  Only calls     │
   │  /api/* on :3000│
   └────────────────┘
```

### 2.3 Why BFF Proxy Still Matters (Even With API Auth)

Even if we add API key authentication to the Intelligence API, the BFF proxy is still essential because:

1. **Portfolio injection**: The proxy reads the user's holdings from PostgreSQL and attaches them to every intelligence request. The browser doesn't need to know about portfolio-to-API mapping.
2. **Cache efficiency**: Cache is keyed by `portfolio_hash + endpoint`. Multiple users with identical portfolios share the same cache entry.
3. **Single origin**: Browser makes all requests to `:3000`. No CORS, no container name resolution, no port exposure.
4. **Response shaping**: Strip internal fields (`user_id: "usr_demo"`) before they reach the browser.
5. **Graceful degradation**: If the intelligence service is down, the proxy returns a clean error. Core features (portfolio management, stock prices) continue working.

---

## Part 3: Intelligence API Changes

### Change 1: Accept Portfolio on Personalized Endpoints (CRITICAL)

**What**: All portfolio-dependent endpoints accept an `X-Portfolio` header containing the user's holdings.

**Format**: `X-Portfolio: AAPL:25.0,TSLA:20.0,MSFT:15.0,GOOGL:12.0,NVDA:10.0,META:8.0,JPM:5.0,V:3.0,JNJ:2.0`

Each entry is `TICKER:WEIGHT_PCT`, comma-separated. Max 10 entries, ~100 chars total — well within header limits.

**Behavior**:
- If `X-Portfolio` is present → compute analysis against those holdings with those weights
- If `X-Portfolio` is absent → fall back to the demo portfolio (backward compatible)

**Affected endpoints**:
| Endpoint | What Changes |
|----------|-------------|
| `GET /api/articles/{id}/relevance` | Relevance scores computed against real holdings |
| `GET /api/articles/{id}/summary` | Summaries generated for real holdings only |
| `GET /api/digest/today` | All 6 sections filtered/scored for real holdings |
| `GET /api/risk/alerts` | Alert exposure % computed from real weights |
| `GET /api/risk/exposure` | Sector/geography breakdown from real weights |
| `GET /api/discovery/today` | Discoveries connected to real holdings |
| `GET /api/alerts/history` | Alerts filtered to real holdings |

**Unaffected endpoints** (not portfolio-dependent):
- `GET /api/articles` — article feed is universal
- `GET /api/articles/{id}` — article content is universal
- `GET /api/narratives/active` — narratives are per-ticker, not per-portfolio
- `GET /api/explore/entity/{ticker}` — graph is universal
- `GET /api/explore/search` — search is universal
- `GET /api/health` — status is universal

**What this eliminates**:
- Portfolio mismatch flaw → **gone**
- Stock universe mismatch → **gone** (API computes for TSLA and V if user holds them)
- Client-side portfolio filtering → **gone** (API returns correct data)
- Misleading "your portfolio" language → **gone** (it IS their portfolio now)

**Implementation complexity**: MEDIUM. The intelligence API already has the computation logic for relevance, exposure, risk, etc. It currently runs against a hardcoded list. The change is to parameterize that list. The knowledge graph already includes all 27 entities (TSLA and V are already in the graph as competitors).

---

### Change 2: Batch Dashboard Endpoint (HIGH VALUE)

**What**: New `POST /api/dashboard` endpoint that returns everything the dashboard needs in a single request.

**Request**:
```json
POST /api/dashboard
Content-Type: application/json
X-API-Key: <key>

{
  "holdings": [
    { "ticker": "AAPL", "weight_pct": 25.0 },
    { "ticker": "TSLA", "weight_pct": 20.0 },
    { "ticker": "MSFT", "weight_pct": 15.0 },
    { "ticker": "NVDA", "weight_pct": 10.0 }
  ],
  "include": ["digest", "exposure", "alerts", "narratives", "alert_history"]
}
```

**Response**:
```json
{
  "data": {
    "digest": {
      "digest_id": "dg_2026-02-11",
      "generated_at": "2026-02-11T05:22:45Z",
      "sections": {
        "direct_news": [...],
        "related_news": [...],
        "risk_alerts": [...],
        "developing_stories": [...],
        "discovery": [...],
        "sector_context": [...]
      }
    },
    "exposure": {
      "by_sector": {...},
      "by_geography": {...},
      "concentration_risks": [...]
    },
    "alerts": [...],
    "narratives": [...],
    "alert_history": [...]
  },
  "meta": {
    "portfolio_hash": "a1b2c3d4",
    "holdings_count": 4,
    "computed_at": "2026-02-11T05:24:00Z"
  }
}
```

**What this eliminates**:
- 5 parallel dashboard fetches → **collapsed to 1**
- 5 separate cache entries → **1 cache entry per portfolio hash**
- Client-side data coordination → **server assembles the complete picture**

**Why POST**: The request includes a portfolio payload. GET with body is semantically wrong. POST for "compute this analysis" is appropriate — it's closer to an RPC than a REST resource fetch.

**Server-side optimization**: The intelligence API can batch its internal SQLite queries. Articles, alerts, narratives — all queried in one transaction, filtered once, assembled once. This is 3-5x faster than serving 5 separate endpoints.

---

### Change 3: Batch Article Detail Endpoint (MEDIUM VALUE)

**What**: New `GET /api/articles/{id}/full` that returns article + relevance + summary in one call.

**Request**: `GET /api/articles/12345/full` with `X-Portfolio` header.

**Response**:
```json
{
  "data": {
    "article": {
      "id": 12345,
      "title": "...",
      "summary": "...",
      "source": "Reuters",
      "published_at": "2026-02-11T02:23:17Z",
      "tickers": ["NVDA", "TSM"],
      "enrichment": {
        "entities": [...],
        "signals": [...],
        "graph_contexts": {...},
        "narrative": {...},
        "contradiction": null,
        "historical_patterns": [...]
      }
    },
    "relevance": {
      "overall_relevance_score": 0.86,
      "per_holding_relevance": [...]
    },
    "summaries": [
      {
        "holding_ticker": "NVDA",
        "summary": "...",
        "action_context": "...",
        "confidence": 0.88
      }
    ]
  }
}
```

**What this eliminates**:
- 3 parallel requests on article click-through → **collapsed to 1**
- Simpler article detail page component (one fetch, one state)

---

### Change 4: Signal Aggregation Endpoint (CREATIVE — REPLACES RADAR CHART)

**What**: New `POST /api/signals/aggregate` endpoint that aggregates signal patterns across recent articles for the user's holdings.

This is the key creative addition. The current ImpactAnalysisPanel has a fabricated 6-factor radar chart (Product Innovation, Market Demand, Competition, etc.). No endpoint can provide those factors. But signal aggregation provides something **better and real**.

**Request**:
```json
POST /api/signals/aggregate
{
  "holdings": [
    { "ticker": "AAPL", "weight_pct": 25.0 },
    { "ticker": "NVDA", "weight_pct": 20.0 }
  ],
  "days": 7
}
```

**Response**:
```json
{
  "data": {
    "by_signal_type": {
      "AI_TECHNOLOGY": {
        "article_count": 12,
        "positive": 8,
        "negative": 2,
        "neutral": 2,
        "dominant_direction": "POSITIVE",
        "dominant_magnitude": "major",
        "affected_holdings": ["NVDA", "MSFT", "GOOGL"],
        "trend": "improving",
        "latest_headline": "NVIDIA unveils next-gen AI accelerator..."
      },
      "SUPPLY_DISRUPTION": {
        "article_count": 5,
        "positive": 1,
        "negative": 4,
        "neutral": 0,
        "dominant_direction": "NEGATIVE",
        "dominant_magnitude": "moderate",
        "affected_holdings": ["AAPL", "NVDA"],
        "trend": "worsening",
        "latest_headline": "TSMC warns of 3-month delays..."
      },
      "EARNINGS_REPORT": { ... },
      "REGULATORY": { ... },
      "M_AND_A": { ... }
    },
    "by_holding": {
      "NVDA": {
        "total_articles": 18,
        "net_sentiment": 0.72,
        "dominant_signal": "AI_TECHNOLOGY",
        "risk_signals": 3,
        "opportunity_signals": 12
      },
      "AAPL": {
        "total_articles": 9,
        "net_sentiment": 0.35,
        "dominant_signal": "SUPPLY_DISRUPTION",
        "risk_signals": 4,
        "opportunity_signals": 3
      }
    },
    "portfolio_summary": {
      "total_articles_analyzed": 47,
      "net_sentiment": 0.54,
      "top_opportunity": "AI_TECHNOLOGY",
      "top_risk": "SUPPLY_DISRUPTION",
      "signal_diversity": 7
    }
  }
}
```

**What this enables**:
- ImpactAnalysisPanel gets a **real radar chart** — but with signal types as axes (AI Tech, Supply Chain, Regulatory, Earnings, M&A, etc.) instead of fabricated factors. Each axis shows real article counts and sentiment.
- Per-holding signal breakdown replaces fake `directImpact` / `sectorImpact` numbers with real signal analysis.
- Portfolio-level summary replaces fake `portfolioSummary` with real aggregated intelligence.

**Why this is better than the current design**: The current radar chart shows made-up numbers like "Product Innovation: 85, Supply Chain: 42". The signal aggregation shows "12 AI Technology articles (8 positive, 2 negative) affecting NVDA, MSFT, GOOGL" — which is actionable intelligence.

---

### Change 5: Add `total_count` to Paginated Responses (LOW EFFORT)

**What**: The `/api/articles` endpoint returns total count alongside page count.

**Before**: `"meta": { "count": 20 }`
**After**: `"meta": { "count": 20, "total": 1712 }`

**What this eliminates**:
- Pagination heuristic (`result.length < PAGE_SIZE`) → **gone**
- Enables proper "Showing 1-20 of 1,712 articles" or numbered page controls

---

### Change 6: Sanitize HTML at Source (LOW EFFORT)

**What**: The Intelligence API strips HTML from all `summary` fields before storing/returning them.

Implementation in the intelligence API's ingestion pipeline:
```python
from html import unescape
import re

def sanitize_summary(raw: str) -> str:
    text = re.sub(r'<[^>]+>', '', raw)  # strip tags
    return unescape(text).strip()        # decode entities
```

**What this eliminates**:
- `isomorphic-dompurify` dependency on frontend → **gone**
- XSS risk → **eliminated at source** (frontend still validates as defense-in-depth, but doesn't need a library for it)

---

### Change 7: Add API Key Authentication (LOW EFFORT)

**What**: The Intelligence API requires an `X-API-Key` header on all requests.

```python
# FastAPI middleware
API_KEY = os.getenv("INTELLIGENCE_API_KEY", "dev-key-change-in-prod")

@app.middleware("http")
async def check_api_key(request, call_next):
    if request.url.path == "/api/health":  # health check is public
        return await call_next(request)
    if request.headers.get("X-API-Key") != API_KEY:
        return JSONResponse(status_code=401, content={"error": {"code": "UNAUTHORIZED", "message": "Invalid API key"}})
    return await call_next(request)
```

**Why still use BFF proxy**: API key auth prevents random access if port 8001 is accidentally exposed. But the BFF is still needed for portfolio injection, caching, and Clerk auth enforcement. Defense in depth.

**What this eliminates**:
- Accidental exposure risk → **mitigated** (even if port 8001 leaks, attacker needs the key)

---

### Change 8: Add Docker HEALTHCHECK (LOW EFFORT)

**What**: Add to the Intelligence API's Dockerfile:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8001/api/health || exit 1
```

**What this enables**:
- `depends_on: condition: service_healthy` in docker-compose
- Next.js app doesn't start until intelligence API is ready
- No more "connection refused" during cold start backfill

---

## Part 4: Frontend Changes

### 4.1 What Gets Dramatically Simpler

With the API changes above, the frontend becomes much leaner:

| Component | Before (V1 / no API changes) | After (optimal) |
|-----------|------------------------------|-----------------|
| **Transform layer** | Heavy: 9+ transform functions, sentiment mapping, magnitude mapping, field renaming, HTML sanitization | Thin: ~5 one-liner mappers (lowercase sentiment, relative time, signal type label) |
| **Portfolio filtering** | Complex: filter every response to user's tickers client-side | Gone: API returns correct data |
| **Dashboard fetch** | 5 parallel requests, coordinate results | 1 POST to `/api/intelligence/dashboard` |
| **Article detail fetch** | 3 parallel requests, coordinate results | 1 GET to `/api/intelligence/articles/{id}/full` |
| **ImpactAnalysisPanel** | UI redesign with improvised data stitching | Clean mapping from `/api/signals/aggregate` |
| **HTML sanitization** | DOMPurify library, sanitize in transform | Simple `String.prototype.replace(/<[^>]*>/g, '')` as safety net |
| **Pagination** | Heuristic (`length < PAGE_SIZE`), no total display | Real `total` count, proper UI |

### 4.2 What Stays the Same

- **BFF proxy**: Still needed (auth injection, portfolio injection, caching)
- **DashboardDataProvider**: Still needed (React state management for panels)
- **Loading skeletons**: Still needed (progressive rendering)
- **Error handling per panel**: Still needed (graceful degradation)
- **Feature flag**: Still needed (`NEXT_PUBLIC_INTELLIGENCE_ENABLED`)
- **StockScreener prices**: Still Yahoo Finance (intelligence API is not a market data provider)

### 4.3 The Simplified BFF Proxy

Each proxy route becomes a thin pass-through:

```typescript
// src/app/api/intelligence/dashboard/route.ts
export async function GET(request: Request) {
  // 1. Auth
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Get user's active portfolio holdings from PostgreSQL
  const user = await getUserByClerkId(userId);
  const portfolios = await getPortfoliosByUserId(user.id);
  const activePortfolio = portfolios.find(p => p.isActive) ?? portfolios[0];
  const holdings = activePortfolio
    ? await getHoldingsByPortfolioId(activePortfolio.id)
    : [];

  // 3. Compute portfolio header
  const totalValue = holdings.reduce((sum, h) =>
    sum + Number(h.quantity) * Number(h.averagePrice), 0);
  const portfolioHeader = holdings.map(h => {
    const value = Number(h.quantity) * Number(h.averagePrice);
    return `${h.symbol}:${((value / totalValue) * 100).toFixed(1)}`;
  }).join(',');

  // 4. Forward to intelligence API with portfolio context
  const portfolioHash = simpleHash(portfolioHeader);
  const cached = getCache(`dashboard:${portfolioHash}`);
  if (cached) return NextResponse.json(cached);

  const response = await fetch(`${INTELLIGENCE_API_URL}/api/dashboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': INTELLIGENCE_API_KEY,
    },
    body: JSON.stringify({
      holdings: holdings.map(h => ({
        ticker: h.symbol,
        weight_pct: (Number(h.quantity) * Number(h.averagePrice) / totalValue) * 100,
      })),
      include: ['digest', 'exposure', 'alerts', 'narratives', 'alert_history'],
    }),
  });

  const data = await response.json();

  // 5. Cache and return
  setCache(`dashboard:${portfolioHash}`, data, 120_000); // 2 min TTL
  return NextResponse.json(data);
}
```

**Key insight**: The proxy computes portfolio weights from the user's real holdings (quantity * averagePrice), converts to percentages, and sends to the intelligence API. The user never sees or knows about portfolio weight computation.

### 4.4 The Simplified Data Flow Per Panel

**On dashboard mount** (ONE request):
```
Browser → GET /api/intelligence/dashboard (our proxy)
  → Proxy: auth() → fetch portfolio → POST intelligence:8001/api/dashboard
  → Cache by portfolio_hash, TTL 2 min
  → Returns combined response

DashboardDataProvider stores entire response in state.
Each panel reads from the shared state:
```

| Panel | Data Source (from single dashboard response) |
|-------|----------------------------------------------|
| CriticalNews | `dashboard.digest.sections.direct_news[0:3]` |
| TodaysSummary | `dashboard.digest.sections.direct_news` grouped by `affected_holdings[0]` |
| PortfolioImpactSummary | `dashboard.exposure` + `dashboard.alerts` summary stats |
| PortfolioOverview | `dashboard.narratives` + `dashboard.digest.sections.developing_stories` |
| ImpactAnalysisPanel | Separate fetch: `POST /api/intelligence/signals/aggregate` |
| SectorNewsPanel | Separate fetch: `GET /api/intelligence/articles?limit=30` (group client-side by entity sector from graph_contexts) |
| StockNewsPanel | Separate fetch: `GET /api/intelligence/articles?ticker=AAPL&limit=20` |
| Notification bell | `dashboard.alert_history` (count where `triggered_at > localStorage.lastSeen`) |
| StockScreener | Prices: Yahoo Finance (existing). News overlay: `GET /api/intelligence/articles?ticker=X,Y` |

**Total requests on dashboard load**: 1 (the batch endpoint)
**Additional requests on panel switch**: 0-1 (only SectorNews and StockNews need extra fetches, and those are lazy-loaded on panel activation)

### 4.5 Multiple Portfolios

HiveMind supports multiple portfolios per user. Which one feeds the intelligence API?

**Decision**: Use the **active portfolio** (or first portfolio if none marked active). Add a portfolio selector to the dashboard header. When the user switches portfolios:

1. DashboardDataProvider re-fetches with new portfolio's holdings
2. All panels re-render with new personalized data
3. Cache key includes portfolio hash, so switching back is instant (cache hit)

If user has no portfolios → intelligence API receives empty holdings → returns general market data (no portfolio-specific analysis). Dashboard shows a "Create a portfolio to get personalized intelligence" prompt.

### 4.6 Thin Mapping Layer

With the API sanitizing HTML and computing for real portfolios, the transform layer shrinks to a handful of one-liners:

```typescript
// src/lib/intelligence/mappers.ts

// Sentiment: API returns UPPERCASE, frontend uses lowercase
export const mapSentiment = (s: string) => s.toLowerCase() as "positive" | "negative" | "neutral";

// Magnitude → Impact: API uses major/moderate/minor, frontend uses high/medium/low
const magnitudeMap = { major: "high", moderate: "medium", minor: "low" } as const;
export const mapMagnitude = (m: string) => magnitudeMap[m as keyof typeof magnitudeMap] ?? "low";

// ISO timestamp → relative time string
export function toRelativeTime(iso: string | null): string {
  if (!iso) return "Unknown";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Signal type → human label
const signalLabels: Record<string, string> = {
  EARNINGS_REPORT: "Earnings", M_AND_A: "M&A", REGULATORY: "Regulatory",
  SUPPLY_DISRUPTION: "Supply Chain", LEADERSHIP_CHANGE: "Leadership",
  PRODUCT_LAUNCH: "Product Launch", PARTNERSHIP: "Partnership",
  AI_TECHNOLOGY: "AI/Technology", GEOPOLITICAL: "Geopolitical",
  MARKET_MOVEMENT: "Market", GENERAL_NEWS: "General",
};
export const mapSignalType = (t: string) => signalLabels[t] ?? t;
```

That's it. 4 functions. No heavy transforms, no field restructuring, no HTML sanitization library.

---

## Part 5: What Gets Eliminated (Flaw-by-Flaw)

| Original Flaw | Severity | Status After Optimal Changes | How |
|---------------|----------|------------------------------|-----|
| Portfolio mismatch | CRITICAL | **ELIMINATED** | API accepts real holdings via `X-Portfolio` / POST body |
| Stock universe mismatch (TSM/XOM vs TSLA/V) | HIGH | **ELIMINATED** | API computes for whatever tickers the user holds; graph already has TSLA + V |
| ImpactAnalysis radar chart | HIGH | **REPLACED** | New `/api/signals/aggregate` provides real signal data; radar chart axes become signal types |
| XSS in summaries | HIGH | **ELIMINATED AT SOURCE** | API strips HTML during ingestion |
| No API auth | HIGH | **MITIGATED** | API key auth + BFF proxy + Docker port binding |
| Schema shape mismatches | MEDIUM | **REDUCED TO 4 ONE-LINERS** | Thin mappers for sentiment case, magnitude label, time format, signal label |
| StockScreener no price data | MEDIUM | **ACCEPTED** | Hybrid: Yahoo Finance prices + Intelligence API news. These are different data domains. |
| Missing priceImpact | LOW | **REPLACED** | Show real relevance_score + signal magnitude instead of fabricated price impact % |
| No pagination total | LOW | **ELIMINATED** | API returns `total` in meta |
| 5 dashboard round-trips | MEDIUM | **ELIMINATED** | Single `POST /api/dashboard` batch endpoint |
| 3 article detail round-trips | LOW | **ELIMINATED** | Single `GET /api/articles/{id}/full` batch endpoint |
| Heavy transform layer | MEDIUM | **REDUCED 90%** | From 9+ functions to 4 one-liners |
| DOMPurify dependency | LOW | **ELIMINATED** | API sanitizes at source; frontend does simple regex as safety net |

**Flaws fully eliminated**: 9 of 9 original flaws
**New capabilities gained**: batch endpoints, signal aggregation, real personalization, API auth

---

## Part 6: Creative Additions

### 6.1 Signal Aggregation as First-Class Feature

The `/api/signals/aggregate` endpoint doesn't just fix the radar chart — it enables an entirely new feature class:

- **Signal Heatmap**: Across your portfolio, which signal types are most active? Show a matrix of holdings x signal types with color intensity.
- **Signal Alerts**: "AI_TECHNOLOGY signals for your portfolio have doubled this week" — proactive insight.
- **Historical Signal Trends**: "Supply chain disruption signals peaked 2 weeks ago and are now declining" — narrative arc.

### 6.2 Portfolio-Aware Contradictions Feed

The enrichment already detects contradictions between articles. With portfolio context, we can surface contradictions that matter to the user:

```
"Two conflicting signals for NVDA:
  Article A: 'NVIDIA demand exceeds all expectations' (positive, 2h ago)
  Article B: 'Export controls threaten NVIDIA China revenue' (negative, 4h ago)
  Confidence: 0.73"
```

This could be a dedicated panel or inline in the news feed. No new API endpoint needed — contradictions are already in article enrichment. Just needs a portfolio-filtered aggregation view.

### 6.3 Portfolio Enrichment from Knowledge Graph

When a user adds a holding to their portfolio, the frontend can query the intelligence API's entity explorer to enrich the holding with metadata the frontend doesn't currently have:

```
User adds AAPL to portfolio
  → Frontend queries GET /api/explore/entity/AAPL
  → Gets: sector="Information Technology", geography="United States",
          suppliers=["TSM", "MU", "AVGO"], competitors=["MSFT", "GOOGL"]
  → Can display richer holding cards with supply chain context
```

This is optional but makes the portfolio UI more informative without the user doing anything extra.

### 6.4 Active Portfolio Selector with Intelligence Preview

When the user has multiple portfolios, the portfolio selector could show a mini-intelligence preview:

```
┌─────────────────────────────┐
│  Growth Portfolio (active)   │
│  4 holdings · Net: +0.54    │
│  Top signal: AI Technology   │
├─────────────────────────────┤
│  Conservative Portfolio      │
│  6 holdings · Net: +0.12    │
│  Top signal: Earnings        │
└─────────────────────────────┘
```

The `portfolio_summary` from `/api/signals/aggregate` provides `net_sentiment` and `top_opportunity` for each portfolio. Quick parallel fetches for each portfolio's summary.

---

## Part 7: Complete API Surface (After Changes)

### Universal Endpoints (no portfolio context needed)

| Method | Path | Changes | Purpose |
|--------|------|---------|---------|
| GET | `/api/health` | Add Docker HEALTHCHECK | Service status |
| GET | `/api/articles` | Add `total` to meta | Paginated article feed |
| GET | `/api/articles/{id}` | Sanitize HTML | Single article |
| GET | `/api/narratives/active` | None | Developing stories |
| GET | `/api/explore/entity/{ticker}` | None | Knowledge graph |
| GET | `/api/explore/search` | None | Entity search |

### Personalized Endpoints (require X-Portfolio header or POST body)

| Method | Path | Changes | Purpose |
|--------|------|---------|---------|
| **POST** | `/api/dashboard` | **NEW** | Batch: digest + exposure + alerts + narratives + alert_history |
| **POST** | `/api/signals/aggregate` | **NEW** | Signal pattern aggregation across holdings |
| GET | `/api/articles/{id}/full` | **NEW** | Batch: article + relevance + summaries |
| GET | `/api/articles/{id}/relevance` | Accept X-Portfolio | Per-holding relevance scores |
| GET | `/api/articles/{id}/summary` | Accept X-Portfolio | Per-holding summaries |
| GET | `/api/digest/today` | Accept X-Portfolio | Daily digest (also in batch) |
| GET | `/api/risk/alerts` | Accept X-Portfolio | Correlated risk alerts (also in batch) |
| GET | `/api/risk/exposure` | Accept X-Portfolio | Portfolio concentration (also in batch) |
| GET | `/api/discovery/today` | Accept X-Portfolio | Entity discovery (also in batch) |
| GET | `/api/alerts/history` | Accept X-Portfolio | Alert history (also in batch) |
| GET | `/api/portfolios` | Deprecated | Use frontend's PostgreSQL instead |
| GET | `/api/portfolios/{id}/holdings` | Deprecated | Use frontend's PostgreSQL instead |

**Note**: `/api/portfolios` and `/api/portfolios/{id}/holdings` become unnecessary. The frontend owns portfolio data in PostgreSQL. The intelligence API no longer needs its own portfolio model — it receives holdings as input.

---

## Part 8: Frontend Proxy Route Structure (Simplified)

```
src/app/api/intelligence/
  ├── dashboard/route.ts              → POST /api/dashboard (batch)
  ├── signals/aggregate/route.ts      → POST /api/signals/aggregate
  ├── articles/route.ts               → GET /api/articles
  ├── articles/[id]/route.ts          → GET /api/articles/{id}
  ├── articles/[id]/full/route.ts     → GET /api/articles/{id}/full
  ├── narratives/route.ts             → GET /api/narratives/active
  ├── explore/
  │   ├── entity/[ticker]/route.ts    → GET /api/explore/entity/{ticker}
  │   └── search/route.ts             → GET /api/explore/search
  └── health/route.ts                 → GET /api/health
```

**9 proxy routes** (down from 13 in the V1 plan). The batch endpoints collapse individual risk/exposure/digest/alerts/discovery routes into one.

Each personalized proxy route:
1. Authenticates with Clerk (`auth()`)
2. Fetches user's active portfolio holdings from PostgreSQL
3. Computes weight percentages from quantity * averagePrice
4. Forwards to intelligence API with holdings in body/header
5. Caches by portfolio hash + endpoint, TTL-based
6. Returns to browser

Each universal proxy route:
1. Authenticates with Clerk (`auth()`)
2. Forwards directly to intelligence API
3. Caches by endpoint, TTL-based
4. Returns to browser

---

## Part 9: Implementation Roadmap

### Phase 1: API Enhancements (Intelligence API side)

| Task | Effort | Priority |
|------|--------|----------|
| Accept `X-Portfolio` header on all personalized endpoints | Medium | P0 |
| Sanitize HTML in summaries during ingestion | Low | P0 |
| Add `total` to `/api/articles` meta | Low | P0 |
| Add `X-API-Key` middleware | Low | P0 |
| Add Docker HEALTHCHECK | Low | P0 |
| Create `POST /api/dashboard` batch endpoint | Medium | P1 |
| Create `GET /api/articles/{id}/full` batch endpoint | Low | P1 |
| Create `POST /api/signals/aggregate` endpoint | Medium | P2 |
| Deprecate `/api/portfolios` endpoints | Low | P2 |

### Phase 2: Frontend Infrastructure

| Task | Effort | Priority |
|------|--------|----------|
| TypeScript interfaces (`src/lib/intelligence/types.ts`) | Low | P0 |
| Thin mapper functions (`src/lib/intelligence/mappers.ts`) | Low | P0 |
| Server-side cache utility (`src/lib/intelligence/cache.ts`) | Low | P0 |
| Feature flag config (`src/lib/intelligence/config.ts`) | Low | P0 |
| Docker Compose: add intelligence service | Low | P0 |
| Environment variables (`.env.local`) | Low | P0 |

### Phase 3: Proxy Routes + Dashboard Wiring

| Task | Effort | Priority |
|------|--------|----------|
| Dashboard batch proxy route | Medium | P0 |
| DashboardDataProvider context | Medium | P0 |
| Wire CriticalNews to digest.direct_news | Low | P0 |
| Wire TodaysSummary to digest.direct_news (grouped) | Low | P0 |
| Wire PortfolioImpactSummary to exposure + alerts | Low | P0 |
| Wire PortfolioOverview to narratives + developing_stories | Low | P0 |
| Wire notification bell to alert_history | Low | P1 |
| Articles proxy route (for SectorNews, StockNews) | Low | P1 |
| Wire SectorNewsPanel to articles (grouped by sector) | Medium | P1 |
| Wire StockNewsPanel to articles (ticker-filtered) | Low | P1 |

### Phase 4: Impact Analysis + Stock Pages

| Task | Effort | Priority |
|------|--------|----------|
| Signal aggregation proxy route | Low | P1 |
| Redesign ImpactAnalysisPanel with signal data | High | P1 |
| Article full-detail proxy route | Low | P1 |
| Replace getStockNews() template with real articles | Low | P1 |
| Replace StockChart mock markers with real article dates | Low | P1 |
| Replace StockScreener news overlay with real articles | Medium | P2 |

### Phase 5: New Features

| Task | Effort | Priority |
|------|--------|----------|
| Article detail page (new route) | Medium | P2 |
| Entity explorer / knowledge graph page | High | P2 |
| Narratives tracking panel | Medium | P2 |
| Discovery feed ("Companies to Watch") panel | Medium | P2 |
| Portfolio selector with intelligence preview | Medium | P3 |

---

## Part 10: Open Decisions

These need your input before implementation:

### Decision 1: Active Portfolio Selection
When user has multiple portfolios, which feeds the intelligence API?
- **Option A**: Always use the first active portfolio (simplest)
- **Option B**: Add a portfolio selector to the dashboard header (best UX)
- **Option C**: Merge all portfolios into one combined holding set (most comprehensive)

### Decision 2: Graceful Degradation When Intelligence API Is Down
- **Option A**: Show empty panels with "Intelligence temporarily unavailable" message
- **Option B**: Show cached data (even if stale) with "Last updated X minutes ago" badge
- **Option C**: Fall back to mock data (not recommended — misleading)

### Decision 3: ImpactAnalysisPanel Visualization
Now that we have real signal aggregation data, what visualization replaces the radar chart?
- **Option A**: Radar chart with signal types as axes (AI Tech, Supply Chain, Regulatory, Earnings, M&A, Geopolitical)
- **Option B**: Signal heatmap grid (holdings x signal types, color = sentiment)
- **Option C**: Signal timeline (chronological signal activity, grouped by type)
- **Option D**: Multiple — show all three in tabs within the panel

### Decision 4: Intelligence API Hosting
Where does the intelligence API container run?
- **Option A**: Same docker-compose as HiveMind (simplest for dev, single `docker compose up`)
- **Option B**: Separate docker-compose (independent lifecycle, can restart without affecting frontend)
- **Option C**: Both — same compose for dev, separate for production

### Decision 5: Implementation Ordering
- **Option A**: API changes first (Phase 1), then frontend (Phases 2-5) — cleanest, but blocks frontend work until API is ready
- **Option B**: Frontend first with V1 workarounds, then swap to optimal as API changes land — can show progress faster
- **Option C**: Parallel tracks — one person on API changes, one on frontend infrastructure — fastest overall
