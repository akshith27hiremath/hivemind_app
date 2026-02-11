# Hivemind Mock Intelligence API - Complete Reference

**Base URL**: `http://localhost:8001` (local) or `http://hivemind_mock:8001` (from another Docker container)
**Format**: JSON only, no authentication required
**CORS**: All origins allowed
**Swagger UI**: `http://localhost:8001/docs`

---

## Docker Networking

### Running alongside your frontend container

Both containers must share a Docker network. Two options:

**Option A: docker-compose (recommended)**

```yaml
# your-frontend/docker-compose.yml
services:
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      # Use the container name, not localhost
      HIVEMIND_API_URL: http://hivemind_mock:8001
    networks:
      - hivemind_network

networks:
  hivemind_network:
    external: true
    name: hivemind_network
```

Then run both:
```bash
# Terminal 1: Start the mock service
cd hivemind/
docker-compose up -d mock-intelligence

# Terminal 2: Start your frontend
cd your-frontend/
docker-compose up -d
```

Both join `hivemind_network`. Your frontend reaches the API at `http://hivemind_mock:8001`.

**Option B: Shared network manually**

```bash
# Create network (skip if hivemind_network already exists)
docker network create hivemind_network

# Start mock service on that network
docker run -d --name hivemind_mock --network hivemind_network -p 8001:8001 hivemind-mock:latest

# Start your frontend on the same network
docker run -d --name my_frontend --network hivemind_network -p 3000:3000 \
  -e HIVEMIND_API_URL=http://hivemind_mock:8001 \
  your-frontend-image
```

**Option C: Both on host network (simplest for dev)**

If your frontend runs on the host machine (e.g. `npm run dev`), just use `http://localhost:8001`.

### Key points
- Container-to-container: use `http://hivemind_mock:8001` (Docker DNS)
- Browser-to-container: use `http://localhost:8001` (port-mapped)
- Your frontend's **server-side** code (SSR, API routes) uses the container name
- Your frontend's **client-side** code (browser fetch) uses `localhost:8001`

---

## Response Envelope

All endpoints return:

```json
{
  "data": { ... } or [ ... ],
  "meta": {
    "count": 10
  }
}
```

