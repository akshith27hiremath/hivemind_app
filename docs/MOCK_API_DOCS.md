# Hivemind Mock Intelligence API v2

Complete reference for the Mock Intelligence Service. This API ingests real financial articles from a live scraper, generates realistic enrichment and processing data (zero LLM cost), and serves 8 output streams through FastAPI.

---

## Quick Start

```bash
# Start the service (Docker)
docker-compose up -d mock-intelligence

# Verify it's running
curl http://localhost:8001/api/health

# Authenticated request
curl -H "X-API-Key: hm-dev-key-change-in-prod" http://localhost:8001/api/articles?limit=5

# Custom portfolio request
curl -H "X-API-Key: hm-dev-key-change-in-prod" \
     -H "X-Portfolio: AAPL:30,GOOGL:25,TSLA:20,JPM:15,XOM:10" \
     http://localhost:8001/api/articles/12345/relevance
```

**Swagger UI**: http://localhost:8001/docs
**ReDoc**: http://localhost:8001/redoc

---

## Authentication

All endpoints except `/api/health`, `/docs`, `/openapi.json`, and `/redoc` require an API key.

| Header | Value |
|--------|-------|
| `X-API-Key` | `hm-dev-key-change-in-prod` |

Override via environment variable `INTELLIGENCE_API_KEY`.

**Unauthorized response (401):**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API key"
  }
}
```

---

## Custom Portfolio (X-Portfolio Header)

Most endpoints accept an optional `X-Portfolio` header to compute results against a custom portfolio instead of the built-in demo portfolio.

**Format**: `TICKER:WEIGHT_PCT,TICKER:WEIGHT_PCT,...`

Weights are in percentage points (not fractions). They don't need to sum to 100.

```
X-Portfolio: AAPL:30,GOOGL:25,TSLA:20,JPM:15,XOM:10
```

**Supported on**: `/api/articles/{id}/relevance`, `/api/articles/{id}/summary`, `/api/articles/{id}/full`, `/api/discovery/today`, `/api/risk/alerts`, `/api/risk/exposure`, `/api/digest/today`, `/api/alerts/history`

**Not needed on**: `POST /api/dashboard` and `POST /api/signals/aggregate` (these accept holdings in the request body instead).

When omitted, the default 10-holding demo portfolio is used.

---

## Response Envelope

All endpoints return a consistent envelope:

```json
{
  "data": { ... } or [ ... ],
  "meta": {
    "count": 10,
    "total": 2252
  }
}
```

- `count` is present when `data` is an array (number of items returned)
- `total` is present on paginated endpoints (total matching rows in DB)

**Error responses:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Article 999999 not found"
  }
}
```

| HTTP Status | Code | When |
|-------------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid `X-API-Key` |
| 400 | `MISSING_HOLDINGS` | POST body missing `holdings` array |
| 400 | `INVALID_INCLUDE` | Unknown section name in `include` |
| 404 | `NOT_FOUND` | Article or entity not found |
| 422 | (Pydantic) | Malformed request body |

---

## Docker Setup

### Option A: docker-compose (recommended)

The mock service is defined in `docker-compose.yml` as `mock-intelligence`:

```bash
docker-compose up -d mock-intelligence
```

Container name: `intelligence_api`, port: `8001`, network: `intelligence_network`.

### Connecting your frontend container

Your frontend must share the same Docker network:

```yaml
# your-frontend/docker-compose.yml
services:
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      HIVEMIND_API_URL: http://intelligence_api:8001
      HIVEMIND_API_KEY: hm-dev-key-change-in-prod
    networks:
      - intelligence_network

networks:
  intelligence_network:
    external: true
    name: intelligence_network
```

### Option B: Shared network manually

```bash
docker network create intelligence_network

docker run -d --name intelligence_api --network intelligence_network \
  -p 8001:8001 -v mock_data:/app/data hivemind-mock:latest

docker run -d --name my_frontend --network intelligence_network \
  -p 3000:3000 \
  -e HIVEMIND_API_URL=http://intelligence_api:8001 \
  -e HIVEMIND_API_KEY=hm-dev-key-change-in-prod \
  your-frontend-image
```

### Option C: Frontend on host machine (dev)

If your frontend runs directly on the host (e.g. `npm run dev`), use `http://localhost:8001`.

### Networking summary

