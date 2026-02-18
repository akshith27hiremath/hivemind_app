# Intelligence API Modification Spec

**Context**: This document specifies changes required to the Hivemind Intelligence API (FastAPI/Python/SQLite) so it can integrate with the HiveMind frontend (Next.js). The frontend will send the user's real portfolio holdings with each personalized request instead of using the hardcoded demo portfolio.

**Priority**: Changes are marked P0 (must-have for integration), P1 (high value), P2 (enables advanced features).

---

## Current State (for reference)

- **Framework**: FastAPI, Python
- **Database**: SQLite
- **Auth**: None
- **Base URL**: `http://localhost:8001`
- **All endpoints**: GET only, read-only, no mutations
- **Portfolio**: Hardcoded demo portfolio (`pf_demo_growth`) with 10 holdings at fixed weights
- **Scraper**: Polls external source every 5 min, ingests ~2-4 articles per poll
- **Knowledge graph**: 27 companies, ~55 relationships (supply chain + competitors)

---

## Change 1: Accept Portfolio Holdings on Personalized Endpoints [P0]

### What

All portfolio-dependent endpoints must accept an `X-Portfolio` HTTP header containing the requesting user's actual holdings and weights. When present, the API must compute relevance, risk, exposure, discovery, digest, summaries, and alerts against **those holdings** instead of the hardcoded demo portfolio.

### Header Format

```
X-Portfolio: AAPL:25.0,TSLA:20.0,MSFT:15.0,GOOGL:12.0,NVDA:10.0,META:8.0,JPM:5.0,V:3.0,JNJ:2.0
```

Format: `TICKER:WEIGHT_PCT` pairs, comma-separated. Weight percentages sum to ~100. Max 10 entries.

### Parsing Logic

```python
def parse_portfolio_header(header: str | None) -> list[dict] | None:
    """Parse X-Portfolio header into holdings list.

    Returns None if header is missing (use demo portfolio).
    Returns list of {"ticker": str, "weight_pct": float} if present.
    """
    if not header:
        return None

    holdings = []
    for entry in header.split(","):
        entry = entry.strip()
        if ":" not in entry:
            continue
        ticker, weight = entry.split(":", 1)
        holdings.append({
            "ticker": ticker.strip().upper(),
            "weight_pct": float(weight.strip())
        })
    return holdings if holdings else None
```

### Behavior

- If `X-Portfolio` header is **present and valid** → compute all analysis against those holdings with those weights
- If `X-Portfolio` header is **absent** → fall back to the hardcoded demo portfolio (backward compatible)
- If `X-Portfolio` header is **malformed** → return 400 error:
  ```json
  { "error": { "code": "INVALID_PORTFOLIO", "message": "Malformed X-Portfolio header. Expected format: TICKER:WEIGHT,TICKER:WEIGHT" } }
  ```

### Affected Endpoints

Every endpoint below must read `X-Portfolio` and use it for portfolio-dependent computations:

| Endpoint | What Changes |
|----------|-------------|
| `GET /api/articles/{id}/relevance` | Compute `per_holding_relevance` against provided holdings. Only return relevance entries for tickers in the provided portfolio. |
| `GET /api/articles/{id}/summary` | Generate summaries only for provided holdings (tier 1-5). Use provided weights in summary text (e.g., "15% of portfolio" not "20%"). |
| `GET /api/digest/today` | Filter all 6 sections to provided holdings. `affected_holdings` in each item should only contain tickers from the provided portfolio. Relevance scores recomputed against provided weights. |
| `GET /api/risk/alerts` | Compute `combined_portfolio_exposure_pct` from provided weights. `affected_holdings` filtered to provided tickers. Severity recalculated based on actual exposure. |
| `GET /api/risk/exposure` | Compute `by_sector`, `by_geography`, and `concentration_risks` from provided holdings and weights. This must NOT return the demo portfolio's static breakdown. |
| `GET /api/discovery/today` | Filter `connected_holdings` to provided tickers. Recompute `discovery_score` based on actual portfolio connections. |
| `GET /api/alerts/history` | Filter `matched_holdings` to provided tickers. Only return alerts where at least one matched holding is in the provided portfolio. |

