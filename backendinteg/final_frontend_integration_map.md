# Frontend Integration Map — Intelligence API → HiveMind UI

## 1. Component-to-Endpoint Mapping

### 1.1 Dashboard Summary Panel (activePanel="summary")

| Component | Current Source | Target Endpoint(s) | Transform Required |
|-----------|---------------|--------------------|--------------------|
| **PortfolioImpactSummary** | `mock-data/summaries.ts` | `GET /api/digest/today` + `GET /api/risk/exposure` | YES — aggregate from digest sections |
| **PortfolioOverview** | `mock-data/summaries.ts` | `GET /api/digest/today` (developing_stories + risk_alerts) + `GET /api/narratives/active` | YES — synthesize narrative text from structured data |
| **CriticalNews** | `mock-data/news.ts` | `GET /api/digest/today` → `sections.direct_news` (top 3 by relevance) | YES — shape transform |
| **TodaysSummary** | `mock-data/summaries.ts` | `GET /api/digest/today` → `sections.direct_news` grouped by `affected_holdings` | YES — per-stock aggregation from article data |

**Data flow for Summary Panel**:
```
On mount:
  Promise.all([
    fetch('/api/intelligence/digest'),      // proxied → /api/digest/today
    fetch('/api/intelligence/risk/exposure') // proxied → /api/risk/exposure
  ])
  ↓
  Transform into component props:
    - digest.sections.direct_news[0..2] → CriticalNews items
    - digest.sections.direct_news grouped by ticker → TodaysSummary items
    - digest metadata + exposure summary → PortfolioImpactSummary
    - digest.developing_stories + risk_alerts → PortfolioOverview
```

### 1.2 Sector News Panel (activePanel="sector")

| Component | Current Source | Target Endpoint(s) | Transform Required |
|-----------|---------------|--------------------|--------------------|
| **SectorNewsPanel** | `mock-data/news.ts` | `GET /api/articles?limit=30` + enrichment entities for sector grouping | YES — group articles by entity sector |

**Alternative**: Use `GET /api/digest/today` → `sections.sector_context` for the top items, supplemented by `GET /api/articles` for deeper browsing.

**Transform**: Group articles by `enrichment.entities[0].sector` (from entity graph context). The API does not return a top-level `sector` field on articles — it must be inferred from entities.

**Issue**: The API's article model does not have a `sector` field. Sectors come from entity metadata in graph_contexts. To group by sector, we need to:
1. Look at each article's `tickers[]`
2. For each ticker, get sector from `enrichment.graph_contexts[ticker]` or call `GET /api/explore/entity/{ticker}`
3. Group articles by inferred sector

**Recommendation**: Pre-fetch entity details for the watchlist tickers on app init, cache the ticker→sector mapping, use it to classify articles.

### 1.3 Stock News Panel (activePanel="stock")

| Component | Current Source | Target Endpoint(s) | Transform Required |
|-----------|---------------|--------------------|--------------------|
| **StockNewsPanel** | `mock-data/news.ts` | `GET /api/articles?ticker={SYMBOL}&limit=20` | YES — shape transform |

**Transform per article**:
```
API article → StockNewsItem:
  stock:        article.tickers[0]  (or filtered ticker)
  title:        article.title
  source:       article.source
  summary:      article.summary (sanitize HTML!)
  time:         relative(article.published_at)
  timestamp:    Date.parse(article.published_at)
  sentiment:    article.enrichment.entities[0].sentiment.toLowerCase()
  priceImpact:  article.enrichment.signals[0]?.magnitude_category → map to "high"/"medium"/"low"
  impactValue:  NOT AVAILABLE — API has no price impact % → show relevance_score instead or omit
```

**"Analyze Impact" button**: Can now link to `/api/articles/{id}/relevance` and `/api/articles/{id}/summary` for real per-holding impact analysis.

### 1.4 Stock Screener (activePanel="comparison")

| Component | Current Source | Target Endpoint(s) | Transform Required |
|-----------|---------------|--------------------|--------------------|
| **StockScreener** | Hardcoded inline | **NO DIRECT REPLACEMENT** | N/A |

**The Intelligence API has no price data endpoints.** The screener needs intraday OHLCV data that this API does not provide.

