# Intelligence Pipeline — Product Specification

> **Audience**: Human developers and AI agents building/maintaining the Intelligence Pipeline.
> **Status**: API contract is fixed. Pipeline internals may be restructured based on further analysis.
> **Last updated**: 2026-02-19

---

## 1. What Intelligence Powers in HiveMind

HiveMind is a portfolio tracking SaaS. The Intelligence Pipeline ingests financial news, enriches it, and serves personalized intelligence to users based on their portfolio holdings. Every feature below depends on the pipeline producing accurate, structured data.

### 1.1 Dashboard — Portfolio-Scoped Features

All dashboard features are scoped to the user's selected portfolio. When the user switches portfolios, all intelligence data re-fetches with the new holdings + weights.

#### Today's Summary
- Groups direct news articles by holding (stock ticker)
- Per holding: dominant sentiment (positive/negative/neutral), average relevance score, top headline + summary, confidence percentage
- **Data dependency**: `POST /api/dashboard` → `digest.sections.direct_news[]`
- **Fields consumed per item**: `article_id`, `headline`, `summary`, `relevance_score`, `affected_holdings[]`, `sentiment`, `magnitude`

#### Critical News (Top 3)
- The 3 highest-relevance articles directly about portfolio holdings
- Shows sentiment icon, impact tier (High/Medium/Low), source, affected tickers, relative timestamp
- **Data dependency**: `POST /api/dashboard` → `digest.sections.direct_news[]` (first 3)
- **Fields consumed per item**: `article_id`, `headline`, `sentiment`, `magnitude`, `source`, `affected_holdings[]`, `published_at`

#### Sector News Feed
- Paginated article feed (30 per page, progressive "Load More")
- Grouped by entity/sector name
- Filterable by ticker, sortable by time/impact/relevance, sentiment filter
- Links to original article URLs
- **Data dependency**: `GET /api/articles` (paginated) + `POST /api/dashboard` → `digest.sections.sector_context[]` (supplemental)
- **Fields consumed per article**: `id`, `title`, `summary`, `published_at`, `source`, `url`, `tickers[]`, `enrichment.signals[0].magnitude_category`, `enrichment.signals[0].direction`, `enrichment.entities[0].canonical_name`

#### Stock News Feed
- Per-ticker article feed (20 articles), re-fetches on ticker change
- Shows signal type badges (e.g. "Earnings", "Supply Chain"), sentiment, impact
- Filterable/sortable, external links to original articles
- **Data dependency**: `GET /api/articles?ticker=<SYMBOL>&limit=20`
- **Fields consumed per article**: `id`, `title`, `summary`, `published_at`, `source`, `url`, `tickers[]`, `enrichment.signals[0].direction`, `enrichment.signals[0].magnitude_category`, `enrichment.signals[0].signal_type`

#### Impact Analysis (3-tab panel)

**Signal Radar tab**:
- Radar chart of signal types with article counts + sentiment breakdown (positive/negative/neutral per type)
- Portfolio summary stats: total articles analyzed, net sentiment, top opportunity signal, top risk signal, signal diversity count
- **Data dependency**: `POST /api/signals/aggregate` → `by_signal_type`, `portfolio_summary`
- **Fields consumed**: per signal type: `article_count`, `positive`, `negative`, `neutral`, `dominant_direction`, `dominant_magnitude`. Summary: `total_articles_analyzed`, `net_sentiment`, `top_opportunity`, `top_risk`, `signal_diversity`

**Signal Heatmap tab**:
- Grid: rows = holdings, columns = signal types, cells = article count color-coded by sentiment
- Per-holding stats: total articles, dominant signal, opportunity vs risk signal counts
- **Data dependency**: `POST /api/signals/aggregate` → `by_holding`, `by_signal_type`
- **Fields consumed**: per holding: `total_articles`, `dominant_signal`, `opportunity_signals`, `risk_signals`. Cross-referenced with `by_signal_type` for cell values.