### Unaffected Endpoints (no changes needed)

These endpoints are NOT portfolio-dependent and should ignore `X-Portfolio`:

- `GET /api/health`
- `GET /api/articles` (article feed is universal)
- `GET /api/articles/{id}` (article content is universal)
- `GET /api/narratives/active` (narratives are per-ticker, not per-portfolio)
- `GET /api/explore/entity/{ticker}` (graph is universal)
- `GET /api/explore/search` (search is universal)

### Implementation Guidance

The API already has computation logic for relevance, exposure, risk, etc. Currently it reads holdings from the hardcoded `pf_demo_growth` portfolio. The change is to parameterize that source:

```python
# Before (hardcoded)
def get_portfolio_holdings():
    return db.query("SELECT * FROM portfolio_holdings WHERE portfolio_id = 'pf_demo_growth'")

# After (parameterized)
def get_portfolio_holdings(request: Request):
    custom = parse_portfolio_header(request.headers.get("X-Portfolio"))
    if custom:
        return custom  # List of {"ticker": str, "weight_pct": float}
    return db.query("SELECT * FROM portfolio_holdings WHERE portfolio_id = 'pf_demo_growth'")
```

The knowledge graph already includes all tickers the frontend might send (AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, JPM, V, JNJ are all in the 27-entity graph). No graph changes needed.

### Test Cases

```bash
# With custom portfolio (2 holdings)
curl -H "X-Portfolio: NVDA:60.0,AAPL:40.0" http://localhost:8001/api/risk/exposure
# Expected: by_sector shows only IT (100%), by_geography shows only US (100%)
# concentration_risks should flag 100% IT sector concentration

# With empty header (fallback to demo)
curl http://localhost:8001/api/risk/exposure
# Expected: Same as current behavior (demo portfolio breakdown)

# With portfolio including TSLA and V (stocks NOT in demo portfolio)
curl -H "X-Portfolio: TSLA:50.0,V:50.0" http://localhost:8001/api/digest/today
# Expected: direct_news filtered to articles mentioning TSLA or V
# affected_holdings should only contain TSLA and/or V

# Malformed header
curl -H "X-Portfolio: invalid" http://localhost:8001/api/risk/exposure
# Expected: 400 with INVALID_PORTFOLIO error
```

---

## Change 2: Batch Dashboard Endpoint [P1]

### What

New `POST /api/dashboard` endpoint that returns everything the frontend dashboard needs in a single request. This replaces 5 separate API calls (digest, exposure, alerts, narratives, alert_history).

### Request

```
POST /api/dashboard
Content-Type: application/json
```

```json
{
  "holdings": [
    { "ticker": "AAPL", "weight_pct": 25.0 },
    { "ticker": "TSLA", "weight_pct": 20.0 },
    { "ticker": "MSFT", "weight_pct": 15.0 },
    { "ticker": "NVDA", "weight_pct": 10.0 },
    { "ticker": "GOOGL", "weight_pct": 10.0 },
    { "ticker": "META", "weight_pct": 8.0 },
    { "ticker": "JPM", "weight_pct": 5.0 },
    { "ticker": "V", "weight_pct": 4.0 },
    { "ticker": "JNJ", "weight_pct": 3.0 }
  ],
  "include": ["digest", "exposure", "alerts", "narratives", "alert_history"]
}
```

**Fields**:
- `holdings` (required): Array of `{ ticker: string, weight_pct: number }`. Same data as `X-Portfolio` header but in structured JSON. Weights should sum to ~100.
- `include` (optional): Array of section names to include. If omitted, include all sections. Valid values: `"digest"`, `"exposure"`, `"alerts"`, `"narratives"`, `"alert_history"`.

### Response