| Caller | Base URL |
|--------|----------|
| Another Docker container on `intelligence_network` | `http://intelligence_api:8001` |
| Browser (client-side JS) | `http://localhost:8001` |
| Host machine (server-side) | `http://localhost:8001` |
| Frontend SSR / API routes (in Docker) | `http://intelligence_api:8001` |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SCRAPER_BASE` | `http://159.89.162.233:5000/api/v1` | Scraper API base URL |
| `SCRAPER_KEY` | `b44e4bbc5f2ed67406abd9102a210437c93628b9741e0259e06f20c0515ad4ad` | Scraper API key |
| `DB_DIR` | `/app/data` (Docker) or `.` (local) | SQLite database directory |
| `POLL_INTERVAL` | `300` | Seconds between scraper polls |
| `INTELLIGENCE_API_KEY` | `hm-dev-key-change-in-prod` | API key required for authenticated endpoints |

---

## Endpoints Reference

### 1. GET /api/health

Service status. **No authentication required.**

**Response:**
```json
{
  "data": {
    "status": "healthy",
    "articles_count": 2252,
    "last_poll": "2026-02-11T18:57:07Z",
    "watchlist_size": 27,
    "portfolio_holdings": 10,
    "timestamp": "2026-02-12T10:00:00Z"
  },
  "meta": {}
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Always `"healthy"` if responding |
| `articles_count` | integer | Total articles in database |
| `last_poll` | ISO string | Last time the scraper was polled |
| `watchlist_size` | integer | Tickers being tracked (27) |
| `portfolio_holdings` | integer | Default portfolio size (10) |

---

### 2. GET /api/articles

Paginated article feed with enrichment data. Most recent first.

**Headers:** `X-API-Key` (required)

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `ticker` | string | _(all)_ | Filter by ticker(s), comma-separated: `AAPL,MSFT` |
| `limit` | integer | 20 | Items per page (1-100) |
| `offset` | integer | 0 | Pagination offset |

**Response:**
```json
{
  "data": [
    {
      "id": 12428112,
      "url": "https://...",
      "title": "NVIDIA reports record quarterly revenue...",
      "summary": "NVIDIA Corp reported earnings that beat analyst expectations...",
      "source": "Reuters Business",
      "published_at": "2026-02-11T02:23:17",
      "fetched_at": "2026-02-11T04:03:32.510258",
      "classified_at": "2026-02-11T05:02:25.758567",
      "tickers": ["NVDA", "TSM"],
      "enrichment": {
        "entities": [...],
        "signals": [...],
        "graph_contexts": {...},
        "narrative": {...},
        "contradiction": null,
        "historical_patterns": [...]
      },
      "created_at": "2026-02-11 05:24:46"
    }
  ],
  "meta": { "count": 20, "total": 2252 }
}
```

`meta.total` gives the total matching count for pagination math (`total_pages = ceil(total / limit)`).

Article summaries are pre-sanitized (HTML tags stripped, entities decoded).

---

### 3. GET /api/articles/{id}

Single article with enrichment.

**Headers:** `X-API-Key` (required)

**Response:** Same shape as one item from `/api/articles`, wrapped in envelope.

**Errors:** 404 if not found.

---

### 4. GET /api/articles/{id}/full

Combined article + relevance + summaries in one call. Saves 3 round-trips on article detail pages.

**Headers:** `X-API-Key` (required), `X-Portfolio` (optional)

**Response:**
```json
{
  "data": {
    "article": {
      "id": 12428112,
      "title": "...",
      "summary": "...",
      "tickers": ["NVDA", "TSM"],
      "enrichment": { ... },
      "created_at": "..."
    },
    "relevance": {
      "article_id": 12428112,
      "user_id": "usr_demo",
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
  },
  "meta": {}
}
```

---

### 5. GET /api/articles/{id}/relevance

7-tier relevance scoring for an article against the portfolio.

**Headers:** `X-API-Key` (required), `X-Portfolio` (optional)

**Response:**
```json
{
  "data": {
    "article_id": 12428112,
    "user_id": "usr_demo",
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
        "explanation": "Article about NVIDIA Corp., connected to Microsoft Corp. via supply chain"
      }
    ]
  },
  "meta": {}
}
```

**Relevance tiers:**

| Tier | Name | Score Range | Meaning |
|------|------|-------------|---------|
| 1 | Direct Primary | 0.80 - 0.95 | Article is ABOUT a holding |
| 2 | Direct Secondary | 0.80 - 0.95 | Holding is mentioned but not the main subject |
| 3 | Supply Chain | 0.55 - 0.75 | Connected via supply chain (1 hop) |
| 4 | Competitive | 0.45 - 0.60 | Article entity competes with a holding |
| 5 | Shared Dependency | 0.35 - 0.50 | Entity connects to 2+ holdings via same intermediary |
| 6 | Sector | 0.20 - 0.35 | Same sector as a holding |
| 7 | Second-Hop | 0.10 - 0.25 | Connected through 2 hops in supply chain |

---

### 6. GET /api/articles/{id}/summary

Per-holding personalized explanations (Stream 8). Only generated for tier 1-5 connections.

**Headers:** `X-API-Key` (required), `X-Portfolio` (optional)

**Response:**
```json
{
  "data": [
    {
      "article_id": 12428112,
      "user_id": "usr_demo",
      "holding_ticker": "NVDA",
      "summary": "NVIDIA Corp. developments affect your NVIDIA Corp. stake (15% of portfolio). Article directly discusses NVIDIA Corp.. Monitor for follow-up reports.",
      "action_context": "Monitor for follow-up reports on resolution timeline.",
      "confidence": 0.88
    }
  ],
  "meta": { "count": 3 }
}
```

---

### 7. GET /api/discovery/today

Entities NOT in the portfolio that connect to 2+ holdings. Things the user should be watching.

**Headers:** `X-API-Key` (required), `X-Portfolio` (optional)

**Response:**
```json
{
  "data": [
    {
      "discovered_entity_name": "Broadcom Inc.",
      "discovered_entity_ticker": "AVGO",
      "discovery_type": "supply_chain",
      "discovery_score": 0.95,
      "connected_holdings": ["AAPL", "MSFT", "TSM"],
      "path_to_portfolio": [
        { "from": "AVGO", "relationship": "SUPPLIES_TO", "to": "AAPL" }
      ],
      "explanation": "Connected to 3 portfolio holdings via supply chain"
    }
  ],
  "meta": { "count": 6 }
}
```

Returns up to 10 discoveries, sorted by score descending.

---

### 8. GET /api/risk/alerts

Correlated risk alerts: when a single event threatens multiple holdings.

**Headers:** `X-API-Key` (required), `X-Portfolio` (optional)

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `severity` | string | _(all)_ | Filter: `critical`, `high`, `medium`, `low` |

**Response:**
```json
{
  "data": [
    {
      "alert_id": "risk_28087_INTC",
      "correlation_type": "shared_supplier",
      "trigger_article_id": 28087,
      "trigger_headline": "Intel supply chain disruption...",
      "affected_holdings": ["AMZN", "META", "MSFT"],
      "combined_portfolio_exposure_pct": 0.36,
      "severity_tier": "critical",
      "cause_description": "Intel Corp. issues affect 3 holdings representing 36% of portfolio",
      "explanation": "MSFT (18%) and AMZN (10%) and META (8%) all depend on Intel Corp."
    }
  ],
  "meta": { "count": 12 }
}
```

**Severity logic:**

| Severity | Condition |
|----------|-----------|
| `critical` | 3+ holdings affected AND >30% exposure AND negative signal |
| `high` | 2+ holdings AND >15% exposure |
| `medium` | Any shared dependency detected |
| `low` | Sector-level correlation only |

**Correlation types:** `shared_supplier`, `sector_concentration`

Returns up to 20 alerts, sorted by severity.

---

### 9. GET /api/risk/exposure

Portfolio concentration analysis by sector and geography.

**Headers:** `X-API-Key` (required), `X-Portfolio` (optional)

**Response:**
```json
{
  "data": {
    "user_id": "usr_demo",
    "computed_at": "2026-02-12T10:00:00Z",
    "by_sector": {
      "Information Technology": {
        "exposure_pct": 0.60,
        "holdings": ["AAPL", "MSFT", "NVDA", "TSM"],
        "trend": "stable"
      },
      "Communication Services": {
        "exposure_pct": 0.20,
        "holdings": ["GOOGL", "META"],
        "trend": "stable"
      }
    },
    "by_geography": {
      "United States": { "exposure_pct": 0.93 },
      "Taiwan": { "exposure_pct": 0.07 }
    },
    "concentration_risks": [
      {
        "risk_type": "sector",
        "category": "Information Technology",
        "exposure_pct": 0.60,
        "severity": "critical",
        "description": "60% portfolio exposure to IT sector"
      },
      {
        "risk_type": "supplier",
        "category": "Taiwan Semiconductor",
        "dependent_holdings": ["AAPL", "NVDA"],
        "severity": "high",
        "description": "Single supplier dependency for 2 holdings (35% exposure)"
      },
      {
        "risk_type": "geographic",
        "category": "Taiwan",
        "exposure_pct": 0.07,
        "severity": "medium",
        "description": "7% direct portfolio exposure to Taiwan"
      }
    ]
  },
  "meta": {}
}
```

Concentration risks are dynamically computed based on the portfolio provided.

---

### 10. GET /api/digest/today

Daily briefing with 6 curated sections.

**Headers:** `X-API-Key` (required), `X-Portfolio` (optional)

**Response:**
```json
{
  "data": {
    "digest_id": "dg_2026-02-12",
    "user_id": "usr_demo",
    "generated_at": "2026-02-12T10:00:00Z",
    "sections": {
      "direct_news": [
        {
          "article_id": 12345,
          "headline": "...",
          "relevance_score": 0.86,
          "affected_holdings": ["NVDA", "MSFT"],
          "summary": "..."
        }
      ],
      "related_news": [...],
      "risk_alerts": [...],
      "developing_stories": [
        {
          "narrative_id": "narr_03b14741",
          "title": "GOOGL AI Developments",
          "article_count": 5,
          "sentiment_trajectory": "improving",
          "affected_holdings": ["GOOGL"]
        }
      ],
      "discovery": [...],
      "sector_context": [...]
    }
  },
  "meta": {}
}
```

**Section limits:**

| Section | Content | Max |
|---------|---------|-----|
| `direct_news` | Articles directly about holdings | 10 |
| `related_news` | Supply chain / competitor articles | 15 |
| `risk_alerts` | Medium+ severity risk alerts | 5 |
| `developing_stories` | Narratives with 2+ articles | 5 |
| `discovery` | Entity discoveries | 5 |
| `sector_context` | Sector-level articles | 5 |

---

### 11. GET /api/alerts/history

Triggered notification history.

**Headers:** `X-API-Key` (required), `X-Portfolio` (optional)

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | integer | 50 | Max alerts (1-200) |

**Response:**
```json
{
  "data": [
    {
      "alert_id": "alt_1707678695_23aada",
      "rule_id": "rule_1",
      "trigger_type": "direct_mention",
      "triggered_at": "2026-02-12T05:11:35Z",
      "article_id": 33155,
      "headline": "SA analyst upgrades: TSLA, CRM, MU",
      "matched_holdings": ["TSLA"],
      "severity": "high",
      "summary": "Direct mention of TSLA"
    }
  ],
  "meta": { "count": 50, "total": 847 }
}
```

When `X-Portfolio` is set, only alerts matching the custom portfolio's holdings are returned.

**Trigger types:**

| Type | Fires when |
|------|-----------|
| `direct_mention` | AAPL, NVDA, or TSLA mentioned directly |
| `relevance_threshold` | Article scores above 0.80 relevance |
| `sector_news` | Negative IT sector news |
| `narrative_update` | Supply chain or tariff narratives updated |

---

### 12. GET /api/narratives/active

Developing stories (articles grouped by topic).

**Headers:** `X-API-Key` (required)

**Response:**
```json
{
  "data": [
    {
      "narrative_id": "narr_03b14741",
      "title": "GOOGL AI Developments",
      "primary_ticker": "GOOGL",
      "signal_type": "AI_TECHNOLOGY",
      "article_count": 5,
      "first_seen": "2026-02-11T05:10:30Z",
      "last_updated": "2026-02-12T09:22:00Z",
      "status": "developing",
      "sentiment_trajectory": "improving"
    }
  ],
  "meta": { "count": 20 }
}
```

| Status | Condition |
|--------|-----------|
| `emerging` | 1-2 articles |
| `developing` | 3-5 articles |
| `established` | 6+ articles |

| Trajectory | Meaning |
|-----------|---------|
| `improving` | Trending positive |
| `worsening` | Trending negative |
| `mixed` | Conflicting signals |
| `stable` | Consistent |

---

### 13. GET /api/portfolios

List mock portfolios.

**Headers:** `X-API-Key` (required)

**Response:**
```json
{
  "data": [
    {
      "portfolio_id": "pf_demo_growth",
      "name": "Demo Growth Portfolio",
      "user_id": "usr_demo",
      "total_value": 100000,
      "holdings_count": 10
    }
  ],
  "meta": { "count": 1 }
}
```

---

### 14. GET /api/portfolios/{portfolio_id}/holdings

Holdings and weights for a portfolio.

**Headers:** `X-API-Key` (required)

**Path Parameters:** `portfolio_id` = `pf_demo_growth`

**Response:**
```json
{
  "data": [
    { "ticker": "AAPL", "name": "Apple Inc.", "sector": "Information Technology", "weight_pct": 20.0, "value": 20000.0 },
    { "ticker": "MSFT", "name": "Microsoft Corp.", "sector": "Information Technology", "weight_pct": 18.0, "value": 18000.0 }
  ],
  "meta": { "count": 10 }
}
```

---

### 15. GET /api/explore/entity/{ticker}

Full entity details with knowledge graph context.

**Headers:** `X-API-Key` (required)

**Response:**
```json
{
  "data": {
    "ticker": "AAPL",
    "name": "Apple Inc.",
    "sector": "Information Technology",
    "industry": "Technology Hardware",
    "geography": "United States",
    "market_cap_billion": 3000,
    "in_portfolio": true,
    "graph": {
      "supplier_count": 5,
      "customer_count": 0,
      "relationships": [
        { "type": "SUPPLIED_BY", "other": "TSM", "significance": "critical" },
        { "type": "SUPPLIED_BY", "other": "AVGO", "significance": "critical" },
        { "type": "COMPETES_WITH", "other": "MSFT", "significance": "important" }
      ],
      "second_hop_connections": [
        { "target": "NVDA", "via": "TSM", "path": "AAPL<-TSM->NVDA" },
        { "target": "AMD", "via": "TSM", "path": "AAPL<-TSM->AMD" }
      ]
    }
  },
  "meta": {}
}
```

**Relationship types:**

| Type | Meaning |
|------|---------|
| `SUPPLIED_BY` | Other company supplies this entity |
| `SUPPLIES_TO` | This entity supplies the other |
| `COMPETES_WITH` | Competitors (bidirectional) |

**Significance:** `critical` (high dependency) or `important` (notable).

---

### 16. GET /api/explore/search

Search companies in the knowledge graph.

**Headers:** `X-API-Key` (required)

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Search query (min 1 char), matches ticker and name |

**Response:**
```json
{
  "data": [
    { "ticker": "TSM", "name": "Taiwan Semiconductor", "sector": "Information Technology" }
  ],
  "meta": { "count": 1 }
}
```

Case-insensitive partial match. Up to 20 results.

---

### 17. POST /api/dashboard

Batch endpoint that returns multiple data sections in one call. Accepts portfolio in the request body (no `X-Portfolio` header needed).

**Headers:** `X-API-Key` (required)

**Request body:**
```json
{
  "holdings": [
    { "ticker": "AAPL", "weight_pct": 30 },
    { "ticker": "GOOGL", "weight_pct": 25 },
    { "ticker": "TSLA", "weight_pct": 20 },
    { "ticker": "JPM", "weight_pct": 15 },
    { "ticker": "XOM", "weight_pct": 10 }
  ],
  "include": ["digest", "exposure", "alerts"]
}
```

| Body field | Type | Required | Description |
|-----------|------|----------|-------------|
| `holdings` | array | Yes | Portfolio holdings with `ticker` (string) and `weight_pct` (number) |
| `include` | string[] | No | Sections to include. Default: all 5 sections |

**Available sections:** `digest`, `exposure`, `alerts`, `narratives`, `alert_history`

**Response:**
```json
{
  "data": {
    "digest": {
      "digest_id": "dg_2026-02-12",
      "generated_at": "...",
      "sections": { ... }
    },
    "exposure": {
      "by_sector": { ... },
      "by_geography": { ... },
      "concentration_risks": [...]
    },
    "alerts": [
      { "alert_id": "...", "severity_tier": "critical", ... }
    ],
    "narratives": [...],
    "alert_history": [...]
  },
  "meta": {
    "portfolio_hash": "a1b2c3d4",
    "holdings_count": 5,
    "computed_at": "2026-02-12T10:00:00Z",
    "sections_included": ["alerts", "digest", "exposure"]
  }
}
```

`meta.portfolio_hash` can be used for client-side caching (same hash = same portfolio = same results for same day).

---

### 18. POST /api/signals/aggregate

Signal aggregation across the portfolio over a time window. Shows which signal types are most active and which holdings are most affected.

**Headers:** `X-API-Key` (required)

**Request body:**
```json
{
  "holdings": [
    { "ticker": "AAPL", "weight_pct": 30 },
    { "ticker": "GOOGL", "weight_pct": 25 },
    { "ticker": "NVDA", "weight_pct": 20 },
    { "ticker": "MSFT", "weight_pct": 15 },
    { "ticker": "AMZN", "weight_pct": 10 }
  ],
  "days": 7
}
```

| Body field | Type | Default | Description |
|-----------|------|---------|-------------|
| `holdings` | array | (required) | Portfolio holdings |
| `days` | integer | 7 | Lookback window (1-30 days) |

**Response:**
```json
{
  "data": {
    "by_signal_type": {
      "EARNINGS_REPORT": {
        "article_count": 45,
        "positive": 28,
        "negative": 12,
        "neutral": 5,
        "dominant_direction": "POSITIVE",
        "dominant_magnitude": "moderate",
        "affected_holdings": ["AAPL", "GOOGL", "MSFT", "NVDA"],
        "trend": "improving",
        "latest_headline": "..."
      },
      "AI_TECHNOLOGY": { ... },
      "SUPPLY_DISRUPTION": { ... }
    },
    "by_holding": {
      "AAPL": {
        "total_articles": 120,
        "net_sentiment": 0.15,
        "dominant_signal": "EARNINGS_REPORT",
        "risk_signals": 18,
        "opportunity_signals": 35
      },
      "NVDA": { ... }
    },
    "portfolio_summary": {
      "total_articles_analyzed": 380,
      "net_sentiment": 0.08,
      "top_opportunity": "EARNINGS_REPORT",
      "top_risk": "REGULATORY",
      "signal_diversity": 8
    }
  },
  "meta": {
    "days_analyzed": 7,
    "holdings_count": 5,
    "computed_at": "2026-02-12T10:00:00Z"
  }
}
```

---

## Enrichment Schema (Stream 1)

Every article's `enrichment` object contains:

### entities[]

```json
{
  "entity_id": "AAPL",
  "surface_form": "Apple",
  "canonical_name": "Apple Inc.",
  "role": "PRIMARY_SUBJECT",
  "sentiment": "NEGATIVE",
  "role_confidence": 0.93,
  "context_snippet": "Apple faces supply disruption..."
}
```

| Field | Values |
|-------|--------|
| `role` | `PRIMARY_SUBJECT`, `MENTIONED` |
| `sentiment` | `POSITIVE`, `NEGATIVE`, `NEUTRAL` |
| `role_confidence` | 0.75 - 0.95 |

### signals[]

```json
{
  "signal_type": "SUPPLY_DISRUPTION",
  "direction": "NEGATIVE",
  "magnitude_category": "major",
  "primary_entity_name": "Apple",
  "evidence_snippet": "TSMC warned of 3-month delays...",
  "signal_timeframe": "medium_term"
}
```

**Signal types (11):** `EARNINGS_REPORT`, `M_AND_A`, `REGULATORY`, `SUPPLY_DISRUPTION`, `LEADERSHIP_CHANGE`, `PRODUCT_LAUNCH`, `PARTNERSHIP`, `AI_TECHNOLOGY`, `GEOPOLITICAL`, `MARKET_MOVEMENT`, `GENERAL_NEWS`

**Directions:** `POSITIVE`, `NEGATIVE`, `NEUTRAL`

**Magnitude:** `major`, `moderate`, `minor`

**Timeframe:** `near_term`, `medium_term`, `long_term`

Max 2 signals per article.

### graph_contexts{}

Keyed by ticker. Shows supply chain map for each entity in the article.

```json
{
  "AAPL": {
    "supplier_count": 5,
    "customer_count": 0,
    "relationships": [
      { "type": "SUPPLIED_BY", "other": "TSM", "significance": "critical" }
    ],
    "second_hop_connections": [
      { "target": "NVDA", "via": "TSM", "path": "AAPL<-TSM->NVDA" }
    ]
  }
}
```

### narrative

```json
{
  "narrative_id": "narr_abc12345",
  "title": "TSMC Supply Chain Pressures",
  "is_new_narrative": false,
  "narrative_position": 3,
  "status": "developing",
  "sentiment_trajectory": "worsening"
}
```

### contradiction

`null` if no contradiction. Otherwise:

```json
{
  "contradicting_article_id": 12340,
  "contradicting_headline": "TSMC Reports Record Production Output",
  "contradiction_type": "sentiment_reversal",
  "confidence": 0.73
}
```

### historical_patterns[]

```json
{
  "past_headline": "Apple Supply Crisis 2023",
  "similarity_score": 0.87,
  "narrative_duration_days": 45,
  "narrative_resolution": "Historical precedent: When Apple faced comparable Supply Disruption in Q3 2023, stock recovered 8% within 4 weeks."
}
```

---

## Supported Tickers (27)

### Portfolio Holdings (10)

| Ticker | Company | Sector | Default Weight |
|--------|---------|--------|---------------|
| AAPL | Apple Inc. | Information Technology | 20% |
| MSFT | Microsoft Corp. | Information Technology | 18% |
| NVDA | NVIDIA Corp. | Information Technology | 15% |
| GOOGL | Alphabet Inc. | Communication Services | 12% |
| AMZN | Amazon.com Inc. | Consumer Discretionary | 10% |
| META | Meta Platforms Inc. | Communication Services | 8% |
| TSM | Taiwan Semiconductor | Information Technology | 7% |
| JPM | JPMorgan Chase & Co. | Financials | 5% |
| JNJ | Johnson & Johnson | Health Care | 3% |
| XOM | Exxon Mobil Corp. | Energy | 2% |

### Supply Chain Neighbors (10)

| Ticker | Company | Role |
|--------|---------|------|
| ASML | ASML Holding | Supplies TSM, INTC, MU |
| LRCX | Lam Research | Supplies TSM, INTC, MU |
| AMAT | Applied Materials | Supplies TSM, INTC, MU, LRCX |
| MU | Micron Technology | Supplies AAPL, MSFT, AMZN |
| QCOM | Qualcomm Inc. | Supplies AAPL, META |
| AVGO | Broadcom Inc. | Supplies AAPL, MSFT |
| TXN | Texas Instruments | Supplies AAPL, TSLA, BA |
| INTC | Intel Corp. | Supplies MSFT, AMZN, META |
| AMD | Advanced Micro Devices | Competes with NVDA, INTC |
| CRM | Salesforce Inc. | Competes with MSFT |

### Competitors / 2nd-Hop (7)

| Ticker | Company | Role |
|--------|---------|------|
| GS | Goldman Sachs Group | Competes with JPM |
| V | Visa Inc. | Financials peer |
| MA | Mastercard Inc. | Competes with V |
| TSLA | Tesla Inc. | TXN customer |
| NFLX | Netflix Inc. | Competes with META, DIS |
| DIS | Walt Disney Co. | Competes with META, NFLX |
| BA | Boeing Co. | TXN customer |

The service only ingests articles mentioning these 27 tickers from the scraper API. Custom portfolios submitted via `X-Portfolio` or POST body can use ANY of these 27 tickers for scoring. Tickers not in this list will be accepted but won't match any articles.

---

## Knowledge Graph

27 companies, ~55 relationships.

### Supply Chain (directed: supplier --> customer)

```
Semiconductor Equipment:
  ASML --> TSM, INTC, MU
  LRCX --> TSM, INTC, MU
  AMAT --> TSM, INTC, MU, LRCX