**Signal Timeline tab**:
- Collapsible event groups by signal type
- Each event: headline, summary, relative time, source, affected holding badges
- Risk alerts shown with red marker
- Supports 7d / 14d / 30d lookback (14d and 30d trigger separate fetches)
- **Data dependency**: `POST /api/dashboard` → `digest.sections.direct_news[]`, `alerts[]` + `POST /api/signals/aggregate` (for day ranges)
- **Fields consumed**: direct_news: `article_id`, `headline`, `summary`, `affected_holdings[]`, `sentiment`, `signal_type`, `published_at`, `source`. Alerts: `trigger_article_id`, `trigger_headline`, `explanation`, `affected_holdings[]`, `correlation_type`

#### Portfolio Impact Summary
- 4-stat grid: net sentiment, articles analyzed, signal diversity, top signal + alert count badge
- **Data dependency**: `POST /api/signals/aggregate` → `portfolio_summary` + `POST /api/dashboard` → `alerts[].length`
- **Fields consumed**: `net_sentiment`, `total_articles_analyzed`, `signal_diversity`, `top_opportunity`, alert count

#### Portfolio Overview
- Narrative text summarizing developing stories, risk assessment, intelligence summary
- **Data dependency**: `POST /api/dashboard` → `narratives[]`, `digest.sections.developing_stories[]`, `alerts[]` + `POST /api/signals/aggregate` → `portfolio_summary`
- **Fields consumed**: narratives: `title`, `primary_ticker`, `article_count`, `sentiment_trajectory`, `status`. Stories: `narrative_id`, `title`, `article_count`, `affected_holdings[]`. Alerts: count, `[0].cause_description`, `[0].severity_tier`. Summary: `net_sentiment`, `top_opportunity`, `top_risk`

#### Alert Bell (Notification Badge)
- Unread notification count derived from `alert_history` timestamps vs last-seen (localStorage)
- **Data dependency**: `POST /api/dashboard` → `alert_history[]`
- **Fields consumed**: `triggered_at` per alert

### 1.2 Stock Screener — Multi-Stock Comparison

#### News-Annotated Comparison Chart
- Dual-stock normalized % change chart (lightweight-charts v5)
- Toggleable news markers overlaid on chart: colored by sentiment (green/red/yellow), sized by impact
- Smart-paginated article feed per ticker (100 per page, range-aware: 1D/1W/1M/3M/All)
- Per-stock article columns with count display ("X of Y total"), sortable by newest/oldest/impact
- **Data dependency**: `GET /api/articles?ticker=<SYMBOL>&limit=100&offset=<N>` (paginated per ticker) + `POST /api/dashboard` → `digest.sections.direct_news[]` (supplemental)
- **Fields consumed per article**: `id`, `title`, `summary`, `published_at`, `url`, `tickers[]`, `enrichment.signals[0].direction`, `enrichment.signals[0].magnitude_category`
- **Critical**: `meta.total` must be accurate — used for "X of Y total" display and pagination math

### 1.3 Stock Detail Pages

#### Stock Chart with News Markers + Latest News
- Area/Candlestick/Line chart with news event markers (arrows/circles at article dates)
- "News Events in View" legend: scrollable list of articles in the current chart time range
- Up to 6 latest articles listed below chart with external links
- **Data dependency**: `GET /api/articles?ticker=<SYMBOL>&limit=6` (called server-side, NOT via BFF proxy)
- **Fields consumed**: `id`, `title`, `source`, `published_at`, `url`, `enrichment.signals[0].direction` (→ sentiment), `enrichment.signals[0].magnitude_category` (→ marker size)

### 1.4 Article Detail (Exists, Not Yet Wired to UI)