```json
{
  "data": {
    "digest": {
      "digest_id": "dg_2026-02-11",
      "generated_at": "2026-02-11T05:22:45Z",
      "sections": {
        "direct_news": [
          {
            "article_id": 12345,
            "headline": "NVIDIA reports record quarterly revenue",
            "relevance_score": 0.86,
            "affected_holdings": ["NVDA", "MSFT"],
            "summary": "NVIDIA Corp posted record revenue..."
          }
        ],
        "related_news": [...],
        "risk_alerts": [...],
        "developing_stories": [...],
        "discovery": [...],
        "sector_context": [...]
      }
    },
    "exposure": {
      "computed_at": "2026-02-11T05:24:23Z",
      "by_sector": {
        "Information Technology": {
          "exposure_pct": 0.50,
          "holdings": ["AAPL", "MSFT", "NVDA"],
          "trend": "stable"
        }
      },
      "by_geography": {
        "United States": { "exposure_pct": 1.0 }
      },
      "concentration_risks": [...]
    },
    "alerts": [
      {
        "alert_id": "risk_28087_INTC",
        "correlation_type": "shared_supplier",
        "trigger_article_id": 28087,
        "trigger_headline": "...",
        "affected_holdings": ["AAPL", "NVDA"],
        "combined_portfolio_exposure_pct": 0.35,
        "severity_tier": "critical",
        "cause_description": "...",
        "explanation": "..."
      }
    ],
    "narratives": [
      {
        "narrative_id": "narr_03b14741",
        "title": "GOOGL AI Developments",
        "primary_ticker": "GOOGL",
        "signal_type": "AI_TECHNOLOGY",
        "article_count": 5,
        "first_seen": "2026-02-11T05:10:30Z",
        "last_updated": "2026-02-11T05:22:00Z",
        "status": "developing",
        "sentiment_trajectory": "improving"
      }
    ],
    "alert_history": [
      {
        "alert_id": "alt_1770786695_23aada",
        "rule_id": "rule_1",
        "trigger_type": "direct_mention",
        "triggered_at": "2026-02-11T05:11:35Z",
        "article_id": 33155,
        "headline": "...",
        "matched_holdings": ["TSLA"],
        "severity": "high",
        "summary": "Direct mention of TSLA"
      }
    ]
  },
  "meta": {
    "portfolio_hash": "a1b2c3d4",
    "holdings_count": 9,
    "computed_at": "2026-02-11T05:24:00Z",
    "sections_included": ["digest", "exposure", "alerts", "narratives", "alert_history"]
  }
}
```

### Implementation Guidance

This endpoint internally calls the same logic as the individual endpoints but batches the SQLite queries:

```python
@app.post("/api/dashboard")
async def get_dashboard(request: DashboardRequest):
    holdings = request.holdings
    include = request.include or ["digest", "exposure", "alerts", "narratives", "alert_history"]

    result = {}
    if "digest" in include:
        result["digest"] = compute_digest(holdings)
    if "exposure" in include:
        result["exposure"] = compute_exposure(holdings)
    if "alerts" in include:
        result["alerts"] = compute_risk_alerts(holdings)
    if "narratives" in include:
        result["narratives"] = get_active_narratives()  # not portfolio-dependent
    if "alert_history" in include:
        result["alert_history"] = get_alert_history(holdings, limit=20)

    return {"data": result, "meta": {...}}
```

### Error Cases

- Missing `holdings` → 400: `{"error": {"code": "MISSING_HOLDINGS", "message": "holdings array is required"}}`
- Empty `holdings` array → Return general market data (no portfolio filtering)
- Invalid `include` value → 400: `{"error": {"code": "INVALID_INCLUDE", "message": "Unknown section: xyz. Valid: digest, exposure, alerts, narratives, alert_history"}}`

---

## Change 3: Batch Article Detail Endpoint [P1]

### What

New `GET /api/articles/{id}/full` endpoint that returns article content + relevance scores + per-holding summaries in a single response.

### Request

```
GET /api/articles/12345/full
X-Portfolio: AAPL:25.0,NVDA:20.0,MSFT:15.0
```

### Response

