# HiveMind Frontend Feature Audit

## Status Legend
- **REAL** = Connected to live service (Clerk/Stripe/Yahoo Finance/PostgreSQL)
- **MOCK** = Hardcoded/template data, no real backend
- **PARTIAL** = Some real data, some hardcoded
- **UNUSED** = Code exists but nothing imports it

---

## Authentication & User Management

| Feature | Status | Data Source | Location |
|---------|--------|-------------|----------|
| Sign-in page | REAL | Clerk `<SignIn />` component | `src/app/(auth)/sign-in/` |
| Sign-up page | REAL | Clerk `<SignUp />` component | `src/app/(auth)/sign-up/` |
| Route protection middleware | REAL | Clerk `clerkMiddleware` | `src/middleware.ts` |
| User sync to DB | REAL | Clerk webhook → PostgreSQL `users` table | `src/app/api/webhooks/clerk/route.ts` |
| Dev user sync bypass | REAL | Manual trigger (dev only) | `src/app/api/dev/sync-user/route.ts` |

---

## Subscription & Billing

| Feature | Status | Data Source | Location |
|---------|--------|-------------|----------|
| Stripe checkout (upgrade to Pro) | REAL | Stripe Checkout Sessions API | `src/app/api/stripe/checkout/route.ts` |
| Stripe customer portal | REAL | Stripe Billing Portal API | `src/app/api/stripe/portal/route.ts` |
| Subscription status check | REAL | PostgreSQL `subscriptions` table | `src/app/api/subscription/status/route.ts` |
| Stripe webhooks (lifecycle) | REAL | Stripe webhook → PostgreSQL | `src/app/api/webhooks/stripe/route.ts` |
| Free plan portfolio limit (1) | REAL | DB check in POST /api/portfolios | `src/app/api/portfolios/route.ts` |
| Plan feature lists on pricing page | MOCK | Hardcoded array in component | `src/app/(protected)/pricing/page.tsx` |
| Plan feature lists on landing page | MOCK | Hardcoded array in component | `src/components/landing/pricing.tsx` |
| Sidebar "Pro Plan" label | MOCK | Hardcoded string for all users | `src/components/dashboard/sidebar.tsx:77` |

**Issue**: Plan data is duplicated in 3 places (Stripe lib, pricing page, landing pricing) with no shared constant.

---

## Portfolio Management

| Feature | Status | Data Source | Location |
|---------|--------|-------------|----------|
| List portfolios | REAL | `GET /api/portfolios` → PostgreSQL | Dashboard panel + `/dashboard/portfolios` |
| Create portfolio | REAL | `POST /api/portfolios` → PostgreSQL | Dashboard panel + `/dashboard/portfolios` |
| Delete portfolio | REAL | `DELETE /api/portfolios/{id}` → PostgreSQL | Dashboard panel + `/dashboard/portfolios` |
| View portfolio with holdings | REAL | `GET /api/portfolios/{id}` → PostgreSQL | Dashboard panel + `/dashboard/portfolios/[id]` |
| Add holding | REAL | `POST /api/portfolios/{id}/holdings` → PostgreSQL | Dashboard panel + `/dashboard/portfolios/[id]` |
| Delete holding | REAL | `DELETE /api/.../holdings/{id}` → PostgreSQL | Dashboard panel + `/dashboard/portfolios/[id]` |
| Edit portfolio (name/desc) | UNUSED | `PATCH /api/portfolios/{id}` exists, no UI | API only |
| Edit holding (qty/price) | UNUSED | `PATCH /api/.../holdings/{id}` exists, no UI | API only |
| Holdings currentPrice auto-update | MISSING | Field stays null unless manually set | Schema has field, no updater |

**Issues**:
- Portfolio management UI is implemented 3 times (PortfolioManagerPanel, /dashboard/portfolios, /dashboard/portfolios/[id])
- Currency default mismatch: schema defaults "INR", API sets "USD"
- Stock selection restricted to 10 hardcoded S&P 500 symbols
- 4 orphaned light-theme components in `src/components/portfolios/` (unused)