Errors return:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Article 999999 not found"
  }
}
```

---

## Endpoints

### 1. GET /api/health

Service status and statistics.

**Response:**
```json
{
  "data": {
    "status": "healthy",
    "articles_count": 1700,
    "last_poll": "2026-02-11T05:22:02Z",
    "watchlist_size": 27,
    "portfolio_holdings": 10,
    "timestamp": "2026-02-11T05:22:02Z"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Always `"healthy"` if responding |
| `articles_count` | integer | Total articles ingested so far |
| `last_poll` | ISO string | When the scraper was last polled |
| `watchlist_size` | integer | Number of tickers being tracked (27) |
| `portfolio_holdings` | integer | Number of holdings in mock portfolio (10) |

**Use for**: Startup check, connection verification, loading indicators.

---

### 2. GET /api/articles

Paginated list of enriched articles. Most recent first.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `ticker` | string | _(none)_ | Filter by ticker(s), comma-separated. e.g. `AAPL,MSFT` |
| `limit` | integer | 20 | Max articles per page (1-100) |
| `offset` | integer | 0 | Pagination offset |

**Response:**
```json
{
  "data": [
    {
      "id": 12428112,
      "url": "https://...",
      "title": "Two co-founders of Elon Musk's xAI resign, joining exodus - Reuters",
      "summary": "...",
      "source": "Reuters Business",
      "published_at": "2026-02-11T02:23:17",
      "fetched_at": "2026-02-11T04:03:32.510258",
      "classified_at": "2026-02-11T05:02:25.758567",
      "tickers": ["TSLA"],
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
  "meta": { "count": 20 }
}
```

**Article fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique article ID (from scraper) |
| `url` | string | Original article URL |
| `title` | string | Article headline |
| `summary` | string | Article summary text (may contain HTML from source) |
| `source` | string | Publisher name: "Reuters Business", "Seeking Alpha (AAPL)", "Bloomberg" etc. |
| `published_at` | ISO string or null | When the article was published |
| `fetched_at` | ISO string | When the scraper ingested it |
| `classified_at` | ISO string | When it was classified as FACTUAL |
| `tickers` | string[] | S&P 500 tickers mentioned (e.g. `["AAPL", "TSM"]`) |
| `enrichment` | object | Full Stream 1 enrichment (see below) |
| `created_at` | ISO string | When the mock service processed it |

**Use for**: Article feed page, news list, infinite scroll.

**Example:**
```
GET /api/articles?ticker=AAPL,NVDA&limit=10&offset=0
```

---

### 3. GET /api/articles/{id}

Single article with full enrichment data.

**Path Parameters:**
- `id` (integer, required) - Article ID

**Response:** Same shape as a single item from `/api/articles`, wrapped in envelope.

**Errors:** `404` if article not found.

**Use for**: Article detail page, click-through from feed.

---

### 4. GET /api/articles/{id}/relevance

How relevant is this article to the user's portfolio? 7-tier scoring system.

**Path Parameters:**
- `id` (integer, required) - Article ID

**Response:**
```json
{
  "data": {
    "article_id": 6377630,
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
      },
      {
        "holding_ticker": "TSM",
        "relevance_tier": 3,
        "relevance_score": 0.70,
        "relationship_path": "TSM supplies NVDA",
        "explanation": "Taiwan Semiconductor supplies NVIDIA Corp."
      }
    ]
  }
}
```

**Relevance tier system:**

| Tier | Name | Score Range | Meaning |
|------|------|-------------|---------|
| 1 | Direct Primary | 0.80 - 0.95 | Article is ABOUT a portfolio holding |
| 2 | Direct Secondary | 0.80 - 0.95 | Holding is mentioned but not the main subject |
| 3 | Supply Chain | 0.55 - 0.75 | Article entity supplies or is supplied by a holding |
| 4 | Competitive | 0.45 - 0.60 | Article entity competes with a holding |
| 5 | Shared Dependency | 0.35 - 0.50 | Entity connects to 2+ holdings via same intermediary |
| 6 | Sector | 0.20 - 0.35 | Entity is in the same sector as a holding |
| 7 | Second-Hop | 0.10 - 0.25 | Connected through 2 hops in supply chain |

**Per-holding fields:**

| Field | Type | Description |
|-------|------|-------------|
| `holding_ticker` | string | Portfolio holding this score applies to |
| `relevance_tier` | integer (1-7) | How the article connects to this holding |
| `relevance_score` | float (0-1) | Numerical relevance score |
| `relationship_path` | string | Human-readable connection path |
| `explanation` | string | Why this article matters to this holding |

**Use for**: Relevance badges on articles, sorting by relevance, "why this matters" tooltips.

---

### 5. GET /api/articles/{id}/summary

Per-holding personalized explanation of why an article matters.

**Path Parameters:**
- `id` (integer, required) - Article ID

**Response:**
```json
{
  "data": [
    {
      "article_id": 6377630,
      "user_id": "usr_demo",
      "holding_ticker": "NVDA",
      "summary": "NVIDIA Corp. developments affect your NVIDIA Corp. stake (15% of portfolio). Article directly discusses NVIDIA Corp.. Monitor for follow-up reports on resolution timeline.",
      "action_context": "Monitor for follow-up reports on resolution timeline.",
      "confidence": 0.88
    },
    {
      "article_id": 6377630,
      "user_id": "usr_demo",
      "holding_ticker": "MSFT",
      "summary": "News regarding NVIDIA Corp. impacts your Microsoft Corp. position (18% allocation) through NVDA supplies MSFT. Track competitor responses to this development.",
      "action_context": "Track competitor responses to this development.",
      "confidence": 0.89
    }
  ],
  "meta": { "count": 6 }
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `holding_ticker` | string | Which holding this summary is for |
| `summary` | string | 1-2 sentence explanation in plain English |
| `action_context` | string | Suggested next step for the user |
| `confidence` | float (0-1) | How confident the system is in this connection |

Only generated for tier 1-5 holdings (close connections). Tier 6-7 are too peripheral for summaries.

**Use for**: Article detail page "Impact on your portfolio" section, holding-specific insight cards.

---

### 6. GET /api/discovery/today

Entities NOT in the user's portfolio that connect to 2+ of their holdings. Things they should be watching.

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

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `discovered_entity_name` | string | Full company name |
| `discovered_entity_ticker` | string | Ticker symbol |
| `discovery_type` | string | `"supply_chain"` or `"second_hop"` |
| `discovery_score` | float (0-1) | How significant this discovery is |
| `connected_holdings` | string[] | Which portfolio holdings it connects to |
| `path_to_portfolio` | object[] | Graph path showing the connection |
| `explanation` | string | Plain English explanation |

Returns up to 10 discoveries per day, sorted by score descending.

**Use for**: "Discover" page, "Companies to watch" widget, graph visualization.

---

### 7. GET /api/risk/alerts

Correlated risks: when a single event threatens multiple portfolio holdings.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `severity` | string | _(none)_ | Filter by severity: `critical`, `high`, `medium`, `low` |

**Response:**
```json
{
  "data": [
    {
      "alert_id": "risk_28087_INTC",
      "correlation_type": "shared_supplier",
      "trigger_article_id": 28087,
      "trigger_headline": "Intel has tested chipmaking tools from firm with sanctioned China unit",
      "affected_holdings": ["AMZN", "META", "MSFT"],
      "combined_portfolio_exposure_pct": 0.36,
      "severity_tier": "critical",
      "cause_description": "Intel Corp. issues affect 3 holdings representing 36% of portfolio",
      "explanation": "MSFT (18%) and AMZN (10%) and META (8%) all depend on Intel Corp."
    }
  ],
  "meta": { "count": 20 }
}
```

**Severity tiers:**

| Severity | Condition |
|----------|-----------|
| `critical` | 3+ holdings affected AND >30% exposure AND negative signal |
| `high` | 2+ holdings AND >15% exposure |
| `medium` | Any shared dependency detected |
| `low` | Sector-level correlation only |

**Correlation types:**

| Type | Meaning |
|------|---------|
| `shared_supplier` | An entity supplies 2+ of your holdings |
| `sector_concentration` | Negative news in a sector where you're overweight |

Returns up to 20 alerts, sorted by severity (critical first).

**Use for**: Risk dashboard, alert cards, portfolio health indicators.

---

### 8. GET /api/digest/today

Daily briefing with 6 curated sections. Aggregates from all streams.

**Response:**
```json
{
  "data": {
    "digest_id": "dg_2026-02-11",
    "user_id": "usr_demo",
    "generated_at": "2026-02-11T05:22:45Z",
    "sections": {
      "direct_news": [
        {
          "article_id": 12345,
          "headline": "Nvidia initiated: Wall Street's top analyst calls",
          "relevance_score": 0.86,
          "affected_holdings": ["NVDA", "MSFT", "AAPL"],
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
  }
}
```

**Sections:**

| Section | Content | Max Items |
|---------|---------|-----------|
| `direct_news` | Articles directly about your holdings | 10 |
| `related_news` | Supply chain / competitor articles not in direct_news | 15 |
| `risk_alerts` | Today's medium+ severity risk alerts | 5 |
| `developing_stories` | Active narratives with 2+ articles | 5 |
| `discovery` | Today's entity discoveries | 5 |
| `sector_context` | Sector-level articles not shown above | 5 |

Each `direct_news` and `related_news` item has:

| Field | Type | Description |
|-------|------|-------------|
| `article_id` | integer | Link to full article |
| `headline` | string | Article title |
| `relevance_score` | float | Overall relevance to portfolio |
| `affected_holdings` | string[] | Which holdings are impacted |
| `summary` | string | First ~200 chars of article summary |

**Use for**: Main dashboard / home page, morning briefing view.

---

### 9. GET /api/alerts/history

Triggered notification history. These fire when articles match user-configured rules.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | integer | 50 | Max alerts to return (1-200) |

**Response:**
```json
{
  "data": [
    {
      "alert_id": "alt_1770786695_23aada",
      "rule_id": "rule_1",
      "trigger_type": "direct_mention",
      "triggered_at": "2026-02-11T05:11:35Z",
      "article_id": 33155,
      "headline": "SA analyst upgrades/downgrades: TSLA, CRM, MU, and TJX",
      "matched_holdings": ["TSLA"],
      "severity": "high",
      "summary": "Direct mention of TSLA"
    }
  ],
  "meta": { "count": 50 }
}
```

**Trigger types:**

| Type | When it fires |
|------|--------------|
| `direct_mention` | AAPL, NVDA, or TSLA mentioned directly |
| `relevance_threshold` | Any article scores above 0.80 relevance |
| `sector_news` | Negative IT sector news |
| `narrative_update` | Supply chain or tariff narratives have new articles |

Sorted by `triggered_at` descending (newest first).

**Use for**: Notification bell/inbox, alert history page.

---

### 10. GET /api/risk/exposure

Portfolio concentration breakdown by sector and geography.

**Response:**
```json
{
  "data": {
    "user_id": "usr_demo",
    "computed_at": "2026-02-11T05:24:23Z",
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
      },
      "Consumer Discretionary": {
        "exposure_pct": 0.10,
        "holdings": ["AMZN"],
        "trend": "stable"
      },
      "Financials": {
        "exposure_pct": 0.05,
        "holdings": ["JPM"],
        "trend": "stable"
      },
      "Health Care": {
        "exposure_pct": 0.03,
        "holdings": ["JNJ"],
        "trend": "stable"
      },
      "Energy": {
        "exposure_pct": 0.02,
        "holdings": ["XOM"],
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
        "category": "TSMC",
        "dependent_holdings": ["AAPL", "NVDA"],
        "severity": "high",
        "description": "Single supplier dependency for 2 holdings"
      },
      {
        "risk_type": "geographic",
        "category": "Taiwan",
        "exposure_pct": 0.07,
        "severity": "medium",
        "description": "7% direct portfolio exposure to Taiwan"
      }
    ]
  }
}
```

**Use for**: Exposure pie charts, risk heatmap, portfolio analysis page.

---

### 11. GET /api/narratives/active

Developing stories - articles grouped into narrative threads by topic.

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
      "last_updated": "2026-02-11T05:22:00Z",
      "status": "developing",
      "sentiment_trajectory": "improving"
    }
  ],
  "meta": { "count": 20 }
}
```

**Status values:**

| Status | Condition |
|--------|-----------|
| `emerging` | 1-2 articles |
| `developing` | 3-5 articles |
| `established` | 6+ articles |

**Sentiment trajectory:**

| Value | Meaning |
|-------|---------|
| `improving` | Recent articles trending positive |
| `worsening` | Recent articles trending negative |
| `mixed` | Conflicting signals |
| `stable` | Consistent sentiment |

Returns up to 20 narratives with 2+ articles, sorted by last update.

**Use for**: "Developing Stories" section, narrative timeline view, story tracking.

---

### 12. GET /api/portfolios

List user's portfolios.

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

**Use for**: Portfolio selector, account overview.

---

### 13. GET /api/portfolios/{portfolio_id}/holdings

Holdings in a specific portfolio with weights.

**Path Parameters:**
- `portfolio_id` (string, required) - Portfolio ID (`pf_demo_growth`)

**Response:**
```json
{
  "data": [
    {
      "ticker": "AAPL",
      "name": "Apple Inc.",
      "sector": "Information Technology",
      "weight_pct": 20.0,
      "value": 20000.0
    },
    {
      "ticker": "MSFT",
      "name": "Microsoft Corp.",
      "sector": "Information Technology",
      "weight_pct": 18.0,
      "value": 18000.0
    }
  ],
  "meta": { "count": 10 }
}
```

Full holdings list:

| Ticker | Name | Sector | Weight |
|--------|------|--------|--------|
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

**Use for**: Portfolio page, holdings table, weight visualization.

---

### 14. GET /api/explore/entity/{ticker}

Entity details with full graph context - supply chain, competitors, 2nd-hop paths.

**Path Parameters:**
- `ticker` (string, required) - Ticker symbol (case-insensitive)

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
        { "type": "SUPPLIED_BY", "other": "MU", "significance": "important" },
        { "type": "SUPPLIED_BY", "other": "QCOM", "significance": "important" },
        { "type": "SUPPLIED_BY", "other": "AVGO", "significance": "critical" },
        { "type": "SUPPLIED_BY", "other": "TXN", "significance": "important" },
        { "type": "COMPETES_WITH", "other": "MSFT", "significance": "important" },
        { "type": "COMPETES_WITH", "other": "GOOGL", "significance": "important" }
      ],
      "second_hop_connections": [
        { "target": "NVDA", "via": "TSM", "path": "AAPL<-TSM->NVDA" },
        { "target": "AMD", "via": "TSM", "path": "AAPL<-TSM->AMD" },
        { "target": "AMZN", "via": "MU", "path": "AAPL<-MU->AMZN" },
        { "target": "META", "via": "QCOM", "path": "AAPL<-QCOM->META" },
        { "target": "TSLA", "via": "TXN", "path": "AAPL<-TXN->TSLA" },
        { "target": "BA", "via": "TXN", "path": "AAPL<-TXN->BA" }
      ]
    }
  }
}
```

**Relationship types:**

| Type | Direction | Meaning |
|------|-----------|---------|
| `SUPPLIED_BY` | entity <-- other | Other company supplies this entity |
| `SUPPLIES_TO` | entity --> other | This entity supplies the other company |
| `COMPETES_WITH` | bidirectional | Competitors |

**Significance levels:** `critical` (high dependency) or `important` (notable connection).

**Use for**: Entity detail page, graph visualization, supply chain explorer.

---

### 15. GET /api/explore/search

Search companies in the knowledge graph by name or ticker.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Search query (min 1 char). Matches against ticker and company name. |

**Response:**
```json
{
  "data": [
    { "ticker": "TSM", "name": "Taiwan Semiconductor", "sector": "Information Technology" },
    { "ticker": "MU", "name": "Micron Technology", "sector": "Information Technology" }
  ],
  "meta": { "count": 2 }
}
```

Returns up to 20 matches. Case-insensitive partial match.

**Example:** `GET /api/explore/search?q=apple` returns AAPL. `GET /api/explore/search?q=semi` returns TSM.

**Use for**: Search bar, entity autocomplete, ticker lookup.

---

## Enrichment Schema (Stream 1)

Every article's `enrichment` field contains these sub-objects:

### entities[]

```json
{
  "entity_id": "AAPL",
  "surface_form": "Apple",
  "canonical_name": "Apple Inc.",
  "role": "PRIMARY_SUBJECT",
  "sentiment": "NEGATIVE",
  "role_confidence": 0.95,
  "context_snippet": "Apple faces supply disruption..."
}
```

| Field | Values | Description |
|-------|--------|-------------|
| `role` | `PRIMARY_SUBJECT`, `MENTIONED` | Is this entity the main subject? |
| `sentiment` | `POSITIVE`, `NEGATIVE`, `NEUTRAL` | Detected from headline keywords |
| `role_confidence` | 0.75 - 0.95 | Higher for PRIMARY_SUBJECT |

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

**Signal types (10):** `EARNINGS_REPORT`, `M_AND_A`, `REGULATORY`, `SUPPLY_DISRUPTION`, `LEADERSHIP_CHANGE`, `PRODUCT_LAUNCH`, `PARTNERSHIP`, `AI_TECHNOLOGY`, `GEOPOLITICAL`, `MARKET_MOVEMENT`, `GENERAL_NEWS`

**Directions:** `POSITIVE`, `NEGATIVE`, `NEUTRAL`

**Magnitude:** `major`, `moderate`, `minor`

**Timeframe:** `near_term`, `medium_term`, `long_term`

Max 2 signals per article (primary + secondary).

### graph_contexts{}

Keyed by ticker. Shows supply chain map for each entity.

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

`null` if no contradiction detected. Otherwise:

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

## Knowledge Graph

27 companies with ~55 relationships. The graph ensures realistic multi-hop paths.

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
```