**Options**:
1. Keep the existing Yahoo Finance integration for price data, enhance with intelligence API news markers
2. Use `GET /api/articles?ticker=AAPL,MSFT` to overlay real news events on the chart instead of mock news
3. The StockScreener's news overlay can be wired to real articles, but price data must come from elsewhere

**Partial integration**: Replace `stockNewsData` and `sectorWideNews` mock data with filtered articles from the intelligence API. Keep the hardcoded price data as-is until a price API is available.

### 1.5 Impact Analysis Panel (activePanel="impact")

| Component | Current Source | Target Endpoint(s) | Transform Required |
|-----------|---------------|--------------------|--------------------|
| **ImpactAnalysisPanel** | Hardcoded inline | `GET /api/risk/alerts` + `GET /api/risk/exposure` + article enrichment signals | YES — heavy synthesis |

**Major gap**: The 6-factor radar chart (Product Innovation, Market Demand, Competition, Pricing Power, Supply Chain, Regulatory) has no API equivalent. These factors cannot be derived from any endpoint.

**Proposed redesign**: Replace the radar chart with data the API CAN provide:
- **Risk Alerts**: Use `/api/risk/alerts` to show correlated threats with severity
- **Exposure Breakdown**: Use `/api/risk/exposure` for sector/geographic concentration
- **Signal Analysis**: Aggregate `enrichment.signals` across recent articles for each holding — group by signal_type, show direction and magnitude

This means the ImpactAnalysisPanel needs a **UI redesign**, not just a data swap.

### 1.6 Notification System (Header Bell)

| Component | Current Source | Target Endpoint(s) | Transform Required |
|-----------|---------------|--------------------|--------------------|
| **DashboardHeader bell** | Decorative (no data) | `GET /api/alerts/history?limit=20` | NEW feature build |

**Implementation**:
- On dashboard mount, fetch `/api/alerts/history?limit=20`
- Store `lastSeenTimestamp` in localStorage
- Count alerts where `triggered_at > lastSeenTimestamp` → notification badge count
- Click bell → dropdown/panel showing alert list
- Each alert links to the source article

### 1.7 Stock Detail Page News

| Component | Current Source | Target Endpoint(s) | Transform Required |
|-----------|---------------|--------------------|--------------------|
| Stock detail page news section | `getStockNews()` templates | `GET /api/articles?ticker={SYMBOL}&limit=10` | YES — shape transform |
| StockChart news markers | `historicalStockNews` mock | `GET /api/articles?ticker={SYMBOL}&limit=50` | YES — filter to articles with `published_at` matching chart range |

**Transform for news section**:
```
API article → stock detail news item:
  title:  article.title
  source: article.source
  date:   article.published_at
  url:    article.url   (now we have REAL URLs!)
```

**Transform for chart markers**:
```
API article → chart marker:
  time:       article.published_at (parse to Date, match chart timeframe)
  title:      article.title
  sentiment:  article.enrichment.entities.find(e => e.entity_id === symbol)?.sentiment
```

### 1.8 NEW Features Enabled by API

These components don't exist yet but the API fully supports them:

| Feature | Endpoint(s) | Priority |
|---------|-------------|----------|
| **Entity Explorer / Knowledge Graph** | `GET /api/explore/entity/{ticker}` + `GET /api/explore/search` | Medium |
| **Article Detail Page** | `GET /api/articles/{id}` + `/relevance` + `/summary` | High |
| **Developing Stories / Narratives** | `GET /api/narratives/active` | Medium |
| **Discovery Feed** ("Companies to Watch") | `GET /api/discovery/today` | Medium |
| **Risk Dashboard** (full) | `GET /api/risk/alerts` + `GET /api/risk/exposure` | High |
| **Article Feed** (infinite scroll) | `GET /api/articles?limit=20&offset=X` | Low |

---

## 2. State Management Changes

### 2.1 Current State Architecture
- Each dashboard panel fetches its own data independently in `useEffect`
- No shared state between panels (except DashboardContext for active panel)
- No global data cache
- Portfolio data is fetched fresh on each panel mount

### 2.2 Required Changes

**Shared Dashboard Data Store**: Multiple panels need the same data from the intelligence API. Without shared state, the same endpoints get called redundantly.