---

## Stock Data

| Feature | Status | Data Source | Location |
|---------|--------|-------------|----------|
| Stock list with live quotes | REAL | Yahoo Finance API via `getAllStockQuotes()` | `/dashboard/stocks` page |
| Stock detail (price, volume, etc.) | REAL | Yahoo Finance API via `getStockQuote()` | `/dashboard/stocks/[symbol]` page |
| Historical price chart (12yr OHLCV) | REAL | PostgreSQL `stock_prices` table | `StockChart` component |
| Stock price sync from Yahoo | REAL | `POST /api/stocks/sync` → Yahoo → PostgreSQL | `src/app/api/stocks/sync/route.ts` |
| 52W High / 52W Low | MISSING | Always shows "--" | `/dashboard/stocks/[symbol]` page |
| Stock detail page news | MOCK | Template-generated via `getStockNews()` | `src/lib/stocks.ts:157-187` |
| Chart news markers | MOCK | `historicalStockNews` in `src/lib/mock-data/news.ts` | `src/components/stocks/stock-chart.tsx` |

---

## Dashboard Panels — Summary View (activePanel="summary")

| Component | Status | Data Source | Mock File |
|-----------|--------|-------------|-----------|
| **PortfolioImpactSummary** | MOCK | `portfolioSummary` object | `src/lib/mock-data/summaries.ts` |
| **PortfolioOverview** | MOCK | `portfolioOverview` object | `src/lib/mock-data/summaries.ts` |
| **CriticalNews** | MOCK | `criticalNews` array (3 items) | `src/lib/mock-data/news.ts` |
| **TodaysSummary** | MOCK | `summaryItems` array (5 items) | `src/lib/mock-data/summaries.ts` |

**Data shapes consumed**:
- `portfolioSummary`: `{ netImpact, newsAnalyzed, avgConfidence, topMover, topMoverChange }`
- `portfolioOverview`: `{ summary, analysis, riskFactors, recommendation }` (narrative text)
- `criticalNews[]`: `{ id, title, time, timestamp, source, impact, sentiment, category, stocks[] }`
- `summaryItems[]`: `{ id, stock, impact, change, reason, news, confidence }`

---

## Dashboard Panels — Sector News (activePanel="sector")

| Component | Status | Data Source | Mock File |
|-----------|--------|-------------|-----------|
| **SectorNewsPanel** | MOCK | `sectorNews` array (3 sectors, 6 items) | `src/lib/mock-data/news.ts` |

Supports filtering by sector, sorting by time/impact/relevance, filtering by sentiment. All operations work on the static mock dataset.

**Data shape**: `{ sector, news: { id, title, summary?, time, timestamp, source, impact, sentiment, category, stocks[], relevance? }[] }[]`

---

## Dashboard Panels — Stock News (activePanel="stock")

| Component | Status | Data Source | Mock File |
|-----------|--------|-------------|-----------|
| **StockNewsPanel** | MOCK | `stockSpecificNews` array (6 items) | `src/lib/mock-data/news.ts` |

Supports filtering by stock, sorting by time/impact/sentiment.

**Data shape**: `{ id, stock, title, source, summary, time, timestamp, sentiment, priceImpact, impactValue }`

**Non-functional elements**: "Analyze Impact" button (no handler), external link button (no URL).

---

## Dashboard Panels — Stock Screener (activePanel="comparison")

| Component | Status | Data Source | Mock File |
|-----------|--------|-------------|-----------|
| **StockScreener** | MOCK | Hardcoded inline + `stockNewsData`/`sectorWideNews` | Component itself + `src/lib/mock-data/news.ts` |

- Only 4 stocks available (NVDA, TSLA, AAPL, MSFT) vs 10 in the system
- Only "1D" timeframe has data; all other timeframes (15m, 30m, 1h, 1W, 1M) fall back to 1D
- 14 hardcoded intraday price points per stock
- Uses Recharts (not lightweight-charts)

**Data shape**: `{ time: string, price: number }[]` per stock, normalized to % change for comparison.

