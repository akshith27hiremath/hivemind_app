# Frontend Implementation Plan — Intelligence API Integration

## Decisions Made

| Decision | Choice | Detail |
|----------|--------|--------|
| Portfolio Selection | **Option B** | Portfolio selector dropdown in dashboard header |
| Graceful Degradation | **Option B** | Show cached/stale data with "Last updated X ago" badge |
| ImpactAnalysis Visualization | **Option D** | Three tabs: radar chart + signal heatmap + signal timeline |
| Intelligence API Hosting | **Option B** | Separate docker-compose, shared Docker network |
| Implementation Ordering | **Option C** | Parallel tracks — frontend proceeds while API team works |

---

## Phase Structure Overview

| Phase | Can Start | Depends On | Session Estimate |
|-------|-----------|------------|------------------|
| **Phase 1**: Foundation Layer | NOW | Nothing | 1 session |
| **Phase 2**: BFF Proxy + DataProvider | NOW (mock-fallback) | Phase 1 | 1 session |
| **Phase 3**: Summary Panel Migrations | NOW (mock-fallback) | Phase 2 | 1 session |
| **Phase 4**: News Panel Migrations | When API `/api/articles` lands | Phase 2 | 1 session |
| **Phase 5**: ImpactAnalysisPanel Redesign | When API `/api/signals/aggregate` lands | Phase 2 | 1.5 sessions |
| **Phase 6**: Stock Pages + Cleanup | When API fully stable | Phases 3-5 | 1 session |

**Parallel tracks**:
- **Track A (Frontend — us)**: Phases 1-3 proceed immediately using mock-fallback. Phases 4-5 wire up as API endpoints become available.
- **Track B (API team)**: P0 changes first (X-Portfolio, total_count, HTML sanitize, API key, healthcheck), then P1 (dashboard batch, article full), then P2 (signals/aggregate).
- **Sync points**: Phase 4 needs `/api/articles`. Phase 5 needs `/api/signals/aggregate`. Phase 6 needs everything stable.

---

## Phase 1: Foundation Layer (START NOW)

**Goal**: Create all TypeScript interfaces, mapper functions, configuration, cache utility, and API client. Pure infrastructure — no API required.

### File 1: `src/lib/intelligence/types.ts` (CREATE)

All TypeScript interfaces matching the Intelligence API response shapes. Every other file imports from here.