Chip Fabrication:
  TSM  --> AAPL, NVDA, AMD, QCOM, AVGO, INTC

Components:
  MU   --> AAPL, MSFT, AMZN
  QCOM --> AAPL, META
  AVGO --> AAPL, MSFT
  TXN  --> AAPL, TSLA, BA
  INTC --> MSFT, AMZN, META

AI/Cloud:
  NVDA --> MSFT, AMZN, META, GOOGL, TSLA
```

### Competitors (bidirectional)

```
AAPL <-> MSFT, GOOGL
MSFT <-> GOOGL, AMZN, CRM
GOOGL <-> META, AMZN
NVDA <-> AMD, INTC
META <-> NFLX, DIS
JPM <-> GS
V <-> MA
NFLX <-> DIS
AMZN <-> MSFT, GOOGL
CRM <-> MSFT
```

---

## Frontend Integration Patterns

### Pattern 1: Dashboard (single request)

```javascript
const API = 'http://localhost:8001';
const KEY = 'hm-dev-key-change-in-prod';
const headers = { 'X-API-Key': KEY, 'Content-Type': 'application/json' };

// One POST replaces 5+ GET requests
const dashboard = await fetch(`${API}/api/dashboard`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    holdings: [
      { ticker: 'AAPL', weight_pct: 30 },
      { ticker: 'GOOGL', weight_pct: 25 },
      { ticker: 'TSLA', weight_pct: 20 },
      { ticker: 'JPM', weight_pct: 15 },
      { ticker: 'XOM', weight_pct: 10 }
    ],
    include: ['digest', 'exposure', 'alerts']
  })
}).then(r => r.json());

