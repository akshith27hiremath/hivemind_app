# HiveMind - Portfolio Tracking SaaS

## Project Overview

HiveMind is a SaaS application for tracking and managing investment portfolios. Built with Next.js 14 App Router, TypeScript, and a modern tech stack.

### Tech Stack
- **Framework**: Next.js 14.2.35 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL 16 (Docker) + Drizzle ORM
- **Authentication**: Clerk
- **Payments**: Stripe (subscriptions)
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: lightweight-charts v5.1 (TradingView) + Recharts v3.6
- **Animation**: Framer Motion (motion/react)
- **Icons**: Lucide React
- **Testing**: Vitest + React Testing Library
- **Containerization**: Docker + Docker Compose

### Architecture
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group (sign-in, sign-up)
│   ├── (protected)/       # Protected routes
│   │   ├── dashboard/     # Dashboard + portfolios
│   │   ├── settings/      # User settings
│   │   └── pricing/       # Subscription plans
│   ├── api/               # API routes
│   │   ├── health/        # Health check endpoint
│   │   ├── portfolios/    # Portfolio & holdings CRUD
│   │   ├── stocks/        # Stock data & sync APIs
│   │   ├── stripe/        # Stripe checkout & portal
│   │   └── webhooks/      # Clerk & Stripe webhooks
│   └── layout.tsx         # Root layout with ClerkProvider
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── landing/          # Landing page components
│   ├── dashboard/        # Dashboard panels (news, screener, impact)
│   ├── portfolios/       # Portfolio UI components
│   └── stocks/           # Stock chart components
├── lib/
│   ├── db/               # Database (Drizzle)
│   │   ├── index.ts      # DB connection
│   │   ├── schema.ts     # Table definitions
│   │   └── queries/      # Query functions
│   ├── stocks.ts         # Yahoo Finance + stock DB operations
│   ├── stripe/           # Stripe utilities
│   └── utils.ts          # Utility functions (cn)
├── config/               # App configuration
├── env.ts               # Environment validation
└── middleware.ts        # Clerk auth middleware
```

## Session Startup Checklist

**This project uses a Docker-first development approach.** All services (Next.js app, PostgreSQL) run inside Docker containers. Never run `npm run dev` directly on the host.

### 1. Start Docker Services
```bash
# Start all services (app on :3000, postgres on :5433)
docker compose -f docker-compose.dev.yml up -d

# Verify services are running
docker compose -f docker-compose.dev.yml ps
```

### 2. Start Webhook Listeners (separate terminals)

**Clerk Webhooks** (user sync):
```bash
# Using ngrok or Clerk CLI for local development
# Webhook endpoint: /api/webhooks/clerk
# Events: user.created, user.updated, user.deleted
```

**Stripe Webhooks** (subscription events):
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET in .env.local
# Events: checkout.session.completed, customer.subscription.*
```

### 3. Verify Database
```bash
# Check postgres is healthy
docker compose -f docker-compose.dev.yml logs db

# Push schema if needed
docker compose -f docker-compose.dev.yml exec app npm run db:push -- --force
```

### 4. Intelligence API (Mock)
The mock Intelligence API runs as a separate container (`hivemind_mock`) and must be network-connected:
```bash
# Verify the intelligence network and container exist
docker network inspect intelligence-network
docker ps | findstr hivemind_mock

# If not running, create network and connect:
docker network create intelligence-network
docker network connect --alias intelligence-api intelligence-network hivemind_mock
docker network connect intelligence-network hivemind-app

# Test connectivity from app container
docker compose -f docker-compose.dev.yml exec app node -e "const h=require('http');h.get('http://intelligence-api:8001/api/health',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>console.log(d))})"
```

### Services Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose                            │
├─────────────────────────┬───────────────────────────────────┤
│  app (Next.js)          │  db (PostgreSQL 16)               │
│  - Port 3000            │  - Port 5433 (external)           │
│  - Hot reload enabled   │  - Port 5432 (internal)           │
│  - WATCHPACK_POLLING    │  - Volume: postgres_data          │
└─────────┬───────────────┴───────────────────────────────────┘
          │
          ├──── intelligence-network ────┐
          │                              │
          ▼                              ▼
┌─────────────────────┐    ┌──────────────────────────────┐
│  External Services  │    │  hivemind_mock (Intelligence) │
├─────────────────────┤    │  - Port 8001                  │
│  Clerk (auth)       │    │  - Alias: intelligence-api    │
│  Stripe (payments)  │    │  - API Key: X-API-Key header  │
│  Yahoo Finance API  │    │  - 27 tickers, 18 endpoints   │
└─────────────────────┘    │  - Docs: MOCK_API_DOCS.md     │
                           └──────────────────────────────┘