```typescript
// === Shared Enums / Literals ===

export type Sentiment = "positive" | "negative" | "neutral";
export type Impact = "high" | "medium" | "low";
export type SignalDirection = "POSITIVE" | "NEGATIVE" | "NEUTRAL";
export type SignalMagnitude = "major" | "moderate" | "minor";
export type Trend = "improving" | "worsening" | "mixed" | "stable";
export type SeverityTier = "critical" | "high" | "medium" | "low";
export type NarrativeStatus = "emerging" | "developing" | "established";
export type DataStatus = "idle" | "loading" | "success" | "error" | "stale";

export type SignalType =
  | "EARNINGS_REPORT" | "M_AND_A" | "REGULATORY" | "SUPPLY_DISRUPTION"
  | "LEADERSHIP_CHANGE" | "PRODUCT_LAUNCH" | "PARTNERSHIP" | "AI_TECHNOLOGY"
  | "GEOPOLITICAL" | "MARKET_MOVEMENT" | "GENERAL_NEWS";

// === Holdings (sent TO the API) ===

export interface PortfolioHolding {
  ticker: string;
  weight_pct: number;
}

// === Dashboard Batch Response (POST /api/dashboard) ===

export interface DashboardResponse {
  data: {
    digest?: DigestData;
    exposure?: ExposureData;
    alerts?: RiskAlert[];
    narratives?: Narrative[];
    alert_history?: AlertHistoryItem[];
  };
  meta: {
    portfolio_hash: string;
    holdings_count: number;
    computed_at: string;
    sections_included: string[];
  };
}

export interface DigestData {
  digest_id: string;
  generated_at: string;
  sections: {
    direct_news: DigestItem[];
    related_news: DigestItem[];
    risk_alerts: DigestItem[];
    developing_stories: DigestStory[];
    discovery: DigestItem[];
    sector_context: DigestItem[];
  };
}

export interface DigestItem {
  article_id: number;
  headline: string;
  relevance_score: number;
  affected_holdings: string[];
  summary: string;
  source?: string;
  published_at?: string;
  signal_type?: SignalType;
  sentiment?: SignalDirection;
  magnitude?: SignalMagnitude;
}

export interface DigestStory {
  narrative_id: string;
  title: string;
  article_count: number;
  sentiment_trajectory: Trend;
  affected_holdings: string[];
}

export interface ExposureData {
  computed_at: string;
  by_sector: Record<string, SectorExposure>;
  by_geography: Record<string, { exposure_pct: number }>;
  concentration_risks: ConcentrationRisk[];
}

export interface SectorExposure {
  exposure_pct: number;
  holdings: string[];
  trend: Trend;
}

export interface ConcentrationRisk {
  risk_type: string;
  category: string;
  exposure_pct?: number;
  dependent_holdings?: string[];
  severity: SeverityTier;
  description: string;
}

export interface RiskAlert {
  alert_id: string;
  correlation_type: string;
  trigger_article_id: number;
  trigger_headline: string;
  affected_holdings: string[];
  combined_portfolio_exposure_pct: number;
  severity_tier: SeverityTier;
  cause_description: string;
  explanation: string;
}

export interface Narrative {
  narrative_id: string;
  title: string;
  primary_ticker: string;
  signal_type: SignalType;
  article_count: number;
  first_seen: string;
  last_updated: string;
  status: NarrativeStatus;
  sentiment_trajectory: Trend;
}

export interface AlertHistoryItem {
  alert_id: string;
  rule_id: string;
  trigger_type: string;
  triggered_at: string;
  article_id: number;
  headline: string;
  matched_holdings: string[];
  severity: SeverityTier;
  summary: string;
}

// === Signal Aggregation (POST /api/signals/aggregate) ===

export interface SignalAggregationResponse {
  data: {
    by_signal_type: Record<string, SignalTypeAggregate>;
    by_holding: Record<string, HoldingSignalSummary>;
    portfolio_summary: PortfolioSignalSummary;
  };
  meta: {
    days_analyzed: number;
    holdings_count: number;
    computed_at: string;
  };
}

export interface SignalTypeAggregate {
  article_count: number;
  positive: number;
  negative: number;
  neutral: number;
  dominant_direction: SignalDirection;
  dominant_magnitude: SignalMagnitude;
  affected_holdings: string[];
  trend: Trend;
  latest_headline: string;
}

export interface HoldingSignalSummary {
  total_articles: number;
  net_sentiment: number;
  dominant_signal: SignalType;
  risk_signals: number;
  opportunity_signals: number;
}

export interface PortfolioSignalSummary {
  total_articles_analyzed: number;
  net_sentiment: number;
  top_opportunity: SignalType;
  top_risk: SignalType;
  signal_diversity: number;
}

// === Articles (GET /api/articles) ===

export interface ArticlesResponse {
  data: Article[];
  meta: { count: number; total: number };
}

export interface Article {
  id: number;
  url: string;
  title: string;
  summary: string;
  source: string;
  published_at: string | null;
  fetched_at: string;
  tickers: string[];
  enrichment?: ArticleEnrichment;
}

export interface ArticleEnrichment {
  entities: EnrichmentEntity[];
  signals: ArticleSignal[];
  graph_contexts: Record<string, unknown>;
  narrative: { narrative_id: string; title: string; status: NarrativeStatus; sentiment_trajectory: Trend } | null;
  contradiction: { contradicting_article_id: number; contradicting_headline: string; contradiction_type: string; confidence: number } | null;
  historical_patterns: { past_headline: string; similarity_score: number; narrative_duration_days: number; narrative_resolution: string }[];
}

export interface EnrichmentEntity {
  entity_id: string;
  surface_form: string;
  canonical_name: string;
  role: "PRIMARY_SUBJECT" | "MENTIONED";
  sentiment: SignalDirection;
  role_confidence: number;
  context_snippet: string;
}

export interface ArticleSignal {
  signal_type: SignalType;
  direction: SignalDirection;
  magnitude_category: SignalMagnitude;
  primary_entity_name: string;
  evidence_snippet: string;
  signal_timeframe: "near_term" | "medium_term" | "long_term";
}

// === Article Full Detail (GET /api/articles/{id}/full) ===

export interface ArticleFullResponse {
  data: {
    article: Article;
    relevance: {
      overall_relevance_score: number;
      per_holding_relevance: HoldingRelevance[];
    };
    summaries: HoldingSummary[];
  };
}

export interface HoldingRelevance {
  holding_ticker: string;
  relevance_tier: number;
  relevance_score: number;
  relationship_path: string;
  explanation: string;
}

export interface HoldingSummary {
  holding_ticker: string;
  summary: string;
  action_context: string;
  confidence: number;
}

// === Intelligence API Error ===

export interface IntelligenceAPIError {
  error: { code: string; message: string };
}
```