---

## Dashboard Panels — Impact Analysis (activePanel="impact")

| Component | Status | Data Source | Mock File |
|-----------|--------|-------------|-----------|
| **ImpactAnalysisPanel** | MOCK | `analysisData` hardcoded inline (3 stocks) | Component itself |

- Radar charts with 6 factors: Product Innovation, Market Demand, Competition, Pricing Power, Supply Chain, Regulatory
- Shows 3 stocks: NVDA (+8.5 direct impact), TSLA (-6.2), MSFT (+7.1)
- "Neural Engine Insight" text is template-conditional, not actual AI

**Data shape**: `{ stock, news, directImpact, sectorImpact, marketImpact, timeframe, confidence, factors: { name, value }[] }`

---

## Dashboard Panels — Portfolio Manager (activePanel="portfolio")

| Component | Status | Data Source |
|-----------|--------|-------------|
| **PortfolioManagerPanel** | REAL | `/api/portfolios` + `/api/portfolios/{id}/holdings` |

Self-contained 797-line component with embedded sub-components. Full CRUD minus edit.

---

## Settings Page

| Feature | Status | Data Source | Location |
|---------|--------|-------------|----------|
| Profile display (name, email, avatar) | REAL | Clerk `currentUser()` | `src/app/(protected)/settings/page.tsx` |
| Subscription status display | REAL | PostgreSQL via `getActiveSubscriptionByUserId()` | `src/app/(protected)/settings/subscription-card.tsx` |
| Manage Subscription button | REAL | Redirects to Stripe Customer Portal | Same |
| Upgrade to Pro link | REAL | Links to `/pricing` | Same |

---

## Landing Page

| Component | Status | Notes |
|-----------|--------|-------|
| Header (auth-aware CTA) | REAL | Uses Clerk `useAuth()` for Dashboard/Sign In toggle |
| Hero section | MOCK | Static marketing copy |
| Features section | MOCK | 6 hardcoded feature cards |
| Pricing section | MOCK | Hardcoded plan arrays, CTAs link to /sign-up |
| Footer | MOCK | Static links (some to non-existent pages: /about, /contact, /privacy, /terms) |

---

## UI Infrastructure

| Feature | Status | Notes |
|---------|--------|-------|
| Dark glassmorphism theme | REAL | Forced via `globals.css` `:root` override |
| Dashboard panel navigation | REAL | `DashboardContext` with `activePanel` state (no URL routing) |
| Sidebar with 6 nav items | REAL | Clerk user data for name/initials |
| Notification bell in header | MOCK | Decorative only — no handler, hardcoded red dot |

---

## Database Tables

| Table | API Routes | Query Functions | UI | Status |
|-------|-----------|----------------|-----|--------|
| `users` | Webhooks only | Full CRUD | Settings (read) | REAL |
| `subscriptions` | Webhooks + status check | Full CRUD | Settings + Pricing | REAL |
| `portfolios` | Full REST | Full CRUD | Dashboard + Pages | REAL |
| `holdings` | Full REST | Full CRUD + upsert | Dashboard + Pages | REAL |
| `transactions` | NONE | NONE | NONE | SCHEMA ONLY |
| `import_logs` | NONE | NONE | NONE | SCHEMA ONLY |
| `stock_prices` | Sync + read | Via `stocks.ts` | Charts | REAL |

---

## Mock Data Files (To Be Replaced)

| File | Exports | Used By |
|------|---------|---------|
| `src/lib/mock-data/news.ts` | `criticalNews`, `sectorNews`, `stockNewsData`, `stockSpecificNews`, `sectorWideNews`, `historicalStockNews` | CriticalNews, SectorNewsPanel, StockScreener, StockNewsPanel, StockChart |
| `src/lib/mock-data/summaries.ts` | `summaryItems`, `portfolioSummary`, `portfolioOverview` | TodaysSummary, PortfolioImpactSummary, PortfolioOverview |
| `src/lib/stocks.ts` (getStockNews) | Template-generated news array | Stock detail page |
