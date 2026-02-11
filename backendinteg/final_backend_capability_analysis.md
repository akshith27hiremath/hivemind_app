# Backend Capability Analysis — Hivemind Intelligence API

## 1. Endpoint Inventory

### 1.1 Complete Endpoint Table

| # | Method | Path | Auth | Pagination | Filtering | Mutations | Idempotent |
|---|--------|------|------|-----------|-----------|-----------|------------|
| 1 | GET | `/api/health` | None | No | No | No | Yes |
| 2 | GET | `/api/articles` | None | Yes (limit/offset) | Yes (ticker) | No | Yes |
| 3 | GET | `/api/articles/{id}` | None | No | No | No | Yes |
| 4 | GET | `/api/articles/{id}/relevance` | None | No | No | No | Yes |
| 5 | GET | `/api/articles/{id}/summary` | None | No | No | No | Yes |
| 6 | GET | `/api/discovery/today` | None | No | No | No | Yes* |
| 7 | GET | `/api/risk/alerts` | None | No | Yes (severity) | No | Yes* |
| 8 | GET | `/api/digest/today` | None | No | No | No | Yes* |
| 9 | GET | `/api/alerts/history` | None | Yes (limit) | No | No | Yes* |
| 10 | GET | `/api/risk/exposure` | None | No | No | No | Yes |
| 11 | GET | `/api/narratives/active` | None | No | No | No | Yes* |
| 12 | GET | `/api/portfolios` | None | No | No | No | Yes |
| 13 | GET | `/api/portfolios/{portfolio_id}/holdings` | None | No | No | No | Yes |
| 14 | GET | `/api/explore/entity/{ticker}` | None | No | No | No | Yes |
| 15 | GET | `/api/explore/search` | None | No | Yes (q) | No | Yes |

\* Idempotent for a given point in time. Results change as new articles are ingested (every ~5 min).

**Key observation**: This is a **read-only API**. Zero POST/PUT/PATCH/DELETE endpoints. No mutations whatsoever.

### 1.2 Authentication Model

**None.** The API has no authentication, no API keys, no tokens, no user identification mechanism.

The `user_id` field that appears in responses (e.g., `"usr_demo"`) is hardcoded. There is no way to pass a user identity. All responses are computed against a single static demo user/portfolio.

**Security implication**: This API MUST NOT be exposed to browser clients. It must be proxied through our Next.js API routes.

### 1.3 Rate Limits

**Not documented. Not mentioned.** Assume none exist. However, since this is a SQLite-backed service polling an external scraper, aggressive parallel requests could cause SQLite lock contention.