// dashboard.data.digest.sections.direct_news -> headline cards
// dashboard.data.exposure.by_sector -> pie chart
// dashboard.data.alerts -> risk cards
```

### Pattern 2: Article Detail Page (single request)

```javascript
// One GET replaces article + relevance + summary
const full = await fetch(`${API}/api/articles/${id}/full`, {
  headers: {
    'X-API-Key': KEY,
    'X-Portfolio': 'AAPL:30,GOOGL:25,TSLA:20,JPM:15,XOM:10'
  }
}).then(r => r.json());

// full.data.article -> article content + enrichment
// full.data.relevance -> tier badges
// full.data.summaries -> "why this matters" cards
```

### Pattern 3: Article Feed with Infinite Scroll

```javascript
let offset = 0;
const PAGE_SIZE = 20;

async function loadMore(ticker = null) {
  const params = new URLSearchParams({ limit: PAGE_SIZE, offset });
  if (ticker) params.set('ticker', ticker);

  const resp = await fetch(`${API}/api/articles?${params}`, { headers })
    .then(r => r.json());

  const totalPages = Math.ceil(resp.meta.total / PAGE_SIZE);
  offset += resp.data.length;
  return { articles: resp.data, totalPages, total: resp.meta.total };
}
```

### Pattern 4: Signal Analysis Page

```javascript
const signals = await fetch(`${API}/api/signals/aggregate`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    holdings: userHoldings,
    days: 7
  })
}).then(r => r.json());