```

---

## Development Setup

### Prerequisites
- Docker Desktop (required)
- Node.js 20+ (for local tooling only)
- Clerk account (auth)
- Stripe account (payments)
- Stripe CLI (for webhook testing)

### Environment Variables
Required in `.env.local` (and duplicated in `.env` for Docker Compose substitution):
```env
# Database (Docker handles this, but needed for local drizzle commands)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/hivemind_dev

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID_PRO=price_xxx

# Intelligence API
INTELLIGENCE_API_URL=http://intelligence-api:8001
INTELLIGENCE_API_KEY=hm-dev-key-change-in-prod
NEXT_PUBLIC_INTELLIGENCE_ENABLED=true
```

**Important**: Docker Compose reads `.env` (NOT `.env.local`) for variable substitution. Keep Intelligence API vars in BOTH files.

### Running the App
```bash
# Start all services (app + postgres)
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f app

# Stop services
docker compose -f docker-compose.dev.yml down

# Rebuild after package changes
docker compose -f docker-compose.dev.yml build --no-cache
```

### Database Commands
```bash
# Push schema changes (inside Docker)
docker compose -f docker-compose.dev.yml exec app npm run db:push -- --force

# Generate migrations
docker compose -f docker-compose.dev.yml exec app npm run db:generate

# Open Drizzle Studio
npm run db:studio
```

### Testing
```bash
# Unit & Integration Tests (Vitest)
npm test                    # Run all tests (156 tests)
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report

# E2E Tests (Playwright)
npm run test:e2e            # Run E2E tests
npm run test:e2e:headed     # Run with browser visible
npm run test:e2e:ui         # Playwright UI mode
npm run test:e2e:report     # View last report