### 1.4 Error Structure

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Article 999999 not found"
  }
}
```

Only one error code is documented: `NOT_FOUND` (404). No other error codes are specified. No documentation for:
- 400 Bad Request (e.g., invalid ticker format, negative limit)
- 500 Internal Server Error
- 503 Service Unavailable (during backfill)
- 429 Too Many Requests

**Question**: What HTTP status codes does the API actually return for malformed requests?

### 1.5 Response Envelope

All successful responses use:
```json
{
  "data": { ... } | [ ... ],
  "meta": { "count": N }
}
```

**Ambiguity**: Is `meta.count` always present? Is it the count of items in `data`, or a total count (for pagination)? For `/api/articles`, if there are 1700 total articles but limit=20, does `meta.count` return 20 or 1700?

Based on the examples, `meta.count` appears to be the count of items returned in this response, NOT a total. **This means there is no way to know the total article count for pagination** without calling `/api/health` for `articles_count`.

### 1.6 Streaming Behavior

**None.** All endpoints return complete JSON responses. No Server-Sent Events, no WebSocket, no streaming.

### 1.7 Async/Webhook Mechanisms

**None.** No callback URLs, no webhook registration, no long-polling endpoints.

### 1.8 Data Freshness

- Scraper polls every 5 minutes (`POLL_INTERVAL=300`)
- ~2-4 new articles per poll
- All endpoints query SQLite on each request (no internal caching documented)
- First startup backfills ~1500+ articles over 2-5 minutes
- API is usable during backfill (returns whatever is ingested so far)

---

## 2. Detailed Endpoint Analysis

### 2.1 GET /api/articles

**Input**: `?ticker=AAPL,MSFT&limit=20&offset=0`
**Capability**: Paginated, filterable article feed with full enrichment.

**Output schema per article**:
- `id` (integer) — unique, from external scraper
- `url` (string) — original article URL
- `title` (string) — headline
- `summary` (string) — may contain HTML from source (**XSS risk**)
- `source` (string) — publisher name
- `published_at` (ISO string | null) — **nullable**, some articles lack publish date
- `fetched_at` (ISO string) — when scraper found it
- `classified_at` (ISO string) — when classified as FACTUAL
- `tickers` (string[]) — mentioned S&P 500 tickers
- `enrichment` (object) — full enrichment payload (see Section 3)
- `created_at` (ISO string) — when mock service processed it

**Ambiguities**:
- What happens when `ticker` param contains an unknown ticker? Empty result or error?
- What happens when `limit` exceeds 100 or is 0?
- Is `offset` 0-based?
- Can `tickers` array be empty?
- Can `summary` be null or empty?

### 2.2 GET /api/articles/{id}/relevance

**Critical design issue**: Computes relevance against the **hardcoded mock portfolio**, not the requesting user's actual portfolio. The `user_id: "usr_demo"` confirms this.

**Output**: `overall_relevance_score` (float 0-1) + `per_holding_relevance[]` with 7-tier scoring.

**Question**: Does this endpoint return relevance for ALL 10 mock holdings, or only those with non-zero relevance? The example shows 3 holdings — this suggests it filters to relevant ones only.

### 2.3 GET /api/articles/{id}/summary

**Same mock portfolio issue.** Generates per-holding personalized summaries for holdings in the mock portfolio, not the user's.

**Filtered**: Only generates summaries for tier 1-5 connections. Tier 6-7 are excluded.

### 2.4 GET /api/digest/today

**Most complex endpoint.** Returns 6 curated sections aggregated from all streams.

**Sections**: `direct_news` (10), `related_news` (15), `risk_alerts` (5), `developing_stories` (5), `discovery` (5), `sector_context` (5)

**Question**: What happens if called before any articles are ingested (cold start)? Empty sections or error?

**Question**: Is `digest_id` format always `dg_YYYY-MM-DD`? Can we use it for caching/deduplication?

### 2.5 GET /api/risk/exposure

**Static computation.** Recomputed from portfolio weights on each call. Since the portfolio is static, this endpoint always returns the same data.

**Contains 3 sub-structures**: `by_sector`, `by_geography`, `concentration_risks[]`

**Question**: The mock portfolio includes TSM (Taiwan) and XOM (Energy) which are NOT in our frontend's 10-stock list. Our system has TSLA and V instead. How will this affect exposure calculations?

### 2.6 GET /api/explore/entity/{ticker}

**Powerful endpoint.** Returns full graph context: supply chain, competitors, second-hop connections.

**27 entities in graph** with ~55 relationships. Includes companies NOT in the S&P 500 tracking list.

**Question**: Is `ticker` case-insensitive? Docs say yes, but untested for edge cases.

### 2.7 GET /api/alerts/history

**Question**: Are alerts deduplicated? Can the same article trigger multiple alert rules and appear multiple times?

**Question**: What is the retention period? Can historical alerts from weeks ago still appear?

---

## 3. Enrichment Schema (Per-Article)

Every article carries an `enrichment` object with 5 sub-structures:

### 3.1 entities[]
```typescript
{
  entity_id: string;        // ticker symbol
  surface_form: string;     // as mentioned in text
  canonical_name: string;   // official company name
  role: "PRIMARY_SUBJECT" | "MENTIONED";
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  role_confidence: number;  // 0.75 - 0.95
  context_snippet: string;  // excerpt from article
}
```

### 3.2 signals[]
```typescript
{
  signal_type: SignalType;  // 11 types (see below)
  direction: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  magnitude_category: "major" | "moderate" | "minor";
  primary_entity_name: string;
  evidence_snippet: string;
  signal_timeframe: "near_term" | "medium_term" | "long_term";
}
```

**Signal types**: `EARNINGS_REPORT`, `M_AND_A`, `REGULATORY`, `SUPPLY_DISRUPTION`, `LEADERSHIP_CHANGE`, `PRODUCT_LAUNCH`, `PARTNERSHIP`, `AI_TECHNOLOGY`, `GEOPOLITICAL`, `MARKET_MOVEMENT`, `GENERAL_NEWS`

Max 2 signals per article.

### 3.3 graph_contexts{}
Keyed by ticker. Each entry mirrors the `/api/explore/entity/{ticker}` graph structure.

### 3.4 narrative
```typescript
{
  narrative_id: string;           // "narr_XXXXXXXX"
  title: string;
  is_new_narrative: boolean;
  narrative_position: number;     // article's position in the narrative
  status: "emerging" | "developing" | "established";
  sentiment_trajectory: "improving" | "worsening" | "mixed" | "stable";
}
```

### 3.5 contradiction
`null` or:
```typescript
{
  contradicting_article_id: number;
  contradicting_headline: string;
  contradiction_type: string;     // e.g., "sentiment_reversal"
  confidence: number;             // 0-1
}
```

### 3.6 historical_patterns[]
```typescript
{
  past_headline: string;
  similarity_score: number;       // 0-1
  narrative_duration_days: number;
  narrative_resolution: string;   // human-readable historical context
}
```

---

## 4. TypeScript Interface Definitions

```typescript
// === Response Envelope ===