#### Per-Holding Relevance + Personalized Summaries
- Combined article + relevance scoring + per-holding "why this matters" summaries in one call
- BFF route exists and is functional, but no frontend component calls it yet
- **Data dependency**: `GET /api/articles/{id}/full` (with portfolio context via `X-Portfolio` header)
- **Fields consumed**: `article` (full enrichment), `relevance.overall_relevance_score`, `relevance.per_holding_relevance[]` (tier, score, relationship_path, explanation), `summaries[]` (holding_ticker, summary, action_context, confidence)

### 1.5 Entity Discovery (Roadmap)

#### Discover Entities Outside Portfolio
- Surfaces entities NOT in the user's portfolio that connect to 2+ holdings via supply chain or competition
- API endpoint exists (`GET /api/discovery/today`), no frontend component yet
- **Data dependency**: `GET /api/discovery/today` (with portfolio via `X-Portfolio` header)
- **Fields consumed**: `discovered_entity_name`, `discovered_entity_ticker`, `discovery_type`, `discovery_score`, `connected_holdings[]`, `path_to_portfolio[]`, `explanation`

---

## 2. API Contract

The frontend consumes the Intelligence Pipeline through a BFF (Backend-for-Frontend) proxy layer. The Next.js API routes inject portfolio context (holdings + weights) server-side, so the frontend never sends raw portfolio data to the Intelligence API directly.

### 2.1 Endpoints — Complete Reference

| # | Method | Path | Auth | Portfolio | Used By |
|---|--------|------|------|-----------|---------|
| 1 | GET | `/api/health` | No | No | Health check |
| 2 | GET | `/api/articles` | Yes | No | SectorNews, StockNews, Screener, StockDetail |
| 3 | GET | `/api/articles/{id}` | Yes | No | (Available, not actively called) |
| 4 | GET | `/api/articles/{id}/full` | Yes | Header | Article detail (BFF ready, UI pending) |
| 5 | GET | `/api/articles/{id}/relevance` | Yes | Header | (Available, not actively called) |
| 6 | GET | `/api/articles/{id}/summary` | Yes | Header | (Available, not actively called) |
| 7 | GET | `/api/discovery/today` | Yes | Header | Entity discovery (roadmap) |
| 8 | GET | `/api/risk/alerts` | Yes | Header | (Consumed via dashboard batch) |
| 9 | GET | `/api/risk/exposure` | Yes | Header | (Consumed via dashboard batch) |
| 10 | GET | `/api/digest/today` | Yes | Header | (Consumed via dashboard batch) |
| 11 | GET | `/api/alerts/history` | Yes | Header | (Consumed via dashboard batch) |
| 12 | GET | `/api/narratives/active` | Yes | No | (Consumed via dashboard batch) |
| 13 | GET | `/api/portfolios` | Yes | No | Portfolio listing |
| 14 | GET | `/api/portfolios/{id}/holdings` | Yes | No | Portfolio holdings |
| 15 | GET | `/api/explore/entity/{ticker}` | Yes | No | (Available, not actively called) |
| 16 | GET | `/api/explore/search` | Yes | No | (Available, not actively called) |
| 17 | POST | `/api/dashboard` | Yes | Body | **Primary** — batch endpoint for all dashboard data |
| 18 | POST | `/api/signals/aggregate` | Yes | Body | Impact analysis, portfolio summary |

**"Header"** = portfolio sent via `X-Portfolio: AAPL:30,GOOGL:25,...` header.
**"Body"** = portfolio sent as `{ holdings: [{ ticker, weight_pct }], ... }` in POST body.

### 2.2 Primary Data Flow

```
User selects portfolio in UI
         │
         ▼
IntelligenceDataProvider (polls every 5 min)
         │
         ├── GET /api/intelligence/dashboard?portfolioId=X
         │     └── BFF loads holdings from DB, computes weights
         │     └── POST /api/dashboard { holdings, include: [all 5 sections] }
         │     └── Returns: digest, exposure, alerts, narratives, alert_history
         │
         └── GET /api/intelligence/signals/aggregate?portfolioId=X&days=7
               └── BFF loads holdings from DB
               └── POST /api/signals/aggregate { holdings, days: 7 }
               └── Returns: by_signal_type, by_holding, portfolio_summary
         │
         ▼
React context distributes data to all dashboard panels
```