### File 2: `src/lib/intelligence/mappers.ts` (CREATE)

Thin mapping layer — 6 functions.

Key exports:
- `mapSentiment(s: string): Sentiment` — "POSITIVE" → "positive"
- `mapMagnitude(m: string): Impact` — "major" → "high"
- `toRelativeTime(iso: string | null): string` — ISO → "5 min ago"
- `mapSignalType(t: string): string` — "EARNINGS_REPORT" → "Earnings"
- `sanitizeText(raw: string): string` — simple regex HTML strip (defense-in-depth)
- `computePortfolioWeights(holdings: Holding[]): PortfolioHolding[]` — DB holdings to weight percentages via `(quantity * averagePrice / totalValue) * 100`
- `simpleHash(s: string): string` — djb2 hash for cache keys

### File 3: `src/lib/intelligence/config.ts` (CREATE)

Server-side and client-side configuration.

Key exports:
- `INTELLIGENCE_API_URL` — from `process.env.INTELLIGENCE_API_URL`, default `http://intelligence-api:8001`
- `INTELLIGENCE_API_KEY` — from `process.env.INTELLIGENCE_API_KEY`
- `INTELLIGENCE_ENABLED` — from `process.env.NEXT_PUBLIC_INTELLIGENCE_ENABLED === 'true'`
- Cache TTL constants: `CACHE_TTL_DASHBOARD` (120s), `CACHE_TTL_ARTICLES` (60s), `CACHE_TTL_SIGNALS` (300s)
- `POLLING_INTERVAL` (300s), `STALE_THRESHOLD` (600s)

### File 4: `src/lib/intelligence/cache.ts` (CREATE)

Server-side in-memory TTL cache for BFF proxy routes.

Key exports:
- `getCache<T>(key: string): T | null` — returns null if expired
- `setCache(key: string, data: unknown, ttl: number): void`
- `getStaleCacheEntry<T>(key: string): T | null` — returns even if expired (for stale-data fallback)
- `clearCache(): void`

Implementation: `Map<string, { data: unknown; expiresAt: number }>`. On get, check `expiresAt > Date.now()`.

### File 5: `src/lib/intelligence/client.ts` (CREATE)

Server-only fetch wrapper for Intelligence API calls.

Key exports:
- `fetchDashboard(holdings: PortfolioHolding[], include?: string[]): Promise<DashboardResponse>`
- `fetchSignalAggregation(holdings: PortfolioHolding[], days?: number): Promise<SignalAggregationResponse>`
- `fetchArticles(params: { ticker?: string; limit?: number; offset?: number }): Promise<ArticlesResponse>`
- `fetchArticleFull(id: number, portfolioHeader: string): Promise<ArticleFullResponse>`
- `checkHealth(): Promise<boolean>`

Each function: reads config → constructs request → sends with `X-API-Key` header → 10s timeout → returns typed response or throws.

### File 6: `src/lib/intelligence/mock-fallback.ts` (CREATE)

During transition and for graceful degradation, produces API-shaped responses from existing mock data.

Key exports:
- `getMockDashboard(): DashboardResponse` — reshapes `criticalNews`, `sectorNews`, `summaryItems`, `portfolioSummary`, `portfolioOverview` into `DashboardResponse` shape
- `getMockSignals(): SignalAggregationResponse` — generates plausible signal data from mock news items

This enables all UI work to proceed before the API is available.

### File 7: `src/lib/intelligence/index.ts` (CREATE)

Barrel export for all intelligence utilities.

---

## Phase 2: BFF Proxy Routes + DashboardDataProvider (START NOW)

**Goal**: Create server-side proxy routes and the client-side data provider context. With mock-fallback, the full data flow can be tested end-to-end without the Intelligence API.

### File 8: `src/app/api/intelligence/dashboard/route.ts` (CREATE)

Primary BFF proxy route for the batch dashboard endpoint.

Implementation:
1. `export async function GET(request: Request)`
2. `auth()` — return 401 if unauthenticated
3. Get user via `getUserByClerkId(userId)`
4. Get portfolios via `getPortfoliosByUserId(user.id)`
5. Accept `?portfolioId=xxx` query param. Use that portfolio, or find first active, or first.
6. If no portfolio → return `{ data: null, meta: { no_portfolio: true } }` (200)
7. Get holdings via `getHoldingsByPortfolioId(portfolio.id)`
8. Compute weights via `computePortfolioWeights(holdings)`
9. Compute portfolio hash via `simpleHash(weights.toString())`
10. Check cache — if hit, return
11. If `!INTELLIGENCE_ENABLED` → call `getMockDashboard()` and return
12. Call `fetchDashboard(weights)` — on success: cache with 2min TTL, return
13. On error: check `getStaleCacheEntry()`. If exists, return it with `X-Data-Stale: true` header. Otherwise return error.

