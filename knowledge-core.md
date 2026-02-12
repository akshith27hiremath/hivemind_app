# HiveMind Knowledge Core

> Accumulated learnings and patterns discovered during development.
> Last updated: 2026-02-11

---

## API Patterns

### Yahoo Finance v3 Initialization
```typescript
// CORRECT - v3 requires instantiation
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();

// WRONG - v2 style (no longer works)
import yahooFinance from "yahoo-finance2";
```

### Lightweight Charts v5 API
```typescript
// CORRECT - v5 uses addSeries with type
import { AreaSeries, CandlestickSeries } from "lightweight-charts";
chart.addSeries(AreaSeries, { lineColor: "#10b981" });

// WRONG - v4 style (no longer works)
chart.addAreaSeries({ lineColor: "#10b981" });
```

### Lightweight Charts v5 News Markers
```typescript
// createSeriesMarkers - v5 API for chart annotations
import { createSeriesMarkers, SeriesMarker, Time } from "lightweight-charts";

const markers: SeriesMarker<Time>[] = events.map((event) => ({
  time: event.date as Time,
  position: "aboveBar", // or "belowBar"
  color: "#22c55e",     // marker color
  shape: "arrowUp",     // arrowUp, arrowDown, circle, square
  text: "Label text",   // shown above/below marker
  size: 2,              // 1 (small) or 2 (large)
}));
createSeriesMarkers(series, markers);
```

### Next.js 14 Dynamic Route Params
```typescript
// Client components - use useParams hook
const params = useParams();
const id = params.id as string;

// Server components - params is a Promise
const { id } = await params;
```

### Intelligence API (Mock Service)
```
Container: hivemind_mock (port 8001)
Network: intelligence-network (external Docker network)
Alias: intelligence-api (used by app container to resolve hostname)
API Key: hm-dev-key-change-in-prod (X-API-Key header)
Config: src/lib/intelligence/config.ts
Client: src/lib/intelligence/client.ts (server-only, 10s timeout)
Docs: MOCK_API_DOCS.md (18 endpoints, full reference)
```

**BFF Proxy Pattern** (Frontend never calls Intelligence API directly):
```
Browser → /api/intelligence/dashboard (POST) → Intelligence API /api/dashboard
Browser → /api/intelligence/signals  (POST) → Intelligence API /api/signals/aggregate
Browser → /api/intelligence/articles (GET)  → Intelligence API /api/articles
Browser → /api/intelligence/articles/[id] (GET) → Intelligence API /api/articles/{id}/full
```
- Auth (Clerk) + portfolio injection happen server-side in BFF routes
- Portfolio holdings are converted to `{ticker, weight_pct}` format for Intelligence API

**Data Provider Pattern**:
```typescript
// IntelligenceDataProvider wraps the dashboard layout
// Provides: dashboard, signals, loading, error, staleAt, refresh()
// Polls every 5 min (POLLING_INTERVAL), stale badge after 10 min (STALE_THRESHOLD)
const { dashboard, signals } = useIntelligenceData();
```

**27 Supported Tickers** (must match across all stock lists):
- Portfolio (10): AAPL, MSFT, NVDA, GOOGL, AMZN, META, TSM, JPM, JNJ, XOM
- Supply Chain (10): ASML, LRCX, AMAT, MU, QCOM, AVGO, TXN, INTC, AMD, CRM
- Competitors (7): GS, V, MA, TSLA, NFLX, DIS, BA
- Lists live in: `src/lib/stocks.ts`, `src/lib/db/queries/portfolios.ts`, 3 UI components

**RiskAlert vs DigestItem shapes** (common mistake):
```typescript
// digest.sections.risk_alerts → RiskAlert shape:
{ alert_id, trigger_article_id, trigger_headline, severity_tier, affected_holdings }

// digest.sections.direct_news → DigestItem shape:
{ article_id, headline, relevance_score, affected_holdings, summary }

// DO NOT mix these up — they have different field names!
```

**Testing Intelligence E2E**:
```bash
docker compose -f docker-compose.dev.yml exec app node test-intelligence-e2e.mjs
# 156 tests covering all endpoints, data shapes, component compatibility
```