```
User views articles (Sector/Stock News, Screener)
         │
         ▼
Component fetches directly:
  GET /api/intelligence/articles?ticker=AAPL&limit=100&offset=0
         │
         ▼
Returns: Article[] with enrichment (entities, signals, graph, narrative)
```

```
User views stock detail page (server-side)
         │
         ▼
Route handler fetches directly (NOT via BFF proxy):
  GET /api/articles?ticker=AAPL&limit=6
         │
         ▼
Returns: Article[] used for chart markers + latest news list
```

### 2.3 Caching (BFF Layer)

| BFF Route | Server Cache TTL | Fallback |
|-----------|-----------------|----------|
| `/api/intelligence/dashboard` | 2 min | Stale cache → mock data |
| `/api/intelligence/signals/aggregate` | 5 min | Stale cache → mock signals |
| `/api/intelligence/articles` | 1 min | Empty array (no mock fallback) |
| `/api/intelligence/articles/[id]/full` | Portfolio-hash-keyed | Empty (no mock fallback) |

### 2.4 Stale Detection

- Frontend: data older than 10 min shows a "stale" badge, triggers auto-refresh
- BFF: returns `X-Data-Stale: true` header when serving cached data beyond TTL
- Visibility change: re-fetches if tab was hidden and data exceeds stale threshold

---

## 3. Enrichment Schema — Full Output Contract

Every article must be enriched with the following structure. All fields are required in the output (use `null` or `[]` where not applicable).

### 3.1 Article Base

```typescript
interface Article {
  id: number;
  url: string;
  title: string;
  summary: string;              // HTML-sanitized, entities decoded
  source: string;
  published_at: string;         // ISO 8601
  fetched_at: string;           // ISO 8601
  classified_at: string;        // ISO 8601
  tickers: string[];            // All tickers mentioned (from the 27→50→500 watchlist)
  enrichment: Enrichment;
  created_at: string;
}
```

### 3.2 Enrichment Object

```typescript
interface Enrichment {
  entities: Entity[];
  signals: Signal[];            // Max 2 per article
  graph_contexts: Record<string, GraphContext>;  // Keyed by ticker
  narrative: Narrative | null;
  contradiction: Contradiction | null;
  historical_patterns: HistoricalPattern[];
}
```

### 3.3 Entity Extraction

```typescript
interface Entity {
  entity_id: string;            // Ticker symbol
  surface_form: string;         // As it appeared in text ("Apple")
  canonical_name: string;       // Full name ("Apple Inc.")
  role: "PRIMARY_SUBJECT" | "MENTIONED";
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  role_confidence: number;      // 0.75 - 0.95
  context_snippet: string;      // Excerpt showing entity in context
}
```

**Quality requirement**: Entity extraction drives downstream features (relevance scoring, signal attribution, graph context). Accuracy here is critical.

### 3.4 Signal Classification

```typescript
interface Signal {
  signal_type: SignalType;
  direction: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  magnitude_category: "major" | "moderate" | "minor";
  primary_entity_name: string;
  evidence_snippet: string;
  signal_timeframe: "near_term" | "medium_term" | "long_term";
}

type SignalType =
  | "EARNINGS_REPORT"
  | "M_AND_A"
  | "REGULATORY"
  | "SUPPLY_DISRUPTION"
  | "LEADERSHIP_CHANGE"
  | "PRODUCT_LAUNCH"
  | "PARTNERSHIP"
  | "AI_TECHNOLOGY"
  | "GEOPOLITICAL"
  | "MARKET_MOVEMENT"
  | "GENERAL_NEWS";
```

**Constraint**: Max 2 signals per article.