**Pattern reference**: Follow `src/app/api/portfolios/route.ts` for auth/user lookup patterns.

### File 9: `src/app/api/intelligence/signals/aggregate/route.ts` (CREATE)

BFF proxy for signal aggregation. Same auth + portfolio lookup as dashboard. Accept `?days=7` param. Cache with 5-min TTL.

### File 10: `src/app/api/intelligence/articles/route.ts` (CREATE)

BFF proxy for article list. Universal (no portfolio injection). Forward `ticker`, `limit`, `offset` query params. Cache with 1-min TTL.

### File 11: `src/app/api/intelligence/articles/[id]/full/route.ts` (CREATE)

BFF proxy for article full detail. Auth + portfolio lookup. Build `X-Portfolio` header from holdings. Cache by `article:${id}:${hash}`.

### File 12: `src/app/api/intelligence/health/route.ts` (CREATE)

Health check proxy. Calls `checkHealth()`, returns `{ status: "ok" | "unavailable" }`.

### File 13: `src/components/dashboard/intelligence-data-provider.tsx` (CREATE)

Central client-side context that fetches and distributes intelligence data to all dashboard panels.

**Context value shape**:
```typescript
interface IntelligenceContextValue {
  // Data
  dashboard: DashboardResponse | null;
  signals: SignalAggregationResponse | null;

  // Status
  status: DataStatus;
  error: string | null;
  lastFetchedAt: number | null;
  isStale: boolean;

  // Portfolio selection (Decision 1 = Option B)
  portfolios: Portfolio[];
  selectedPortfolioId: string | null;
  setSelectedPortfolioId: (id: string | null) => void;

  // Actions
  refresh: () => Promise<void>;
}
```

**Fetch logic**:
1. On mount, fetch `GET /api/portfolios` → populate portfolio list
2. Set `selectedPortfolioId` to first active portfolio (or first)
3. Fetch dashboard + signals in parallel:
   - `GET /api/intelligence/dashboard?portfolioId=${selectedPortfolioId}`
   - `GET /api/intelligence/signals/aggregate?portfolioId=${selectedPortfolioId}&days=7`
4. Store in state

**Refresh strategy**:
- `setInterval` at 5-min polling
- On `visibilitychange` (tab visible): if data > 10min old, auto-refresh
- On portfolio switch: immediate re-fetch

**Stale data behavior** (Decision 2):
- If fetch fails but previous data exists → keep data, set `status: 'stale'`
- `isStale = status === 'stale' || (lastFetchedAt && Date.now() - lastFetchedAt > STALE_THRESHOLD)`
- Components check `isStale` and show `<StaleDataBadge />`

### File 14: `src/components/dashboard/portfolio-selector.tsx` (CREATE)

Dropdown in dashboard header for switching portfolios.

- Uses `useIntelligenceData()` context
- Shows portfolio name + holding count for each
- On change → `setSelectedPortfolioId(id)` → triggers re-fetch
- If no portfolios → "Create a portfolio" link to `/dashboard/portfolios`
- Glassmorphism styling (bg-white/5, border-white/10)

### File 15: `src/components/dashboard/stale-data-badge.tsx` (CREATE)

Reusable badge for stale data indication.

- Props: `{ lastFetchedAt: number | null }`
- Shows: "Last updated 12 min ago" with warning icon
- Styled: `text-xs text-yellow-400/70`

### File 16: `src/components/dashboard/dashboard-header.tsx` (MODIFY)

- Add `<PortfolioSelector />` next to notification bell
- Wire notification bell to `alert_history` from intelligence data:
  - `const { dashboard } = useIntelligenceData()`
  - Count alerts where `triggered_at > localStorage.getItem('lastSeenAlerts')`
  - Replace hardcoded red dot with real unread count badge

### File 17: `src/app/(protected)/dashboard/layout.tsx` (MODIFY)

Wrap children with `IntelligenceDataProvider`:

```
<IntelligenceDataProvider>
  <DashboardProvider>
    {existing layout}
  </DashboardProvider>
</IntelligenceDataProvider>
```

---

## Phase 3: Summary Panel Migrations (START NOW with mock-fallback)

