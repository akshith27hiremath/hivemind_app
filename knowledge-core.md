# HiveMind Knowledge Core

> Accumulated learnings and patterns discovered during development.
> Last updated: 2025-12-27

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

### Next.js 14 Dynamic Route Params
```typescript
// Client components - use useParams hook
const params = useParams();
const id = params.id as string;

// Server components - params is a Promise
const { id } = await params;
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