---

## Frontend Integration Patterns

### Pattern 1: Dashboard Home Page

```javascript
// On mount - parallel requests
const [health, digest, exposure, risks] = await Promise.all([
  fetch('/api/health').then(r => r.json()),
  fetch('/api/digest/today').then(r => r.json()),
  fetch('/api/risk/exposure').then(r => r.json()),
  fetch('/api/risk/alerts').then(r => r.json()),
]);

// Render sections from digest.data.sections
// Render pie chart from exposure.data.by_sector
// Render risk cards from risks.data (filter by severity)
```

### Pattern 2: Article Detail Page

```javascript
// On article click - parallel requests
const [article, relevance, summary] = await Promise.all([
  fetch(`/api/articles/${id}`).then(r => r.json()),
  fetch(`/api/articles/${id}/relevance`).then(r => r.json()),
  fetch(`/api/articles/${id}/summary`).then(r => r.json()),
]);

// article.data.enrichment -> entities, signals, graph, narrative
// relevance.data.per_holding_relevance -> tier badges per holding
// summary.data -> "why this matters" cards per holding
```

### Pattern 3: Graph Explorer

```javascript
// User clicks entity in article
const entity = await fetch(`/api/explore/entity/${ticker}`).then(r => r.json());

// entity.data.graph.relationships -> render graph nodes
// entity.data.graph.second_hop_connections -> render extended paths
// entity.data.in_portfolio -> highlight if user owns this

// Search bar
const results = await fetch(`/api/explore/search?q=${query}`).then(r => r.json());
```