```json
{
  "data": {
    "article": {
      "id": 12345,
      "url": "https://...",
      "title": "NVIDIA reports record quarterly revenue",
      "summary": "Clean text summary without HTML...",
      "source": "Reuters Business",
      "published_at": "2026-02-11T02:23:17Z",
      "fetched_at": "2026-02-11T04:03:32Z",
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
      "per_holding_relevance": [
        {
          "holding_ticker": "NVDA",
          "relevance_tier": 1,
          "relevance_score": 0.86,
          "relationship_path": "direct",
          "explanation": "Article directly discusses NVIDIA Corp."
        },
        {
          "holding_ticker": "MSFT",
          "relevance_tier": 3,
          "relevance_score": 0.61,
          "relationship_path": "NVDA supplies MSFT",
          "explanation": "Connected via supply chain"
        }
      ]
    },
    "summaries": [
      {
        "holding_ticker": "NVDA",
        "summary": "NVIDIA Corp. developments affect your NVIDIA position (20% of portfolio)...",
        "action_context": "Monitor for follow-up reports.",
        "confidence": 0.88
      },
      {
        "holding_ticker": "MSFT",
        "summary": "News about NVIDIA impacts your Microsoft position (15%) through supply chain...",
        "action_context": "Track competitor responses.",
        "confidence": 0.89
      }
    ]
  }
}
```

### Behavior

- Reads `X-Portfolio` header for portfolio context
- If no `X-Portfolio` → uses demo portfolio (backward compatible)
- Relevance and summaries computed for provided holdings only
- If article not found → 404 (same as existing `/api/articles/{id}`)

---

## Change 4: Signal Aggregation Endpoint [P2]

### What

New `POST /api/signals/aggregate` endpoint that aggregates signal patterns from recent articles, grouped by signal type and by holding. This enables the frontend to show real signal analysis instead of fabricated impact factors.

### Request

```
POST /api/signals/aggregate
Content-Type: application/json
```

```json
{
  "holdings": [
    { "ticker": "AAPL", "weight_pct": 25.0 },
    { "ticker": "NVDA", "weight_pct": 20.0 },
    { "ticker": "MSFT", "weight_pct": 15.0 }
  ],
  "days": 7
}
```

**Fields**:
- `holdings` (required): Same format as dashboard endpoint.
- `days` (optional, default 7): How many days back to aggregate. Valid range: 1-30.

### Response

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
        "latest_headline": "NVIDIA unveils next-gen AI accelerator at tech summit"
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
        "latest_headline": "TSMC warns of 3-month production delays"
      },
      "EARNINGS_REPORT": {
        "article_count": 8,
        "positive": 6,
        "negative": 1,
        "neutral": 1,
        "dominant_direction": "POSITIVE",
        "dominant_magnitude": "major",
        "affected_holdings": ["MSFT", "NVDA"],
        "trend": "stable",
        "latest_headline": "Microsoft cloud revenue surpasses expectations"
      }
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
      },
      "MSFT": {
        "total_articles": 11,
        "net_sentiment": 0.65,
        "dominant_signal": "EARNINGS_REPORT",
        "risk_signals": 2,
        "opportunity_signals": 7
      }
    },
    "portfolio_summary": {
      "total_articles_analyzed": 47,
      "net_sentiment": 0.54,
      "top_opportunity": "AI_TECHNOLOGY",
      "top_risk": "SUPPLY_DISRUPTION",
      "signal_diversity": 7
    }
  },
  "meta": {
    "days_analyzed": 7,
    "holdings_count": 3,
    "computed_at": "2026-02-11T05:24:00Z"
  }
}
```

### Implementation Guidance

```python
@app.post("/api/signals/aggregate")
async def aggregate_signals(request: SignalAggregateRequest):
    holdings = request.holdings
    days = request.days or 7
    tickers = [h["ticker"] for h in holdings]

    # 1. Get all articles from the last N days that mention any holding ticker
    cutoff = datetime.utcnow() - timedelta(days=days)
    articles = db.query(
        "SELECT * FROM articles WHERE created_at > ? AND EXISTS (SELECT 1 FROM article_tickers WHERE ...)",
        cutoff
    )

    # 2. For each article, look at enrichment.signals[]
    # Group by signal_type, count positive/negative/neutral directions
    by_signal_type = defaultdict(lambda: {"article_count": 0, "positive": 0, "negative": 0, "neutral": 0, ...})

    for article in articles:
        for signal in article.enrichment.signals:
            entry = by_signal_type[signal.signal_type]
            entry["article_count"] += 1
            entry[signal.direction.lower()] += 1
            # Track affected holdings (intersection of article.tickers and user's holdings)
            affected = set(article.tickers) & set(tickers)
            entry["affected_holdings"] = list(set(entry.get("affected_holdings", [])) | affected)

    # 3. Compute dominant direction, magnitude, trend for each signal type
    # 4. Compute per-holding breakdown
    # 5. Compute portfolio summary

    return {"data": {...}, "meta": {...}}