**Quality requirement**: Signal type + direction + magnitude are rendered directly in the UI as badges, chart marker colors, and radar chart axes. Misclassification is immediately visible to the user.

### 3.5 Knowledge Graph Context

```typescript
interface GraphContext {
  supplier_count: number;
  customer_count: number;
  relationships: Relationship[];
  second_hop_connections: SecondHop[];
}

interface Relationship {
  type: "SUPPLIED_BY" | "SUPPLIES_TO" | "COMPETES_WITH";
  other: string;                // Ticker
  significance: "critical" | "important";
}

interface SecondHop {
  target: string;               // Ticker
  via: string;                  // Intermediate ticker
  path: string;                 // e.g. "AAPL<-TSM->NVDA"
}
```

**Graph structure**: Static knowledge graph with entity layer and weight layer. Starting with 50 S&P 500 companies, scaling to 500. Relationships are supply chain (directed) and competitive (bidirectional).

### 3.6 Narrative Grouping

```typescript
interface Narrative {
  narrative_id: string;
  title: string;
  is_new_narrative: boolean;
  narrative_position: number;   // Article's position in the narrative (1-indexed)
  status: "emerging" | "developing" | "established";  // 1-2, 3-5, 6+ articles
  sentiment_trajectory: "improving" | "worsening" | "mixed" | "stable";
}
```

**Purpose**: Groups related articles into developing stories. Used by Portfolio Overview ("N developing stories across your holdings") and the dashboard batch endpoint's `developing_stories` section.

### 3.7 Contradiction Detection

```typescript
interface Contradiction {
  contradicting_article_id: number;
  contradicting_headline: string;
  contradiction_type: string;   // e.g. "sentiment_reversal"
  confidence: number;
}
// null if no contradiction found
```

### 3.8 Historical Pattern Matching

```typescript
interface HistoricalPattern {
  past_headline: string;
  similarity_score: number;
  narrative_duration_days: number;
  narrative_resolution: string; // e.g. "When Apple faced comparable Supply Disruption in Q3 2023, stock recovered 8% within 4 weeks."
}
```

---

## 4. Aggregated / Computed Endpoints — Output Contracts

These endpoints produce computed views over the enriched article corpus. They are portfolio-aware.

### 4.1 Dashboard Batch (`POST /api/dashboard`)

**Input**:
```json
{
  "holdings": [{ "ticker": "AAPL", "weight_pct": 30 }, ...],
  "include": ["digest", "exposure", "alerts", "narratives", "alert_history"]
}
```

**Output sections**:

#### `digest` — Daily Briefing
```typescript
interface Digest {
  digest_id: string;
  generated_at: string;
  sections: {
    direct_news: DigestItem[];      // Max 10. Articles directly ABOUT holdings.
    related_news: DigestItem[];     // Max 15. Supply chain / competitor articles.
    risk_alerts: RiskAlert[];       // Max 5. Medium+ severity.
    developing_stories: DevelopingStory[];  // Max 5. Narratives with 2+ articles.
    discovery: DiscoveryItem[];     // Max 5. Entities outside portfolio.
    sector_context: DigestItem[];   // Max 5. Sector-level articles.
  };
}

interface DigestItem {
  article_id: number;
  headline: string;
  relevance_score: number;
  affected_holdings: string[];
  summary: string;
  sentiment?: SignalDirection;      // Derived from article's primary signal
  magnitude?: string;
  signal_type?: string;
  source?: string;
  published_at?: string;
}
```

#### `exposure` — Portfolio Concentration
```typescript
interface Exposure {
  by_sector: Record<string, { exposure_pct: number; holdings: string[]; trend: string }>;
  by_geography: Record<string, { exposure_pct: number }>;
  concentration_risks: ConcentrationRisk[];
}

interface ConcentrationRisk {
  risk_type: "sector" | "supplier" | "geographic";
  category: string;
  exposure_pct?: number;
  dependent_holdings?: string[];
  severity: "critical" | "high" | "medium" | "low";
  description: string;
}
```