**Goal**: Migrate the 4 summary-view components from mock data to IntelligenceDataProvider consumption.

### Migration Table

| Component | Remove Import | New Data Source | Key Changes |
|-----------|--------------|----------------|-------------|
| CriticalNews | `criticalNews` from `mock-data/news` | `dashboard.data.digest.sections.direct_news[0:3]` | Map DigestItem to display, add loading/empty/stale states |
| TodaysSummary | `summaryItems` from `mock-data/summaries` | `dashboard.data.digest.sections.direct_news` grouped by `affected_holdings[0]` | Group by ticker, replace fabricated `change` with `relevance_score`, add loading/empty/stale |
| PortfolioImpactSummary | `portfolioSummary` from `mock-data/summaries` | `signals.data.portfolio_summary` + `dashboard.data.alerts` | Replace "Net Impact +1.4%" with "Net Sentiment +0.54", replace "Top Mover NVDA" with "Top Signal: AI/Technology" |
| PortfolioOverview | `portfolioOverview` from `mock-data/summaries` | `dashboard.data.narratives` + `dashboard.data.digest.sections.developing_stories` | Build narrative text from real data, replace "Neural Engine Recommendation" with "Intelligence Summary" |

### File 18: `src/components/dashboard/critical-news.tsx` (MODIFY)

1. Remove mock import
2. Add `const { dashboard, status, isStale, lastFetchedAt } = useIntelligenceData()`
3. Derive: `const items = dashboard?.data?.digest?.sections?.direct_news?.slice(0, 3) ?? []`
4. Map each DigestItem:
   - `id` = `item.article_id.toString()`
   - `title` = `item.headline`
   - `time` = `toRelativeTime(item.published_at)`
   - `source` = `item.source ?? 'Intelligence'`
   - `impact` = `mapMagnitude(item.magnitude ?? 'moderate')`
   - `sentiment` = `mapSentiment(item.sentiment ?? 'NEUTRAL')`
   - `stocks` = `item.affected_holdings`
5. Add loading skeleton (3 placeholder cards with pulse)
6. Add empty state: "No critical news for your portfolio today"
7. Show `<StaleDataBadge />` when `isStale`

### File 19: `src/components/dashboard/todays-summary.tsx` (MODIFY)

1. Remove mock import
2. Group `direct_news` by `affected_holdings[0]` → per-stock summary cards
3. For each stock group:
   - `stock`: the ticker
   - `impact`: dominant sentiment in group (mapped to lowercase)
   - `change`: **replace** fabricated "+3.2%" with "Relevance: 86%" (from `relevance_score`)
   - `reason`: concatenate summaries from group
   - `news`: highest-relevance headline
   - `confidence`: `Math.round(avg relevance_score * 100)`
4. Add loading/empty/stale states

### File 20: `src/components/dashboard/portfolio-impact-summary.tsx` (MODIFY)

1. Remove mock import
2. Derive from `signals.data.portfolio_summary`:
   - Card 1: "Net Sentiment" → `net_sentiment` (format as +0.54 or 54%)
   - Card 2: "Articles Analyzed" → `total_articles_analyzed`
   - Card 3: "Signal Types" → `signal_diversity`
   - Card 4: "Top Signal" → `mapSignalType(top_opportunity)`
3. Add loading/empty/stale states

### File 21: `src/components/dashboard/portfolio-overview.tsx` (MODIFY)

1. Remove mock import
2. Build narrative sections from real data:
   - **Summary**: "X developing stories across your holdings. Top: [narrative title] affecting [ticker]."
   - **Analysis**: List top 2-3 developing stories with `sentiment_trajectory`
   - **Risk**: "X risk alerts. Top: [cause_description] (severity: [severity_tier])"
   - **Intelligence Summary** (replaces "Neural Engine Recommendation"): "Portfolio sentiment is [positive/negative] with [top_opportunity] as dominant signal."
3. Add loading/empty/stale states

---

## Phase 4: News Panel Migrations (REQUIRES API `/api/articles` endpoint)

**Goal**: Migrate SectorNewsPanel, StockNewsPanel, and StockScreener news overlay.

### File 22: `src/components/dashboard/sector-news-panel.tsx` (MODIFY)

1. Remove `import { sectorNews } from "@/lib/mock-data/news"`
2. Add local state: `const [articles, setArticles] = useState<Article[]>([])`
3. On mount, fetch `GET /api/intelligence/articles?limit=30`
4. Group articles by sector. Use `enrichment.entities[0]` to infer sector from graph context, or group by first ticker.
5. Map each Article to existing display shape using mappers
6. Keep all existing filter/sort UI (sector, sentiment, time/impact/relevance)
7. Add loading, empty, and "Load More" states (use `meta.total` for pagination)