### Pattern 4: Notification System

```javascript
// Poll for new alerts (or on page load)
const alerts = await fetch('/api/alerts/history?limit=20').then(r => r.json());
const unread = alerts.data.filter(a => new Date(a.triggered_at) > lastSeen);

// Badge count = unread.length
// Click -> show alert with link to article
```

### Pattern 5: Infinite Scroll Article Feed

```javascript
let offset = 0;
const PAGE_SIZE = 20;

async function loadMore(ticker = null) {
  const params = new URLSearchParams({ limit: PAGE_SIZE, offset });
  if (ticker) params.set('ticker', ticker);

  const resp = await fetch(`/api/articles?${params}`).then(r => r.json());
  offset += resp.data.length;
  return resp.data; // append to list
}
```

---

## Environment Variables (Docker)

| Variable | Default | Description |
|----------|---------|-------------|
| `SCRAPER_BASE` | `http://159.89.162.233:5000/api/v1` | Scraper API base URL |
| `SCRAPER_KEY` | _(built-in)_ | Scraper API key |
| `DB_DIR` | `/app/data` (Docker) or `.` (local) | SQLite database directory |
| `POLL_INTERVAL` | `300` | Seconds between scraper polls |

---

## Data Lifecycle

```
Scraper API (live, external)
  |
  |  Every 5 min: GET /articles/feed?ticker=<27 tickers>
  |  Returns ~2-4 real articles per poll
  v
Mock Service ingests
  |
  |  1. Store raw article
  |  2. Run enrichment (entities, signals, graph, narrative, history, contradiction)
  |  3. Run processing (relevance, discovery, risk, alerts, summaries)
  |  4. Store everything to SQLite
  v
API serves from SQLite
  |
  |  All endpoints query the local DB
  |  Digest/discovery/risk aggregate today's data on each request
  |  Exposure is static (recomputed on call from portfolio weights)
  v
Frontend consumes
```

**First startup**: Backfills all historical articles for the 27 watchlist tickers. Takes ~2-5 minutes to ingest ~1500+ articles. API is usable immediately (returns whatever's ingested so far).

**Steady state**: ~2-4 new articles every 5 minutes. All endpoints always return data.

**Reset**: Delete `mock_intelligence.db` (or the Docker volume) and restart. Fresh backfill.