---

## Database Patterns

### Drizzle Upsert Pattern
```typescript
await db
  .insert(table)
  .values(data)
  .onConflictDoUpdate({
    target: [table.col1, table.col2],
    set: { ...updateData },
  });
```

### Stock Price Sync (Incremental)
- Check `getLatestPriceDate()` before fetching
- Only fetch from last date + 1 day to today
- Prevents duplicate API calls

---

## UI Patterns

### TradingView-style Chart Controls
- Time ranges: 1M, 3M, 6M, 1Y, 5Y, MAX
- Disable ranges with insufficient data
- Show performance % badge for selected range
- Color based on positive/negative change

### Dark Glassmorphism Theme (Protected Pages)
- Background: inherits from globals.css dark `:root` theme
- Cards: `bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl`
- Text: `text-white` (primary), `text-gray-400` (secondary), `text-gray-500` (muted)
- Inputs: `border-white/10 bg-white/5 text-white placeholder-gray-500`
- Positive badges: `bg-emerald-500/20 text-emerald-400 border border-emerald-500/30`
- Negative badges: `bg-red-500/20 text-red-400 border border-red-500/30`
- Gradient buttons: `bg-gradient-to-r from-blue-500 to-purple-500`

### Loading States
- Use skeleton divs with `animate-pulse`
- Match layout structure for smooth transition

---

## Operational Patterns

### Docker-First Development
- **Never run `npm run dev` on host** - all services run in Docker
- Start with: `docker compose -f docker-compose.dev.yml up -d`
- App container handles hot reload via WATCHPACK_POLLING
- Database commands run inside container: `docker compose exec app npm run db:push`

### Webhook Requirements
**Clerk** (`/api/webhooks/clerk`):
- Events: `user.created`, `user.updated`, `user.deleted`
- Syncs user data to `users` table
- Use ngrok or Clerk CLI for local testing

**Stripe** (`/api/webhooks/stripe`):
- Events: `checkout.session.completed`, `customer.subscription.*`
- Updates `subscriptions` table
- Run: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### Database Access
- External port: 5433 (for Drizzle Studio, local tools)
- Internal port: 5432 (app container uses this)
- Connection: `postgresql://postgres:postgres@localhost:5433/hivemind_dev`

---

## Troubleshooting Archive

### Docker Hot Reload (Windows)
- Set `WATCHPACK_POLLING=true`
- Set `CHOKIDAR_USEPOLLING=true`

### Clerk Cold Start
- Wrap `currentUser()` in try/catch
- Redirect to sign-in on error

---

## Historical Notes

### Phase 7 Completion (2025-12-27)
- Portfolio CRUD API with holdings
- S&P 500 stock validation (10 sample stocks)
- Subscription limit enforcement

### Stock Feature Addition (2025-12-27)
- Added `stock_prices` table (30,180 rows synced)
- Yahoo Finance integration for 12-year history
- TradingView lightweight-charts for visualization
- Daily sync via `/api/stocks/sync`

### Dashboard Figma Implementation (2026-02-11)
- Dark glassmorphism theme applied to all protected pages
- Dashboard panels: CriticalNews, SectorNews, StockNews, StockScreener, ImpactAnalysis
- News markers added to lightweight-charts using createSeriesMarkers v5 API

### Intelligence API Integration (2026-02-11)
- BFF proxy pattern: 4 Next.js API routes proxying to Intelligence API
- IntelligenceDataProvider context with polling + stale detection
- All 6 dashboard panels migrated from mock data to live Intelligence API
- Stock pages now show real articles with chart markers from Intelligence enrichment
- Mock data files (`src/lib/mock-data/news.ts`, `summaries.ts`) deprecated, kept for rollback
- Impact Analysis redesigned: Signal Radar (recharts), Signal Heatmap (CSS grid), Signal Timeline
- Expanded stock lists from 10 → 27 tickers to match Intelligence API watchlist
- E2E test suite: 156 tests validating all data flows (test-intelligence-e2e.mjs)
- Hydration fix: date formatting deferred to client-only useEffect to avoid UTC/local mismatch