```
Shared data needed across panels:
  - digest (used by: Summary, CriticalNews, TodaysSummary, PortfolioOverview)
  - exposure (used by: PortfolioImpactSummary, ImpactAnalysisPanel)
  - alerts (used by: Notification bell, ImpactAnalysisPanel)
  - narratives (used by: PortfolioOverview, potential new Narratives panel)
```

**Proposed approach**: Create a `DashboardDataProvider` context that:
1. Fetches digest, exposure, alerts, narratives in parallel on mount
2. Stores results in state
3. Provides data + loading + error states to child components
4. Exposes a `refetch()` function for manual refresh
5. Auto-refreshes every 5 minutes (matching API poll interval)

### 2.3 Per-Panel Additional Fetches

Some panels need data beyond the shared store:

| Panel | Additional Fetch | Trigger |
|-------|-----------------|---------|
| SectorNewsPanel | `GET /api/articles?limit=30` | Panel becomes active |
| StockNewsPanel | `GET /api/articles?ticker=X&limit=20` | Panel becomes active + ticker filter change |
| Stock Detail | `GET /api/articles?ticker=X&limit=10` | Page mount |
| Notification dropdown | `GET /api/alerts/history?limit=20` | Bell click (lazy load) |

---

## 3. Required API Client Module

### 3.1 Location

Create: `src/lib/intelligence/client.ts`

### 3.2 Responsibilities

```typescript
// Core client
class IntelligenceClient {
  private baseUrl: string;  // server-side: http://hivemind_mock:8001
                             // client-side: /api/intelligence (proxied)

  // Article endpoints
  getArticles(params: { ticker?: string; limit?: number; offset?: number }): Promise<Article[]>
  getArticle(id: number): Promise<Article>
  getArticleRelevance(id: number): Promise<ArticleRelevance>
  getArticleSummary(id: number): Promise<ArticleHoldingSummary[]>

  // Aggregated endpoints
  getDailyDigest(): Promise<DailyDigest>
  getRiskAlerts(severity?: AlertSeverity): Promise<RiskAlert[]>
  getRiskExposure(): Promise<PortfolioExposure>
  getAlertHistory(limit?: number): Promise<HistoricalAlert[]>
  getNarratives(): Promise<ActiveNarrative[]>
  getDiscoveries(): Promise<EntityDiscovery[]>

  // Entity endpoints
  getEntity(ticker: string): Promise<EntityDetail>
  searchEntities(query: string): Promise<EntitySearchResult[]>

  // Health
  getHealth(): Promise<HealthData>
}
```

### 3.3 Proxy Routes Required

Create Next.js API routes to proxy requests from browser to the intelligence API container:

```
src/app/api/intelligence/
  ├── articles/
  │   ├── route.ts                    → GET /api/articles
  │   └── [id]/
  │       ├── route.ts                → GET /api/articles/{id}
  │       ├── relevance/route.ts      → GET /api/articles/{id}/relevance
  │       └── summary/route.ts        → GET /api/articles/{id}/summary
  ├── digest/route.ts                 → GET /api/digest/today
  ├── risk/
  │   ├── alerts/route.ts             → GET /api/risk/alerts
  │   └── exposure/route.ts           → GET /api/risk/exposure
  ├── alerts/history/route.ts         → GET /api/alerts/history
  ├── narratives/route.ts             → GET /api/narratives/active
  ├── discovery/route.ts              → GET /api/discovery/today
  ├── explore/
  │   ├── entity/[ticker]/route.ts    → GET /api/explore/entity/{ticker}
  │   └── search/route.ts             → GET /api/explore/search
  └── health/route.ts                 → GET /api/health
```

Each proxy route:
1. Checks Clerk authentication (`auth()`)
2. Forwards request to intelligence API (container URL)
3. Transforms/validates response
4. Returns to client

### 3.4 Environment Configuration

```env
# .env.local additions
INTELLIGENCE_API_URL=http://hivemind_mock:8001   # server-side (Docker container)
NEXT_PUBLIC_INTELLIGENCE_ENABLED=true             # feature flag
```

The server-side routes use `INTELLIGENCE_API_URL` (container-to-container). Client-side code calls `/api/intelligence/*` (proxied through Next.js).

---

## 4. Caching Strategy

### 4.1 Endpoint Cache TTLs