#### `alerts` — Risk Alerts
```typescript
interface RiskAlert {
  alert_id: string;
  correlation_type: "shared_supplier" | "sector_concentration";
  trigger_article_id: number;
  trigger_headline: string;
  affected_holdings: string[];
  combined_portfolio_exposure_pct: number;
  severity_tier: "critical" | "high" | "medium" | "low";
  cause_description: string;
  explanation: string;
}
```

**Severity logic**:
| Severity | Condition |
|----------|-----------|
| `critical` | 3+ holdings affected AND >30% exposure AND negative signal |
| `high` | 2+ holdings AND >15% exposure |
| `medium` | Any shared dependency detected |
| `low` | Sector-level correlation only |

#### `narratives` — Active Developing Stories
```typescript
interface ActiveNarrative {
  narrative_id: string;
  title: string;
  primary_ticker: string;
  signal_type: string;
  article_count: number;
  first_seen: string;
  last_updated: string;
  status: "emerging" | "developing" | "established";
  sentiment_trajectory: "improving" | "worsening" | "mixed" | "stable";
}
```

#### `alert_history` — Triggered Notifications
```typescript
interface TriggeredAlert {
  alert_id: string;
  rule_id: string;
  trigger_type: "direct_mention" | "relevance_threshold" | "sector_news" | "narrative_update";
  triggered_at: string;
  article_id: number;
  headline: string;
  matched_holdings: string[];
  severity: string;
  summary: string;
}
```

### 4.2 Signal Aggregation (`POST /api/signals/aggregate`)

**Input**:
```json
{
  "holdings": [{ "ticker": "AAPL", "weight_pct": 30 }, ...],
  "days": 7
}
```

**Output**:
```typescript
interface SignalAggregation {
  by_signal_type: Record<SignalType, {
    article_count: number;
    positive: number;
    negative: number;
    neutral: number;
    dominant_direction: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
    dominant_magnitude: string;
    affected_holdings: string[];
    trend: string;
    latest_headline: string;
  }>;
  by_holding: Record<string, {
    total_articles: number;
    net_sentiment: number;
    dominant_signal: string;
    risk_signals: number;
    opportunity_signals: number;
  }>;
  portfolio_summary: {
    total_articles_analyzed: number;
    net_sentiment: number;
    top_opportunity: string;
    top_risk: string;
    signal_diversity: number;
  };
}
```

### 4.3 Article Full (`GET /api/articles/{id}/full`)

**Input**: Article ID in path, portfolio via `X-Portfolio` header.

**Output**:
```typescript
interface ArticleFull {
  article: Article;               // Full article with enrichment
  relevance: {
    article_id: number;
    user_id: string;
    overall_relevance_score: number;
    per_holding_relevance: {
      holding_ticker: string;
      relevance_tier: 1 | 2 | 3 | 4 | 5 | 6 | 7;
      relevance_score: number;
      relationship_path: string;
      explanation: string;
    }[];
  };
  summaries: {
    holding_ticker: string;
    summary: string;              // "Why this matters to your TICKER stake"
    action_context: string;
    confidence: number;
  }[];                            // Only for tier 1-5 connections
}
```

**Relevance tiers** (used for scoring and explanation):

| Tier | Name | Score Range | Meaning |
|------|------|-------------|---------|
| 1 | Direct Primary | 0.80 - 0.95 | Article is ABOUT a holding |
| 2 | Direct Secondary | 0.80 - 0.95 | Holding is mentioned but not the main subject |
| 3 | Supply Chain | 0.55 - 0.75 | Connected via supply chain (1 hop) |
| 4 | Competitive | 0.45 - 0.60 | Competes with a holding |
| 5 | Shared Dependency | 0.35 - 0.50 | Connects to 2+ holdings via same intermediary |
| 6 | Sector | 0.20 - 0.35 | Same sector as a holding |
| 7 | Second-Hop | 0.10 - 0.25 | Connected through 2 hops in supply chain |