# Run specific test files
npm test src/app/api        # API integration tests
npm run test:e2e e2e/landing.spec.ts  # Landing page E2E
```

### Test Structure
```
src/
├── **/__tests__/           # Unit & integration tests
│   ├── button.test.tsx     # Component tests
│   ├── users.test.ts       # DB query tests
│   └── stripe-checkout.test.ts  # API route tests
e2e/
├── landing.spec.ts         # Landing page E2E
├── auth.spec.ts            # Auth flow E2E
└── stripe-checkout.spec.ts # Payment flow E2E
```

### Test User (Clerk)
For E2E auth tests, a test user is configured:
- Email: boytest@test.com
- Set `TEST_AUTH_TESTS=1` to enable auth E2E tests

### Stripe Testing
- Use test card: `4242 4242 4242 4242`
- Start Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- See `e2e/stripe-checkout.spec.ts` for full manual testing guide

## Database Schema

### Tables
1. **users** - Synced from Clerk via webhook
   - `id`, `clerkId`, `email`, `firstName`, `lastName`, `imageUrl`, `stripeCustomerId`

2. **subscriptions** - Stripe subscription data
   - `id`, `userId`, `stripeSubscriptionId`, `stripePriceId`, `status`, `currentPeriodStart/End`, `cancelAtPeriodEnd`

3. **portfolios** - User portfolios
   - `id`, `userId`, `name`, `description`, `source`, `isActive`

4. **holdings** - Portfolio holdings
   - `id`, `portfolioId`, `symbol`, `exchange`, `quantity`, `averagePrice`, `currentPrice`

5. **transactions** - Buy/sell transactions
   - `id`, `portfolioId`, `holdingId`, `symbol`, `transactionType`, `quantity`, `price`, `transactionDate`

6. **import_logs** - CSV import tracking
   - `id`, `portfolioId`, `source`, `status`, `totalRecords`, `processedRecords`

7. **stock_prices** - Historical stock price data (12 years, ~30K rows)
   - `id`, `symbol`, `date`, `open`, `high`, `low`, `close`, `volume`
   - Unique constraint on (symbol, date)
   - Synced from Yahoo Finance via `/api/stocks/sync`

## Key Features

### Authentication (Clerk)
- Middleware protects `/dashboard`, `/settings`, `/portfolio`, `/pricing`
- Webhook syncs user data to database on create/update/delete
- Sign-in/sign-up pages use Clerk components

### Subscriptions (Stripe)
- **Free Plan**: 1 portfolio, manual entry, basic analytics
- **Pro Plan ($5/mo)**: Unlimited portfolios, CSV import, advanced analytics
- Checkout session API creates Stripe checkout
- Customer portal for subscription management
- Webhook handles subscription lifecycle events
- Idempotent customer creation (no duplicate Stripe customers)

### Protected Routes
- Dashboard: Intelligence-powered panels (summary, news, screener, impact analysis)
- Settings: Profile info + subscription management
- Pricing: Plan comparison + upgrade button
- Stocks: Browse 27 supported stocks with interactive charts + real news

### Stock Data (Yahoo Finance + Intelligence API)
- **27 Supported Tickers**: 10 portfolio + 10 supply chain + 7 competitors/2nd-hop
  - Portfolio: AAPL, MSFT, NVDA, GOOGL, AMZN, META, TSM, JPM, JNJ, XOM
  - Supply Chain: ASML, LRCX, AMAT, MU, QCOM, AVGO, TXN, INTC, AMD, CRM
  - Competitors: GS, V, MA, TSLA, NFLX, DIS, BA
- **12 Years History**: ~3,000 data points per stock stored in database
- **TradingView Charts**: Area, candlestick, line charts with time ranges (1M-MAX)
- **Daily Sync**: `/api/stocks/sync` fetches incremental updates
- **Live Quotes**: Real-time price from Yahoo Finance API
- **News Articles**: Real articles from Intelligence API with enrichment (signals, entities, relevance)

### Intelligence API Integration
- **BFF Pattern**: Frontend → Next.js API routes (`/api/intelligence/*`) → Intelligence API
- **Data Provider**: `IntelligenceDataProvider` React context wraps dashboard, polls every 5 min
- **Stale Detection**: Data older than 10 min shows stale badge, auto-refreshes
- **Endpoint Docs**: Full reference in `MOCK_API_DOCS.md` (18 endpoints)
- **Key Endpoints Used**:
  - `POST /api/dashboard` — batch endpoint for digest, exposure, alerts, narratives
  - `POST /api/signals/aggregate` — signal breakdown by type/holding over N days
  - `GET /api/articles` — paginated article feed with enrichment
  - `GET /api/articles/{id}/full` — article + relevance + summaries combo

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/portfolios` | GET, POST | List/create portfolios |
| `/api/portfolios/[id]` | GET, PATCH, DELETE | Single portfolio operations |
| `/api/portfolios/[id]/holdings` | GET, POST | List/add holdings |
| `/api/portfolios/[id]/holdings/[holdingId]` | PATCH, DELETE | Update/remove holding |
| `/api/stocks` | GET | List all 27 stocks with live quotes |
| `/api/stocks/[symbol]` | GET | Stock detail with historical data + articles |
| `/api/stocks/sync` | GET, POST | GET: sync status, POST: trigger sync |
| `/api/intelligence/dashboard` | POST | BFF proxy → Intelligence dashboard |
| `/api/intelligence/signals` | POST | BFF proxy → Intelligence signals/aggregate |
| `/api/intelligence/articles` | GET | BFF proxy → Intelligence articles feed |
| `/api/intelligence/articles/[id]` | GET | BFF proxy → Intelligence article full |
| `/api/stripe/checkout` | POST | Create checkout session |
| `/api/stripe/portal` | POST | Create customer portal session |
| `/api/subscription/status` | GET | Get user subscription status |
| `/api/dev/sync-user` | POST | DEV ONLY: Sync Clerk user to DB |
| `/api/webhooks/clerk` | POST | Clerk user sync webhook |
| `/api/webhooks/stripe` | POST | Stripe subscription webhook |

## Implementation Progress

### Completed Phases (Core)
- [x] **Phase 1**: Project initialization (Next.js, TypeScript, Tailwind, shadcn/ui)
- [x] **Phase 2**: Database schema (Drizzle ORM, PostgreSQL, 7 tables)
- [x] **Phase 3**: Clerk authentication (middleware, webhooks, protected routes)
- [x] **Phase 4**: Stripe subscriptions (checkout, portal, webhooks, pricing page)
- [x] **Phase 5**: Testing infrastructure (Vitest 156 tests, Playwright E2E)
- [x] **Phase 6**: Landing page & marketing UI (hero, features, pricing, footer)
- [x] **Phase 7**: Portfolio management (CRUD API, holdings, S&P 500 validation, UI)
- [x] **Stock Data**: Yahoo Finance integration, 12-year history, TradingView charts

### Completed Phases (Figma Dashboard - Dark Glassmorphism Theme)
- [x] **Dashboard Phase 2**: Dashboard layout with sidebar navigation
- [x] **Dashboard Phase 3**: Today's Summary component
- [x] **Dashboard Phase 4**: Critical News Feed, Sector News, Stock News panels
- [x] **Dashboard Phase 5**: Stock Screener with dual comparison charts (recharts)
- [x] **Dashboard Phase 6**: Impact Analysis Panel with radar chart
- [x] **Portfolio Manager**: Full CRUD synced with existing API
- [x] **Dark Theme**: All protected pages updated to glassmorphism styling
- [x] **News Markers**: lightweight-charts v5 createSeriesMarkers on stock charts

### Completed Phases (Intelligence API Integration)
- [x] **Intelligence Phase 1**: Foundation (types, client, config, mappers)
- [x] **Intelligence Phase 2**: BFF proxy routes + IntelligenceDataProvider context
- [x] **Intelligence Phase 3**: Summary panel migration (live digest data)
- [x] **Intelligence Phase 4**: News panel migration (Critical, Sector, Stock → real articles)
- [x] **Intelligence Phase 5**: Impact Analysis redesign (Signal Radar, Heatmap, Timeline)
- [x] **Intelligence Phase 6**: Stock pages (real articles, chart markers, mock deprecation)
- [x] **27-Ticker Expansion**: All stock lists updated to match Intelligence API watchlist
- [x] **E2E Test Suite**: `test-intelligence-e2e.mjs` — 156 tests covering all data flows

## Code Conventions

### File Naming
- Components: PascalCase (`Button.tsx`)
- Utilities: camelCase (`utils.ts`)
- Route handlers: `route.ts`
- Pages: `page.tsx`
- Layouts: `layout.tsx`

### Database Queries
- All queries in `src/lib/db/queries/`
- Function naming: `getXByY`, `createX`, `updateX`, `deleteX`
- Always use type-safe Drizzle queries

### API Routes
- Use `NextResponse.json()` for responses
- Always check auth with `await auth()`
- Return proper HTTP status codes
- Log errors with `console.error()`

### Components
- Server components by default
- Use `"use client"` only when needed
- Props interfaces defined inline or in same file

## Docker Configuration

### Services
- **app**: Next.js dev server (port 3000)
- **db**: PostgreSQL 16 Alpine (port 5433 external, 5432 internal)
- **hivemind_mock**: Intelligence API (port 8001, on `intelligence-network` with alias `intelligence-api`)

### Volumes
- `postgres_data`: Database persistence
- `node_modules`: Isolated node_modules
- `next_cache`: Next.js build cache

### Environment
- `WATCHPACK_POLLING=true` for Windows file watching
- `CHOKIDAR_USEPOLLING=true` for hot reload

## Troubleshooting

### Common Issues

**Docker build fails with npm ci error**
```bash
npm install  # Update package-lock.json locally
docker compose -f docker-compose.dev.yml build --no-cache
```

**Database connection refused**
```bash
# Ensure postgres container is healthy
docker compose -f docker-compose.dev.yml ps
# Check logs
docker compose -f docker-compose.dev.yml logs db
```

**Clerk middleware issues**
- Ensure middleware.ts is in `src/` directory
- Check matcher patterns exclude static files
- Verify environment variables are set

**Hot reload not working (Windows)**
- Ensure WATCHPACK_POLLING=true is set
- Restart containers after adding new files
- Check volume mounts in docker-compose

**Intelligence API connection refused (ECONNREFUSED)**
- Port is 8001, NOT 8000 — check `INTELLIGENCE_API_URL=http://intelligence-api:8001`
- Verify `hivemind_mock` container is running: `docker ps | findstr hivemind_mock`
- Verify both containers share `intelligence-network`: `docker network inspect intelligence-network`
- Re-connect if needed: `docker network connect --alias intelligence-api intelligence-network hivemind_mock`

**Hydration mismatch on dates**
- Docker container runs UTC, browser runs local timezone
- Always defer date formatting to client-only: `useState("") + useEffect(() => setDate(...))`
- Never compute locale-dependent dates in server components

## Git Workflow

### Branch Strategy
- `main` - Production-ready code
- `feature/phase-X-*` - Feature branches

### Commit Convention
```
feat(scope): description
fix(scope): description
docs(scope): description
test(scope): description
```

### Current Branch
`feature/intelligence-api-integration` (includes all core phases + dashboard UI + Intelligence API)

## Knowledge Core

Accumulated learnings and patterns are stored in `knowledge-core.md`:
- API version patterns (Yahoo Finance v3, lightweight-charts v5, Intelligence API)
- Database patterns (Drizzle upserts, incremental sync)
- UI patterns (TradingView-style controls, glassmorphism)
- Intelligence API patterns (BFF proxy, data provider, 27 tickers)
- Troubleshooting archive (Docker, Clerk, hydration, Intelligence API)