| Endpoint | Cache TTL | Rationale |
|----------|-----------|-----------|
| `/api/health` | 30s | Health check, low cost |
| `/api/articles` | 60s | New articles every 5 min, 60s is safe |
| `/api/articles/{id}` | 5 min | Single article doesn't change after enrichment |
| `/api/articles/{id}/relevance` | 5 min | Computed from static portfolio |
| `/api/articles/{id}/summary` | 5 min | Computed from static portfolio |
| `/api/digest/today` | 2 min | Aggregated, changes with new articles |
| `/api/risk/alerts` | 2 min | Changes with new articles |
| `/api/risk/exposure` | 10 min | Static portfolio → barely changes |
| `/api/alerts/history` | 60s | New alerts when articles match rules |
| `/api/narratives/active` | 2 min | Updates with new articles |
| `/api/discovery/today` | 5 min | Daily computation |
| `/api/explore/entity/{ticker}` | 30 min | Graph data is stable |
| `/api/explore/search` | 5 min | Entity list is stable |

### 4.2 Cache Implementation

**Server-side (Next.js API routes)**: Use Next.js `unstable_cache` or a simple in-memory TTL map. The intelligence API is local (same Docker network), so latency is already low. Caching prevents hammering SQLite under concurrent users.

**Client-side**: Use React state in `DashboardDataProvider`. No localStorage caching — data is time-sensitive. The provider handles refetch intervals.

---

## 5. Error Handling Strategy

### 5.1 Error Categories

| Category | Example | Frontend Behavior |
|----------|---------|-------------------|
| **Intelligence API down** | Connection refused | Show stale data (if cached) + "Data temporarily unavailable" banner |
| **Article not found** | 404 on article detail | Show "Article not found" message, don't crash |
| **Malformed response** | Missing fields, wrong types | TypeScript runtime validation (zod), fall back to "N/A" |
| **Slow response** | >5s response time | Show loading skeleton, abort after 10s |
| **HTML in summary** | XSS payload | Sanitize ALL `summary` fields before rendering (DOMPurify) |

### 5.2 Graceful Degradation

The intelligence API is a supplementary data source. If it's down:
- Portfolio management continues to work (uses our PostgreSQL)
- Stock prices continue to work (uses Yahoo Finance)
- Dashboard panels show "Intelligence data unavailable" with option to retry
- Mock data is NOT shown as fallback (it would be misleading)

---

## 6. Loading State Handling

### 6.1 Per-Component Loading

Each panel shows a skeleton loader while its data is fetching. Do NOT block the entire dashboard.

```
Dashboard mount:
  1. Render sidebar + header immediately
  2. Start shared data fetch (digest + exposure + alerts)
  3. Show skeletons in all visible panels
  4. As each data piece arrives, render the corresponding component
  5. If a fetch fails, show error state for that panel only
```

### 6.2 Panel-Specific Loading

When switching panels via sidebar:
- If data for the new panel is already in the shared store → render immediately
- If additional data needed (e.g., SectorNewsPanel needs articles) → show skeleton, fetch, render
- Previous panel's state is preserved (no refetch on switching back)

---

## 7. Transform Layer

### 7.1 Location

Create: `src/lib/intelligence/transforms.ts`

### 7.2 Key Transforms

```typescript
// Article → CriticalNews item
function toCriticalNewsItem(article: DigestNewsItem, enrichment?: ArticleEnrichment): CriticalNewsItem

// Article → StockNewsItem
function toStockNewsItem(article: Article, targetTicker: string): StockNewsItem

// Digest → TodaysSummary items (group by ticker)
function toSummaryItems(directNews: DigestNewsItem[]): SummaryItem[]

// Digest + Exposure → PortfolioImpactSummary
function toPortfolioImpactSummary(digest: DailyDigest, exposure: PortfolioExposure): PortfolioSummaryData

// Articles → Sector-grouped news
function groupBySector(articles: Article[], sectorMap: Map<string, string>): SectorGroup[]

// Article → Chart marker
function toChartMarker(article: Article, symbol: string): ChartNewsMarker | null

// Enrichment signal magnitude → impact level
function magnitudeToImpact(mag: "major" | "moderate" | "minor"): "high" | "medium" | "low"

// Uppercase sentiment → lowercase
function normalizeSentiment(s: "POSITIVE" | "NEGATIVE" | "NEUTRAL"): "positive" | "negative" | "neutral"

// ISO timestamp → relative time ("8 min ago")
function toRelativeTime(isoString: string | null): string
```