```

**Signal types to aggregate** (from existing enrichment schema):
`EARNINGS_REPORT`, `M_AND_A`, `REGULATORY`, `SUPPLY_DISRUPTION`, `LEADERSHIP_CHANGE`, `PRODUCT_LAUNCH`, `PARTNERSHIP`, `AI_TECHNOLOGY`, `GEOPOLITICAL`, `MARKET_MOVEMENT`, `GENERAL_NEWS`

**Trend computation**: Compare signal sentiment in first half vs second half of the time window:
- More positive in second half → `"improving"`
- More negative in second half → `"worsening"`
- Mixed → `"mixed"`
- Consistent → `"stable"`

**net_sentiment per holding**: `(opportunity_signals - risk_signals) / total_articles`, clamped to [-1, 1].

---

## Change 5: Add `total` to Paginated Responses [P0]

### What

The `/api/articles` endpoint must return the total article count alongside the page count in `meta`.

### Before

```json
{
  "data": [...],
  "meta": { "count": 20 }
}
```

### After

```json
{
  "data": [...],
  "meta": { "count": 20, "total": 1712 }
}
```

- `count`: Number of items in this response (unchanged)
- `total`: Total number of articles matching the filter (new)

### Implementation

```python
# Before
articles = db.query("SELECT * FROM articles WHERE ... LIMIT ? OFFSET ?", limit, offset)
return {"data": articles, "meta": {"count": len(articles)}}

# After
articles = db.query("SELECT * FROM articles WHERE ... LIMIT ? OFFSET ?", limit, offset)
total = db.query("SELECT COUNT(*) FROM articles WHERE ...")[0][0]
return {"data": articles, "meta": {"count": len(articles), "total": total}}
```

Apply the same logic for any endpoint that takes `limit`/`offset` parameters, specifically:
- `GET /api/articles` — add total
- `GET /api/alerts/history` — add total

---

## Change 6: Sanitize HTML in Summaries [P0]

### What

Strip HTML tags from all article `summary` fields during ingestion (before storing to SQLite), not at response time.

### Implementation

Add to the article ingestion pipeline:

```python
import re
from html import unescape

def sanitize_summary(raw: str | None) -> str:
    if not raw:
        return ""
    text = re.sub(r'<[^>]+>', '', raw)  # strip all HTML tags
    text = unescape(text)                # decode &amp; &lt; etc.
    return text.strip()

# During article ingestion:
article.summary = sanitize_summary(article.summary)
```

### Why

The API docs state summaries "may contain HTML from source." The frontend renders these in React components. Unsanitized HTML is an XSS vector. Sanitizing at source is the cleanest fix — every consumer gets clean text.

### Migration

Run a one-time migration to sanitize existing summaries in the database:

```python
articles = db.query("SELECT id, summary FROM articles")
for article in articles:
    clean = sanitize_summary(article.summary)
    if clean != article.summary:
        db.execute("UPDATE articles SET summary = ? WHERE id = ?", clean, article.id)
```

---

## Change 7: Add API Key Authentication [P0]

### What

Require an `X-API-Key` header on all requests (except health check).

### Implementation

```python
import os
from fastapi import Request
from fastapi.responses import JSONResponse