### File 23: `src/components/dashboard/stock-news-panel.tsx` (MODIFY)

1. Remove `import { stockSpecificNews } from "@/lib/mock-data/news"`
2. Use portfolio holdings from `useIntelligenceData()` to populate stock filter dropdown
3. On stock filter change, fetch `GET /api/intelligence/articles?ticker=AAPL&limit=20`
4. Map Article to display:
   - Replace fabricated `priceImpact`/`impactValue` with `relevance_score` and signal magnitude badge
   - Wire "Analyze Impact" button to navigate to article detail (future) or show enrichment tooltip
   - Wire "External Link" button to `article.url` (now real URLs!)
5. Add loading/empty states

### File 24: `src/components/dashboard/stock-screener.tsx` (MODIFY — partial)

1. Remove `import { stockNewsData, sectorWideNews } from "@/lib/mock-data/news"`
2. **Keep** existing hardcoded price data (Intelligence API has no price endpoints)
3. Replace news overlay: when stocks selected, fetch `GET /api/intelligence/articles?ticker=NVDA,TSLA&limit=10`
4. Map articles to `ChartNewsItem` shape for chart markers
5. Expand stock selector to all 10 S&P 500 stocks (currently only 4)

---

## Phase 5: ImpactAnalysisPanel Redesign (REQUIRES `/api/signals/aggregate`)

**Goal**: Complete rewrite of ImpactAnalysisPanel with three-tab visualization.

### File 25: `src/components/dashboard/impact-analysis-panel.tsx` (MAJOR REWRITE)

**Current**: 274 lines, 3 hardcoded stock cards with fabricated 6-factor radar charts.

**New**: Three tabs within the panel, powered by real signal aggregation data.

**Tab structure**:
```
[Signal Radar]  [Signal Heatmap]  [Signal Timeline]
```

**Shared header**:
- Title: "Signal Analysis" (replaces "Neural Impact Analysis")
- Subtitle: "Signal patterns across your portfolio over the last {days} days"
- Days selector: 7 / 14 / 30 (re-fetches signals/aggregate with new `days` param)
- `<StaleDataBadge />` when stale

**Tab 1: Signal Radar Chart**
- Uses Recharts `RadarChart` (already a dependency)
- Axes: Each signal type from `signals.data.by_signal_type` (e.g., AI_TECHNOLOGY, SUPPLY_DISRUPTION, EARNINGS_REPORT)
- Axis labels: `mapSignalType()` for human-readable names
- Values: `positive * 1.0 + neutral * 0.5 - negative * 0.5`, normalized to 0-100
- Fill color: green if `portfolio_summary.net_sentiment > 0`, red otherwise
- Below chart: `total_articles_analyzed`, `net_sentiment`, `top_opportunity`, `top_risk`

**Tab 2: Signal Heatmap**
- Rows: Holdings from `signals.data.by_holding` (NVDA, AAPL, MSFT, etc.)
- Columns: Signal types from `signals.data.by_signal_type`
- Cells: Colored by net sentiment for that holding-signal intersection
  - Green = more positive articles, Red = more negative, Gray = no data
- Implementation: CSS Grid with dynamic `background-color` styles
- Below grid: per-holding summary row (`total_articles`, `dominant_signal`, `risk_signals` vs `opportunity_signals`)
- No charting library needed — plain HTML/CSS

**Tab 3: Signal Timeline**
- Chronological list of recent articles/signals, grouped by signal type
- Data: combine `dashboard.data.digest.sections.direct_news` + `risk_alerts`
- Each entry: headline, affected holdings badges, sentiment icon, signal type badge, relative time
- Expandable sections per signal type using Framer Motion
- List-based UI, no charting library

**Sub-components** (within the file or extracted):
- `SignalRadarTab` — renders radar chart + summary stats
- `SignalHeatmapTab` — renders CSS Grid heatmap
- `SignalTimelineTab` — renders grouped chronological list

---

## Phase 6: Stock Pages + Cleanup (REQUIRES API fully stable)

**Goal**: Replace remaining mock data in stock detail pages, clean up old files.

### File 26: `src/lib/stocks.ts` (MODIFY)

- Remove `getStockNews()` function (lines ~157-187) and `NEWS_TEMPLATES` array
- Add `getStockArticles(symbol: string)`: fetches from `/api/intelligence/articles?ticker=${symbol}&limit=6` server-side
- If Intelligence API unavailable, return empty array (graceful degradation)