---

## 8. Pagination Handling

Only `/api/articles` supports pagination (limit/offset).

**Strategy**: Implement cursor-based infinite scroll on any article list:

```typescript
function useArticleFeed(ticker?: string) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  async function loadMore() {
    const result = await intelligenceClient.getArticles({ ticker, limit: PAGE_SIZE, offset });
    setArticles(prev => [...prev, ...result]);
    setOffset(prev => prev + result.length);
    setHasMore(result.length === PAGE_SIZE);  // heuristic — no total count available
  }

  return { articles, loadMore, hasMore };
}
```

**Issue**: No `total_count` in API response. We can't show "page X of Y" or a progress indicator. We use `result.length < PAGE_SIZE` as a heuristic for "no more data".

---

## 9. Changes Categorized

### 9.1 Pure Frontend Changes
- Replace mock data imports in 8 dashboard components
- Add `DashboardDataProvider` context
- Add transform layer (`src/lib/intelligence/transforms.ts`)
- Add TypeScript interfaces (`src/lib/intelligence/types.ts`)
- Update StockChart to use real article data for markers
- Update stock detail page news section
- Build notification bell dropdown
- Add HTML sanitization for article summaries
- Add loading skeletons for intelligence data
- Redesign ImpactAnalysisPanel to match available API data

### 9.2 Backend Proxy/Server Changes
- Create 12 proxy API routes under `src/app/api/intelligence/`
- Add server-side caching layer in proxy routes
- Add `INTELLIGENCE_API_URL` environment variable handling

### 9.3 Authentication Changes
- Proxy routes enforce Clerk auth (no direct browser→intelligence API calls)
- No changes to existing auth flow

### 9.4 Docker/Environment Changes
- Add `hivemind_mock` service to `docker-compose.dev.yml` (or connect to shared network)
- Add `INTELLIGENCE_API_URL` to app service environment
- Add `NEXT_PUBLIC_INTELLIGENCE_ENABLED` feature flag

### 9.5 Files to Create
```
src/lib/intelligence/
  ├── types.ts              # TypeScript interfaces (from capability analysis)
  ├── client.ts             # API client class
  └── transforms.ts         # Data shape transforms

src/app/api/intelligence/
  ├── articles/route.ts
  ├── articles/[id]/route.ts
  ├── articles/[id]/relevance/route.ts
  ├── articles/[id]/summary/route.ts
  ├── digest/route.ts
  ├── risk/alerts/route.ts
  ├── risk/exposure/route.ts
  ├── alerts/history/route.ts
  ├── narratives/route.ts
  ├── discovery/route.ts
  ├── explore/entity/[ticker]/route.ts
  ├── explore/search/route.ts
  └── health/route.ts

src/components/dashboard/
  ├── dashboard-data-provider.tsx   # Shared data context
  └── [existing files modified]
```

### 9.6 Files to Modify
```
src/components/dashboard/critical-news.tsx          # Remove mock import, accept props
src/components/dashboard/todays-summary.tsx          # Remove mock import, accept props
src/components/dashboard/portfolio-impact-summary.tsx # Remove mock import, accept props
src/components/dashboard/portfolio-overview.tsx       # Remove mock import, accept props
src/components/dashboard/sector-news-panel.tsx        # Remove mock import, fetch from API
src/components/dashboard/stock-news-panel.tsx         # Remove mock import, fetch from API
src/components/dashboard/impact-analysis-panel.tsx    # Redesign with API data
src/components/dashboard/dashboard-header.tsx         # Wire notification bell
src/components/stocks/stock-chart.tsx                 # Replace mock news markers
src/app/(protected)/dashboard/page.tsx                # Wrap with DashboardDataProvider
src/app/(protected)/dashboard/stocks/[symbol]/page.tsx # Replace getStockNews with API
docker-compose.dev.yml                                # Add intelligence service or network
.env.local                                            # Add INTELLIGENCE_API_URL
```

### 9.7 Files to Delete (Eventually)
```
src/lib/mock-data/news.ts        # After all components migrated
src/lib/mock-data/summaries.ts   # After all components migrated
src/lib/stocks.ts → getStockNews() function  # Remove template news generator
```