API_KEY = os.getenv("INTELLIGENCE_API_KEY", "hm-dev-key-change-in-prod")

@app.middleware("http")
async def check_api_key(request: Request, call_next):
    # Allow health check without auth
    if request.url.path == "/api/health":
        return await call_next(request)

    # Allow Swagger docs in dev
    if request.url.path in ("/docs", "/openapi.json", "/redoc"):
        return await call_next(request)

    provided_key = request.headers.get("X-API-Key")
    if provided_key != API_KEY:
        return JSONResponse(
            status_code=401,
            content={"error": {"code": "UNAUTHORIZED", "message": "Invalid or missing API key"}}
        )

    return await call_next(request)
```

### Environment Variable

Add to the service configuration:

```env
INTELLIGENCE_API_KEY=hm-dev-key-change-in-prod
```

The HiveMind frontend will send this key from its server-side proxy routes. The browser never sees the API key.

---

## Change 8: Add Docker HEALTHCHECK [P0]

### What

Add a HEALTHCHECK directive to the Dockerfile so Docker Compose can wait for the service to be ready.

### Implementation

Add to `Dockerfile`:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=60s \
  CMD curl -f http://localhost:8001/api/health || exit 1
```

The `--start-period=60s` accounts for the initial backfill (2-5 minutes of article ingestion on cold start). During this period, health check failures don't count toward the retry limit.

---

## Summary of All Changes

| # | Change | Priority | Effort | Breaking? |
|---|--------|----------|--------|-----------|
| 1 | Accept `X-Portfolio` header on personalized endpoints | P0 | Medium | No (backward compatible) |
| 2 | `POST /api/dashboard` batch endpoint | P1 | Medium | No (new endpoint) |
| 3 | `GET /api/articles/{id}/full` batch endpoint | P1 | Low | No (new endpoint) |
| 4 | `POST /api/signals/aggregate` endpoint | P2 | Medium | No (new endpoint) |
| 5 | Add `total` to paginated meta | P0 | Low | No (additive field) |
| 6 | Sanitize HTML in summaries | P0 | Low | No (content change, not schema) |
| 7 | Add `X-API-Key` middleware | P0 | Low | Yes (all requests need key) |
| 8 | Add Docker HEALTHCHECK | P0 | Low | No |

### Recommended Implementation Order

1. **First**: Changes 5, 6, 7, 8 (all P0, all low effort, independent of each other)
2. **Second**: Change 1 (P0, medium effort, core portfolio parameterization)
3. **Third**: Changes 2, 3 (P1, use Change 1's portfolio logic)
4. **Fourth**: Change 4 (P2, signal aggregation, most complex)

### Testing

After all changes, these should work:

```bash
# Health check (no auth needed)
curl http://localhost:8001/api/health

# Articles with total count (auth required)
curl -H "X-API-Key: hm-dev-key-change-in-prod" \
     "http://localhost:8001/api/articles?limit=5"
# meta should include "total": N

# Dashboard with custom portfolio
curl -X POST \
     -H "X-API-Key: hm-dev-key-change-in-prod" \
     -H "Content-Type: application/json" \
     -d '{"holdings": [{"ticker":"AAPL","weight_pct":50},{"ticker":"TSLA","weight_pct":50}], "include":["digest","exposure"]}' \
     http://localhost:8001/api/dashboard
# exposure should show sectors for AAPL + TSLA only

# Signal aggregation
curl -X POST \
     -H "X-API-Key: hm-dev-key-change-in-prod" \
     -H "Content-Type: application/json" \
     -d '{"holdings": [{"ticker":"NVDA","weight_pct":60},{"ticker":"AAPL","weight_pct":40}], "days":7}' \
     http://localhost:8001/api/signals/aggregate
# Should return signal breakdown for NVDA + AAPL

# Article full detail with custom portfolio
curl -H "X-API-Key: hm-dev-key-change-in-prod" \
     -H "X-Portfolio: NVDA:60.0,AAPL:40.0" \
     http://localhost:8001/api/articles/12345/full
# relevance + summaries computed for NVDA and AAPL only
```