### File 27: `src/app/(protected)/dashboard/stocks/[symbol]/page.tsx` (MODIFY)

- Replace `getStockNews(symbol)` call with `getStockArticles(symbol)`
- Map articles to `HistoricalNewsEvent` shape for chart markers (using `published_at` as date)
- Pass to `StockChart` as a prop

### File 28: `src/components/stocks/stock-chart.tsx` (MODIFY)

- Remove `import { historicalStockNews } from "@/lib/mock-data/news"`
- Accept `newsEvents` as a prop instead of reading from mock data
- Parent page passes real article data as chart markers
- If no articles available, show no markers (graceful)

### Cleanup

**After all components are migrated and tested**:

| File | Action |
|------|--------|
| `src/lib/mock-data/news.ts` | Add `// @deprecated — kept for rollback only` header. Delete after validation. |
| `src/lib/mock-data/summaries.ts` | Same treatment. |
| `src/lib/intelligence/mock-fallback.ts` | Keep permanently — used when `INTELLIGENCE_ENABLED=false` |

---

## Docker / Environment Configuration

### Separate Docker Compose (Decision 4 = Option B)

The Intelligence API runs in its own docker-compose with a shared Docker network.

**Intelligence API side** (managed by API team):
```yaml
# intelligence-api/docker-compose.yml
networks:
  intelligence-network:
    driver: bridge
    name: intelligence-network

services:
  intelligence-api:
    container_name: intelligence-api
    # ... their build config ...
    ports:
      - "127.0.0.1:8001:8001"
    networks:
      - intelligence-network
```

**HiveMind side** — Modify `docker-compose.dev.yml`:

Add external network to existing config:
```yaml
networks:
  default:
    driver: bridge
  intelligence-network:
    external: true
    name: intelligence-network

services:
  app:
    # ... existing config ...
    environment:
      - INTELLIGENCE_API_URL=${INTELLIGENCE_API_URL:-http://intelligence-api:8001}
      - INTELLIGENCE_API_KEY=${INTELLIGENCE_API_KEY:-hm-dev-key-change-in-prod}
      - NEXT_PUBLIC_INTELLIGENCE_ENABLED=${NEXT_PUBLIC_INTELLIGENCE_ENABLED:-false}
    networks:
      - default
      - intelligence-network

  db:
    # ... existing config ...
    networks:
      - default
```

**Environment variables** — Add to `.env.local`:
```env
INTELLIGENCE_API_URL=http://intelligence-api:8001
INTELLIGENCE_API_KEY=hm-dev-key-change-in-prod
NEXT_PUBLIC_INTELLIGENCE_ENABLED=true
```

**Startup order**:
1. Start Intelligence API: `cd intelligence-api && docker compose up -d`
2. Start HiveMind: `cd hivemind_app && docker compose -f docker-compose.dev.yml up -d`

**Verification**:
```bash
docker network inspect intelligence-network  # should show both containers
docker compose -f docker-compose.dev.yml exec app curl http://intelligence-api:8001/api/health
```

---

## Testing Strategy

### Phase 1 Tests (run immediately)

| File | Tests |
|------|-------|
| `src/lib/intelligence/__tests__/mappers.test.ts` | `mapSentiment`, `mapMagnitude`, `toRelativeTime`, `mapSignalType`, `sanitizeText`, `computePortfolioWeights`, `simpleHash` |
| `src/lib/intelligence/__tests__/cache.test.ts` | set+get, TTL expiry, stale cache retrieval, clearCache |
| `src/lib/intelligence/__tests__/mock-fallback.test.ts` | Produces valid DashboardResponse and SignalAggregationResponse shapes |

### Phase 2 Tests (after proxy routes exist)

| File | Tests |
|------|-------|
| `src/app/api/intelligence/__tests__/dashboard.test.ts` | Auth check, portfolio lookup, cache hit/miss, stale fallback, feature flag disabled |
| `src/app/api/intelligence/__tests__/signals-aggregate.test.ts` | Same pattern as dashboard |

### Phase 3-5 Tests (after each component migration)

| File | Tests |
|------|-------|
| `src/components/dashboard/__tests__/critical-news.test.tsx` | Renders with provider data, loading skeleton, empty state, stale badge |
| `src/components/dashboard/__tests__/impact-analysis-panel.test.tsx` | Tab switching, radar renders, heatmap renders, timeline renders |

### Phase 6 Tests (full integration)