### 4.4 Entity Discovery (`GET /api/discovery/today`) — Roadmap

**Output**:
```typescript
interface Discovery {
  discovered_entity_name: string;
  discovered_entity_ticker: string;
  discovery_type: string;         // e.g. "supply_chain"
  discovery_score: number;
  connected_holdings: string[];
  path_to_portfolio: { from: string; relationship: string; to: string }[];
  explanation: string;
}
```

---

## 5. Knowledge Graph

### 5.1 Structure

Static graph with two layers:
- **Entity layer**: Companies with metadata (ticker, name, sector, industry, geography, market_cap)
- **Weight layer**: Relationship strengths and types

### 5.2 Relationship Types

| Type | Direction | Meaning |
|------|-----------|---------|
| `SUPPLIED_BY` | Directed | Other company supplies this entity |
| `SUPPLIES_TO` | Directed | This entity supplies the other |
| `COMPETES_WITH` | Bidirectional | Competitors |

Significance: `critical` (high dependency) or `important` (notable).

### 5.3 Scope

- **Current (demo)**: 27 tickers, ~55 relationships
- **Phase 1**: 50 S&P 500 companies
- **Phase 2**: Full S&P 500 (500 companies)

The graph must scale with the ticker scope. Articles mentioning tickers outside the graph are accepted but won't match supply chain or competitive relationships.

### 5.4 Graph Usage in Pipeline

The graph is used for:
1. **Enrichment** — `graph_contexts` per article: supply chain map for each mentioned entity
2. **Relevance scoring** — Tiers 3-7 are graph-derived (supply chain, competitive, shared dependency, sector, second-hop)
3. **Risk alerts** — `shared_supplier` and `sector_concentration` correlation types
4. **Discovery** — Entities outside portfolio connected to 2+ holdings
5. **Exposure analysis** — Supplier dependency risks

---

## 6. Data Source & Ingestion

### 6.1 Source

Single scraper API (same as demo):
- Base URL: configured via `SCRAPER_BASE` env var
- Polls for articles mentioning watched tickers
- Returns real financial news articles

### 6.2 Ingestion Flow

```
Scraper API
  │
  │  Poll at configured interval (currently 5 min)
  │  Returns real articles (~2-4 per poll)
  │
  ▼
Ingestion
  │
  │  1. Store raw article (HTML-sanitized summary)
  │  2. Ticker classification (which watched tickers are mentioned)
  │
  ▼
Enrichment Pipeline
  │
  │  3. Entity extraction (roles, sentiment, confidence)
  │  4. Signal classification (type, direction, magnitude, timeframe)
  │  5. Graph context generation (supply chain map per entity)
  │  6. Narrative assignment (group into developing stories)
  │  7. Contradiction detection (against prior articles)
  │  8. Historical pattern matching
  │
  ▼
Storage (PostgreSQL, possibly with pgvector)
  │
  ▼
API serves from storage
  │  GET endpoints query stored data
  │  POST endpoints compute on-the-fly from stored enrichment + portfolio weights
  │  Digest/discovery/risk aggregate recent data per request
  │  Exposure is computed dynamically from portfolio weights + graph
```

### 6.3 Freshness

- Ingestion polling: ~5 minutes (flexible)
- Frontend polling: 5 minutes with 10-minute stale threshold
- Cold start: must backfill historical articles and be usable within minutes
- Steady state: ~50-100 new articles per day

---

## 7. Storage

- **Database**: PostgreSQL (same technology as HiveMind app database, may be same or separate instance)
- **Vector extension**: pgvector may be used for embedding-based similarity (historical pattern matching, contradiction detection, narrative clustering)
- **Key tables** (logical, not prescriptive):
  - Articles (raw + metadata)
  - Enrichments (entities, signals, graph contexts per article)
  - Narratives (grouped story state)
  - Triggered alerts (notification history)
  - Knowledge graph (entities + relationships)