interface ApiResponse<T> {
  data: T;
  meta: { count: number };
}

interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// === Health ===

interface HealthData {
  status: "healthy";
  articles_count: number;
  last_poll: string;          // ISO datetime
  watchlist_size: number;
  portfolio_holdings: number;
  timestamp: string;          // ISO datetime
}

// === Articles ===

interface Article {
  id: number;
  url: string;
  title: string;
  summary: string;            // WARNING: may contain HTML
  source: string;
  published_at: string | null;
  fetched_at: string;
  classified_at: string;
  tickers: string[];
  enrichment: ArticleEnrichment;
  created_at: string;
}

interface ArticleEnrichment {
  entities: EnrichmentEntity[];
  signals: EnrichmentSignal[];
  graph_contexts: Record<string, EntityGraph>;
  narrative: EnrichmentNarrative | null;   // docs don't confirm nullability
  contradiction: EnrichmentContradiction | null;
  historical_patterns: HistoricalPattern[];
}

interface EnrichmentEntity {
  entity_id: string;
  surface_form: string;
  canonical_name: string;
  role: "PRIMARY_SUBJECT" | "MENTIONED";
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  role_confidence: number;
  context_snippet: string;
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

interface EnrichmentSignal {
  signal_type: SignalType;
  direction: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  magnitude_category: "major" | "moderate" | "minor";
  primary_entity_name: string;
  evidence_snippet: string;
  signal_timeframe: "near_term" | "medium_term" | "long_term";
}

interface GraphRelationship {
  type: "SUPPLIED_BY" | "SUPPLIES_TO" | "COMPETES_WITH";
  other: string;              // ticker
  significance: "critical" | "important";
}

interface SecondHopConnection {
  target: string;             // ticker
  via: string;                // intermediary ticker
  path: string;               // human-readable path
}

interface EntityGraph {
  supplier_count: number;
  customer_count: number;
  relationships: GraphRelationship[];
  second_hop_connections: SecondHopConnection[];
}

interface EnrichmentNarrative {
  narrative_id: string;
  title: string;
  is_new_narrative: boolean;
  narrative_position: number;
  status: "emerging" | "developing" | "established";
  sentiment_trajectory: "improving" | "worsening" | "mixed" | "stable";
}

interface EnrichmentContradiction {
  contradicting_article_id: number;
  contradicting_headline: string;
  contradiction_type: string;
  confidence: number;
}

interface HistoricalPattern {
  past_headline: string;
  similarity_score: number;
  narrative_duration_days: number;
  narrative_resolution: string;
}

// === Relevance ===

interface ArticleRelevance {
  article_id: number;
  user_id: string;
  overall_relevance_score: number;
  per_holding_relevance: HoldingRelevance[];
}

interface HoldingRelevance {
  holding_ticker: string;
  relevance_tier: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  relevance_score: number;
  relationship_path: string;
  explanation: string;
}

// === Summary ===

interface ArticleHoldingSummary {
  article_id: number;
  user_id: string;
  holding_ticker: string;
  summary: string;
  action_context: string;
  confidence: number;
}

// === Discovery ===

interface EntityDiscovery {
  discovered_entity_name: string;
  discovered_entity_ticker: string;
  discovery_type: "supply_chain" | "second_hop";
  discovery_score: number;
  connected_holdings: string[];
  path_to_portfolio: DiscoveryPath[];
  explanation: string;
}

interface DiscoveryPath {
  from: string;
  relationship: string;       // e.g., "SUPPLIES_TO"
  to: string;
}

// === Risk Alerts ===

type AlertSeverity = "critical" | "high" | "medium" | "low";
type CorrelationType = "shared_supplier" | "sector_concentration";

interface RiskAlert {
  alert_id: string;
  correlation_type: CorrelationType;
  trigger_article_id: number;
  trigger_headline: string;
  affected_holdings: string[];
  combined_portfolio_exposure_pct: number;
  severity_tier: AlertSeverity;
  cause_description: string;
  explanation: string;
}

// === Digest ===

interface DailyDigest {
  digest_id: string;          // "dg_YYYY-MM-DD"
  user_id: string;
  generated_at: string;
  sections: DigestSections;
}

interface DigestSections {
  direct_news: DigestNewsItem[];
  related_news: DigestNewsItem[];
  risk_alerts: RiskAlert[];             // subset of /api/risk/alerts
  developing_stories: DigestNarrative[];
  discovery: EntityDiscovery[];         // subset of /api/discovery/today
  sector_context: DigestNewsItem[];
}

interface DigestNewsItem {
  article_id: number;
  headline: string;
  relevance_score: number;
  affected_holdings: string[];
  summary: string;
}

interface DigestNarrative {
  narrative_id: string;
  title: string;
  article_count: number;
  sentiment_trajectory: "improving" | "worsening" | "mixed" | "stable";
  affected_holdings: string[];
}

// === Alert History ===

type AlertTriggerType =
  | "direct_mention"
  | "relevance_threshold"
  | "sector_news"
  | "narrative_update";

interface HistoricalAlert {
  alert_id: string;
  rule_id: string;
  trigger_type: AlertTriggerType;
  triggered_at: string;
  article_id: number;
  headline: string;
  matched_holdings: string[];
  severity: AlertSeverity;
  summary: string;
}

// === Risk Exposure ===

interface PortfolioExposure {
  user_id: string;
  computed_at: string;
  by_sector: Record<string, SectorExposure>;
  by_geography: Record<string, { exposure_pct: number }>;
  concentration_risks: ConcentrationRisk[];
}

interface SectorExposure {
  exposure_pct: number;
  holdings: string[];
  trend: "stable" | "increasing" | "decreasing";  // only "stable" shown in docs
}

interface ConcentrationRisk {
  risk_type: "sector" | "supplier" | "geographic";
  category: string;
  exposure_pct?: number;          // present for sector/geographic
  dependent_holdings?: string[];  // present for supplier
  severity: AlertSeverity;
  description: string;
}

// === Narratives ===

interface ActiveNarrative {
  narrative_id: string;
  title: string;
  primary_ticker: string;
  signal_type: SignalType;
  article_count: number;
  first_seen: string;
  last_updated: string;
  status: "emerging" | "developing" | "established";
  sentiment_trajectory: "improving" | "worsening" | "mixed" | "stable";
}

// === Portfolios (Mock) ===

interface MockPortfolio {
  portfolio_id: string;
  name: string;
  user_id: string;
  total_value: number;
  holdings_count: number;
}

interface MockHolding {
  ticker: string;
  name: string;
  sector: string;
  weight_pct: number;
  value: number;
}

// === Entity Explorer ===

interface EntityDetail {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  geography: string;
  market_cap_billion: number;
  in_portfolio: boolean;
  graph: EntityGraph;
}

interface EntitySearchResult {
  ticker: string;
  name: string;
  sector: string;
}
```

---

## 5. Schema Mismatches with Frontend

### 5.1 Portfolio Mismatch (CRITICAL)

**Intelligence API mock portfolio**:
| Ticker | Weight | Sector |
|--------|--------|--------|
| AAPL | 20% | Information Technology |
| MSFT | 18% | Information Technology |
| NVDA | 15% | Information Technology |
| GOOGL | 12% | Communication Services |
| AMZN | 10% | Consumer Discretionary |
| META | 8% | Communication Services |
| TSM | 7% | Information Technology |
| JPM | 5% | Financials |
| JNJ | 3% | Health Care |
| XOM | 2% | Energy |

**Frontend's available stocks**:
AAPL, MSFT, GOOGL, AMZN, NVDA, META, **TSLA**, JPM, **V**, JNJ

**Overlap**: 8 stocks (AAPL, MSFT, NVDA, GOOGL, AMZN, META, JPM, JNJ)
**Only in Intelligence API**: TSM, XOM
**Only in Frontend**: TSLA, V

**Impact**: Relevance scores, summaries, risk alerts, discovery, exposure, and digest are all computed against the wrong portfolio when the user holds TSLA or V. Articles about TSLA will be classified differently because the intelligence API doesn't consider TSLA a portfolio holding.

### 5.2 News Data Shape Mismatch

**Frontend expects** (from mock data):
```typescript
{ id, title, time: string, timestamp: number, source, impact: "high"|"medium"|"low",
  sentiment: "positive"|"negative"|"neutral", category: string, stocks: string[],
  sector?: string, relevance?: number }
```

**API provides** (in articles):
```typescript
{ id, title, published_at: string|null, source,
  enrichment.entities[].sentiment: "POSITIVE"|"NEGATIVE"|"NEUTRAL",
  enrichment.signals[].magnitude_category: "major"|"moderate"|"minor",
  tickers: string[] }
```

**Mismatches**:
- Frontend uses lowercase sentiment ("positive"), API uses uppercase ("POSITIVE")
- Frontend has `impact` ("high"/"medium"/"low"), API has `magnitude_category` ("major"/"moderate"/"minor")
- Frontend has `time` (relative string like "8 min ago"), API has `published_at` (ISO datetime)
- Frontend has `category` (free text), API has `signal_type` (enum)
- Frontend has `stocks[]`, API has `tickers[]` — same concept, different field name

### 5.3 Summary/Analysis Shape Mismatch

**Frontend expects** (TodaysSummary):
```typescript
{ stock, impact: "positive"|"negative", change: string, reason: string,
  news: string, confidence: number }
```

**API provides** (digest direct_news):
```typescript
{ article_id, headline, relevance_score, affected_holdings: string[], summary }
```

No direct mapping exists. The frontend expects per-stock change percentages and impact classifications. The API provides per-article relevance scores. A transformation layer is required.

### 5.4 Impact Analysis Shape Mismatch

**Frontend expects** (ImpactAnalysisPanel):
```typescript
{ stock, news, directImpact: number, sectorImpact: number, marketImpact: number,
  timeframe, confidence, factors: { name: string, value: number }[] }
```

**API provides**: No single endpoint matches this. Would need to be synthesized from:
- `/api/risk/exposure` for sector impact
- `/api/risk/alerts` for correlated risk
- Article enrichment signals for impact direction/magnitude

The 6-factor radar chart (Product Innovation, Market Demand, Competition, etc.) has **no API equivalent**. These factors are not present in any endpoint.

### 5.5 Notification Data Shape

**Frontend expects**: Nothing (decorative bell icon with no data)

**API provides** (`/api/alerts/history`):
```typescript
{ alert_id, rule_id, trigger_type, triggered_at, article_id, headline,
  matched_holdings[], severity, summary }
```

This is a clean integration opportunity — no existing expectations to conflict with.

---

## 6. What the API Can Definitively Do

1. Serve real, enriched financial news articles with entities, signals, and graph context
2. Score article relevance against a fixed portfolio (7-tier system)
3. Generate per-holding personalized summaries for articles
4. Detect correlated risks across portfolio holdings
5. Compute portfolio exposure by sector and geography
6. Track developing narrative threads across multiple articles
7. Discover entities not in portfolio that connect to holdings
8. Fire rule-based alerts on article patterns
9. Provide daily curated digest with 6 sections
10. Expose a 27-entity knowledge graph with supply chain relationships
11. Search entities by name or ticker

## 7. What the API Cannot Do

1. Accept user-specific portfolio data (hardcoded to `usr_demo`)
2. Authenticate users or scope data per-user
3. Provide real-time stock price data (no price endpoints)
4. Provide intraday price data for screener charts
5. Provide historical factor analysis (radar chart data)
6. Generate per-stock price impact percentages
7. Support write operations (create alerts, bookmark articles, etc.)
8. Support user-configurable alert rules
9. Provide article full text (only title + summary)
10. Calculate actual portfolio P&L or holdings value

## 8. What Is Unclear or Underspecified

1. **Does `meta.count` represent total or page count?** — Critical for pagination UX
2. **Error codes beyond NOT_FOUND** — What happens for bad input?
3. **Behavior during backfill** — Are all endpoints safe to call with partial data?
4. **SQLite concurrency** — Can multiple parallel requests cause issues?
5. **Article deduplication** — Can the same article appear multiple times with different IDs?
6. **Narrative merging** — Can narratives split or merge over time?
7. **Contradiction confidence threshold** — When is `contradiction` null vs populated?
8. **Historical patterns availability** — Do all articles have patterns, or only some?
9. **Graph staleness** — Is the knowledge graph static or updated from articles?
10. **Ticker case sensitivity** — Docs say case-insensitive for search, but unspecified for article ticker filter
11. **Empty responses** — What does the API return when there are 0 results? `{ data: [], meta: { count: 0 } }` or something else?
12. **Timezone handling** — Are all timestamps UTC? The `published_at` format lacks timezone info in examples.

## 9. Inconsistencies and Dangerous Assumptions

1. **HTML in summaries**: The `summary` field "may contain HTML from source" — rendering this unescaped is an XSS vector.
2. **Nullable `published_at`**: Not all articles have a publish date. UI must handle gracefully.
3. **Static portfolio pretending to be dynamic**: The API returns `user_id: "usr_demo"` but there is no user management. Clients might assume per-user data exists.
4. **Exposure percentages are static**: `/api/risk/exposure` returns the same data regardless of market conditions since it's computed from fixed weights.
5. **Discovery is portfolio-dependent**: `/api/discovery/today` finds entities connected to the mock portfolio's holdings. If the user's actual portfolio differs, discoveries are irrelevant.
6. **Alert rules are hardcoded**: `/api/alerts/history` fires on 4 fixed rules (AAPL/NVDA/TSLA direct mention, relevance >0.80, negative IT sector, supply chain narratives). Users cannot configure these.