| File | Tests |
|------|-------|
| `e2e/intelligence-dashboard.spec.ts` | Dashboard loads with intelligence data, portfolio switch, stale badge, all panels render, impact tabs work |

---

## Rollback Plan

### Level 1: Feature Flag (instant, zero code changes)

Set `NEXT_PUBLIC_INTELLIGENCE_ENABLED=false` in `.env.local` and restart.

**Effect**: `IntelligenceDataProvider` uses `mock-fallback.ts` which reshapes existing mock-data files into API response shapes. All components receive the same data they would from the API, just from mock sources.

**Requirement**: Do NOT delete `src/lib/mock-data/news.ts` or `summaries.ts` until fully validated.

### Level 2: Individual Component Revert (minutes)

Each migrated component has a conditional path:
- If `!INTELLIGENCE_ENABLED || !dashboard` → render with mock-fallback data
- Git revert individual component files if needed

### Level 3: Full Branch Revert (last resort)

```bash
git checkout main
docker compose -f docker-compose.dev.yml up -d
```

Main branch has zero intelligence code. All mock data works as before.

### Safety guarantees:

- Mock data files preserved until Phase 6 validation
- Feature flag defaults to `false` — new deployments don't break
- IntelligenceDataProvider catches all fetch errors gracefully
- Docker network changes are additive (removing doesn't break existing services)
- No database schema changes required
- No existing API routes modified (all intelligence routes are new `/api/intelligence/*`)
- No existing component interfaces changed (all changes are internal to component implementation)

---

## File Index (all files touched)

### Created (18 files)

| File | Phase |
|------|-------|
| `src/lib/intelligence/types.ts` | 1 |
| `src/lib/intelligence/mappers.ts` | 1 |
| `src/lib/intelligence/config.ts` | 1 |
| `src/lib/intelligence/cache.ts` | 1 |
| `src/lib/intelligence/client.ts` | 1 |
| `src/lib/intelligence/mock-fallback.ts` | 1 |
| `src/lib/intelligence/index.ts` | 1 |
| `src/app/api/intelligence/dashboard/route.ts` | 2 |
| `src/app/api/intelligence/signals/aggregate/route.ts` | 2 |
| `src/app/api/intelligence/articles/route.ts` | 2 |
| `src/app/api/intelligence/articles/[id]/full/route.ts` | 2 |
| `src/app/api/intelligence/health/route.ts` | 2 |
| `src/components/dashboard/intelligence-data-provider.tsx` | 2 |
| `src/components/dashboard/portfolio-selector.tsx` | 2 |
| `src/components/dashboard/stale-data-badge.tsx` | 2 |
| `src/lib/intelligence/__tests__/mappers.test.ts` | 1 |
| `src/lib/intelligence/__tests__/cache.test.ts` | 1 |
| `e2e/intelligence-dashboard.spec.ts` | 6 |

### Modified (12 files)

| File | Phase | Change |
|------|-------|--------|
| `src/components/dashboard/dashboard-header.tsx` | 2 | Add PortfolioSelector, wire notification bell |
| `src/app/(protected)/dashboard/layout.tsx` | 2 | Wrap with IntelligenceDataProvider |
| `src/components/dashboard/critical-news.tsx` | 3 | Remove mock, use context |
| `src/components/dashboard/todays-summary.tsx` | 3 | Remove mock, use context |
| `src/components/dashboard/portfolio-impact-summary.tsx` | 3 | Remove mock, use context |
| `src/components/dashboard/portfolio-overview.tsx` | 3 | Remove mock, use context |
| `src/components/dashboard/sector-news-panel.tsx` | 4 | Remove mock, fetch articles |
| `src/components/dashboard/stock-news-panel.tsx` | 4 | Remove mock, fetch articles |
| `src/components/dashboard/stock-screener.tsx` | 4 | Replace news overlay |
| `src/components/dashboard/impact-analysis-panel.tsx` | 5 | Major rewrite — 3-tab signal visualization |
| `src/lib/stocks.ts` | 6 | Remove getStockNews, add getStockArticles |
| `src/components/stocks/stock-chart.tsx` | 6 | Accept news as prop instead of mock import |

### Environment / Config (3 files)

| File | Phase | Change |
|------|-------|--------|
| `docker-compose.dev.yml` | 2 | Add intelligence-network, env vars |
| `.env.local` | 2 | Add INTELLIGENCE_API_URL, API_KEY, ENABLED |
| `src/app/(protected)/dashboard/stocks/[symbol]/page.tsx` | 6 | Use real articles for news section + chart markers |