// signals.data.by_signal_type -> signal breakdown chart
// signals.data.by_holding -> per-stock sentiment bars
// signals.data.portfolio_summary -> top-level stats
```

### Pattern 5: Graph Explorer

```javascript
// Entity detail
const entity = await fetch(`${API}/api/explore/entity/AAPL`, { headers })
  .then(r => r.json());
// entity.data.graph.relationships -> render graph nodes
// entity.data.graph.second_hop_connections -> extended paths

// Search bar
const results = await fetch(`${API}/api/explore/search?q=semi`, { headers })
  .then(r => r.json());
```

### Pattern 6: Notification System

```javascript
const alerts = await fetch(`${API}/api/alerts/history?limit=20`, {
  headers: {
    'X-API-Key': KEY,
    'X-Portfolio': 'AAPL:30,GOOGL:25,TSLA:20'
  }
}).then(r => r.json());

const unread = alerts.data.filter(a => new Date(a.triggered_at) > lastSeen);
// Badge count = unread.length
```

---

## Data Lifecycle

```
Scraper API (live, external, 159.89.162.233:5000)
  |
  |  Every 5 min: GET /articles/feed?ticker=<27 tickers>
  |  Returns ~2-4 real articles per poll
  v
Mock Service ingests each article:
  |
  |  1. Store raw article (HTML-sanitized summary)
  |  2. Enrichment: entities, signals, graph context,
  |     narrative, historical patterns, contradictions
  |  3. Processing: relevance, discovery, risk alerts,
  |     triggered alerts, personalized summaries
  |  4. Write everything to SQLite
  v