---

## 8. Quality Requirements

The pipeline prioritizes **accuracy and quality** above speed or cost. LLMs are used where they produce better results than rule-based approaches.

### 8.1 What Users See Directly

These fields are rendered as-is in the UI — errors are immediately visible:

| Field | Where It Appears | Impact of Error |
|-------|-----------------|-----------------|
| `signal_type` | Radar chart axes, badge labels, heatmap columns | Wrong chart shape, misleading categories |
| `signal.direction` | Chart marker colors (green/red/yellow), sentiment icons | Wrong visual signal on chart |
| `signal.magnitude_category` | Chart marker size, impact badges (High/Med/Low) | Wrong emphasis |
| `entity.sentiment` | Per-stock sentiment grouping in Today's Summary | Wrong stock-level sentiment |
| `entity.canonical_name` | Sector News grouping headers | Wrong article grouping |
| `relevance_score` | Percentage displayed, sort order, "Top 3" selection | Wrong article priority |
| `affected_holdings` | Ticker badges on every card, alert scoping | Missing or wrong stock attribution |
| `tickers[]` | Article filtering, chart marker placement, per-stock feeds | Articles missing from stock views |
| `meta.total` | "X of Y total" display, pagination math | Broken pagination UX |

### 8.2 Computed Quality

| Computation | Depends On | Used For |
|-------------|-----------|----------|
| Risk alerts | Graph + signals + portfolio weights | Alert severity, bell badge count |
| Exposure analysis | Graph + portfolio weights | Sector/geography/supplier concentration |
| Net sentiment | All signals across holdings | Portfolio-level sentiment stat |
| Signal aggregation | All signals over N days | Radar, heatmap, timeline |
| Narrative grouping | Article similarity + entity overlap | Developing stories count, trajectory |

---

## 9. Response Envelope

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

- `count`: present when `data` is an array (items returned in this response)
- `total`: present on paginated endpoints (total matching rows — critical for pagination math)

**Error responses**:
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
| 401 | `UNAUTHORIZED` | Missing or invalid API key |
| 400 | `MISSING_HOLDINGS` | POST body missing `holdings` array |
| 400 | `INVALID_INCLUDE` | Unknown section name in `include` |
| 404 | `NOT_FOUND` | Article or entity not found |
| 422 | (Validation) | Malformed request body |

---

## 10. Authentication

All endpoints except `/api/health` require an API key.

| Header | Value |
|--------|-------|
| `X-API-Key` | Configured via `INTELLIGENCE_API_KEY` env var |

Development default: `hm-dev-key-change-in-prod`

---

## 11. Summary — What the Pipeline Must Produce

For the frontend to work correctly, the Intelligence Pipeline must:

1. **Ingest** articles from the scraper, classify tickers, sanitize HTML
2. **Extract entities** with roles, sentiment, confidence, context snippets
3. **Classify signals** (11 types, 3 directions, 3 magnitudes, 3 timeframes) — max 2 per article
4. **Generate graph contexts** per mentioned entity using the knowledge graph
5. **Assign narratives** (group articles into developing stories with trajectory)
6. **Detect contradictions** against prior articles
7. **Match historical patterns** with similarity scores and resolution descriptions
8. **Compute relevance** per article against user portfolio (7-tier scoring using graph)
9. **Generate personalized summaries** per holding for tier 1-5 connections
10. **Aggregate signals** over configurable time windows per portfolio
11. **Produce daily digest** with 6 curated sections scoped to portfolio
12. **Detect risk alerts** from correlated negative signals across holdings
13. **Analyze exposure** concentration by sector, geography, supplier dependency
14. **Track triggered alerts** for notification history
15. **Discover entities** outside portfolio that connect to 2+ holdings (roadmap)
16. **Serve all above** through the 18-endpoint REST API with consistent envelope, pagination, and caching headers