API serves from SQLite
  |
  |  GET endpoints query the local DB
  |  POST endpoints compute on-the-fly from stored enrichment
  |  Digest/discovery/risk aggregate today's data per request
  |  Exposure is computed dynamically from portfolio weights
  v
Frontend consumes via REST
```

**Cold start**: Backfills all historical articles (~2,200+) in ~1-2 minutes. API is usable immediately.

**Steady state**: ~2-4 new articles every 5 minutes, growing ~50-100/day.

**Reset**: Delete the Docker volume (`docker volume rm intelligence_api_data`) and restart. Fresh backfill.

---

## Endpoint Summary Table

| # | Method | Path | Auth | Portfolio | Description |
|---|--------|------|------|-----------|-------------|
| 1 | GET | `/api/health` | No | No | Service status |
| 2 | GET | `/api/articles` | Yes | No | Paginated article feed |
| 3 | GET | `/api/articles/{id}` | Yes | No | Single article |
| 4 | GET | `/api/articles/{id}/full` | Yes | Header | Article + relevance + summaries |
| 5 | GET | `/api/articles/{id}/relevance` | Yes | Header | 7-tier relevance scoring |
| 6 | GET | `/api/articles/{id}/summary` | Yes | Header | Per-holding explanations |
| 7 | GET | `/api/discovery/today` | Yes | Header | Entity discoveries |
| 8 | GET | `/api/risk/alerts` | Yes | Header | Correlated risk alerts |
| 9 | GET | `/api/risk/exposure` | Yes | Header | Portfolio concentration |
| 10 | GET | `/api/digest/today` | Yes | Header | Daily briefing (6 sections) |
| 11 | GET | `/api/alerts/history` | Yes | Header | Notification history |
| 12 | GET | `/api/narratives/active` | Yes | No | Developing stories |
| 13 | GET | `/api/portfolios` | Yes | No | List portfolios |
| 14 | GET | `/api/portfolios/{id}/holdings` | Yes | No | Portfolio holdings |
| 15 | GET | `/api/explore/entity/{ticker}` | Yes | No | Entity + graph context |
| 16 | GET | `/api/explore/search` | Yes | No | Search companies |
| 17 | POST | `/api/dashboard` | Yes | Body | Batch dashboard data |
| 18 | POST | `/api/signals/aggregate` | Yes | Body | Signal aggregation |

**"Header"** = accepts `X-Portfolio` header for custom portfolio.
**"Body"** = accepts portfolio in the POST request body.
