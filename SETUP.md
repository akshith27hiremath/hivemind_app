# HiveMind -- Developer Setup Guide

Complete setup instructions for running HiveMind on a fresh machine.

**Prerequisites:** Docker, Docker Compose, Node.js 20+, Git, Stripe CLI (`brew install stripe/stripe-cli/stripe`).

---

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│              Docker Compose (HiveMind)            │
│                                                   │
│  ┌──────────────────┐   ┌──────────────────────┐ │
│  │  hivemind-app     │   │  hivemind-postgres    │ │
│  │  Next.js :3000    │   │  PostgreSQL 16 :5433  │ │
│  └────────┬─────────┘   └──────────────────────┘ │
│           │  hivemind-network (internal)           │
└───────────┼──────────────────────────────────────┘
            │
            │  intelligence_network (shared)
            │
┌───────────┼──────────────────────────────────────┐
│  ┌────────┴─────────┐                             │
│  │  intelligence_api │  (separate docker-compose)  │
│  │  FastAPI :8001    │                             │
│  └──────────────────┘                             │
│          Docker Compose (Intelligence API)         │
└──────────────────────────────────────────────────┘

External services: Clerk (auth), Stripe (payments), Yahoo Finance (stock data)
```

The two stacks communicate over a shared Docker network called `intelligence_network`, which is **created and owned by the Intelligence API's docker-compose**. HiveMind joins it as an external network.

---

## Step 1: Start the Intelligence API first

The Intelligence API must start first because it creates the `intelligence_network` that HiveMind joins.

```bash
cd intelligence-api
docker compose up -d --build
```

Verify:
```bash
curl http://localhost:8001/api/health
# Should return {"data":{"status":"healthy","articles_count":2230,...}}
```

This creates the `intelligence_network` Docker network automatically. Confirm:
```bash
docker network ls | grep intelligence
# Should show: intelligence_network
```

---

## Step 2: Clone and install HiveMind

```bash
git clone <repo-url>
cd hivemind_app
npm install
```

`npm install` is only needed for local tooling (TypeScript, Drizzle CLI, tests). The app itself runs inside Docker.

---

## Step 3: Configure environment variables

You need **two** env files. Docker Compose reads `.env` for variable substitution. Next.js reads `.env.local` at runtime. Both must exist with the same keys.

### What to put in each file

**`.env`** -- used by Docker Compose to inject vars into the container:
```env
# Clerk (shared account -- get keys from project lead)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Stripe (log in on this machine, or get test keys from project lead)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...

# Intelligence API (these are static defaults, no change needed)
INTELLIGENCE_API_URL=http://intelligence_api:8001
INTELLIGENCE_API_KEY=hm-dev-key-change-in-prod
NEXT_PUBLIC_INTELLIGENCE_ENABLED=true
```

**`.env.local`** -- same keys as `.env`, plus these additions:
```env
# All the same Clerk + Stripe keys from .env (copy them here too)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...

# Intelligence API (same as .env)
INTELLIGENCE_API_URL=http://intelligence_api:8001
INTELLIGENCE_API_KEY=hm-dev-key-change-in-prod
NEXT_PUBLIC_INTELLIGENCE_ENABLED=true

# Database (host port -- only used by local Drizzle CLI, not by the Docker app)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/hivemind_dev

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk routing
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### Where each key comes from

| Variable | Who provides it | Notes |
|----------|----------------|-------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Project lead (shared Clerk account) | Same key for all devs |
| `CLERK_SECRET_KEY` | Project lead | Same key for all devs |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard > Webhooks | Each dev gets their own if using separate tunnels |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Project lead or own Stripe test account | |
| `STRIPE_SECRET_KEY` | Project lead or own Stripe test account | |
| `STRIPE_WEBHOOK_SECRET` | Output of `stripe listen` (Step 6) | Generated locally, different per machine |
| `STRIPE_PRICE_ID_PRO` | Stripe Dashboard > Products | Same across shared account |
| `INTELLIGENCE_API_URL` | Static: `http://intelligence_api:8001` | Container name on shared Docker network |
| `INTELLIGENCE_API_KEY` | Static: `hm-dev-key-change-in-prod` | Matches Intelligence API `.env` |
| `NEXT_PUBLIC_INTELLIGENCE_ENABLED` | Static: `true` | Set `false` to disable Intelligence features |

---

## Step 4: Start HiveMind

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts:
- **hivemind-app** on port 3000 (Next.js dev server with hot reload)
- **hivemind-postgres** on port 5433 (PostgreSQL 16)
- Joins the `intelligence_network` to reach the Intelligence API

> **Important:** The Intelligence API must be running first (Step 1), otherwise this will fail with `network intelligence_network not found`.

---

## Step 5: Initialize the database

Wait for postgres to be healthy (~5 seconds), then push the schema:

```bash
docker compose -f docker-compose.dev.yml exec app npm run db:push -- --force
```

This creates all 7 tables (users, subscriptions, portfolios, holdings, transactions, import_logs, stock_prices). No seed data needed -- users are created automatically via Clerk webhook on first sign-up.

**Verify everything is connected:**
```bash
# App is running
curl http://localhost:3000/api/health

# Intelligence API reachable from inside the app container
docker compose -f docker-compose.dev.yml exec app \
  node -e "const h=require('http');h.get('http://intelligence_api:8001/api/health',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>console.log(d))})"
```

---

## Step 6: Start Stripe webhook listener

Run this in a **separate terminal** every dev session:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

On first run, it prints a `whsec_...` signing secret. Copy it into `STRIPE_WEBHOOK_SECRET` in both `.env` and `.env.local`, then restart the app:

```bash
docker compose -f docker-compose.dev.yml restart app
```

This value is stable across sessions -- you only need to copy it once.

**Test card:** `4242 4242 4242 4242` (any future expiry, any CVC)

---

## Step 7: Sync your Clerk user to the local database

Clerk authentication (sign-in/sign-up UI) works with just the env vars -- no webhooks needed. But your local PostgreSQL `users` table starts empty, so you need to sync your user once.

### Option A: Dev sync endpoint (recommended for existing users)

This is the fastest approach. No ngrok, no webhook setup.

1. Open http://localhost:3000 and **sign in** with your Clerk account
2. Open the **browser dev console** (F12 → Console) and run:
   ```js
   fetch('/api/dev/sync-user', { method: 'POST' }).then(r => r.json()).then(console.log)
   ```
3. You should see `{ message: "User synced successfully", user: { ... } }`
4. Done -- dashboard and all protected routes now work

This only needs to be done **once per fresh database**. The user row persists in the `postgres_data` Docker volume.

### Option B: Clerk webhooks (only needed for auto-syncing new signups)

Only set this up if you need automatic user sync on new signups, profile updates, or deletions.

1. Expose localhost:3000 via ngrok or Cloudflare Tunnel:
   ```bash
   ngrok http 3000
   ```
2. In [Clerk Dashboard](https://dashboard.clerk.com) > Webhooks, create an endpoint:
   - **URL:** `https://your-tunnel-url.ngrok.io/api/webhooks/clerk`
   - **Events:** `user.created`, `user.updated`, `user.deleted`
3. Copy the signing secret to `CLERK_WEBHOOK_SECRET` in both `.env` and `.env.local`
4. Restart the app:
   ```bash
   docker compose -f docker-compose.dev.yml restart app
   ```

> **Shared account note:** If both devs have webhook endpoints configured, Clerk sends events to all of them. This is fine -- each dev's local DB gets the same user sync.

### When do you need what?

| Scenario | Needs webhook/ngrok? |
|----------|---------------------|
| Sign in with existing Clerk user | No -- just env vars |
| Get user into local DB (fresh machine) | No -- use `/api/dev/sync-user` |
| Auto-sync new user signups to DB | Yes |
| Auto-sync profile updates/deletions | Yes |

---

## Daily workflow

Each dev session:

```bash
# 1. Start Intelligence API (if not already running)
cd intelligence-api && docker compose up -d && cd ..

# 2. Start HiveMind
docker compose -f docker-compose.dev.yml up -d

# 3. Start Stripe listener (separate terminal)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 4. Open the app
open http://localhost:3000
```

---

## Running tests

```bash
# Unit & integration tests (Vitest)
npm test
npm run test:watch          # watch mode
npm run test:coverage       # with coverage report

# E2E tests (Playwright)
npx playwright install      # one-time: install browsers
npm run test:e2e            # headless
npm run test:e2e:headed     # with browser visible
```

---

## Common operations

```bash
# View app logs
docker compose -f docker-compose.dev.yml logs -f app

# Rebuild after package.json changes
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d --build

# Push schema changes after editing src/lib/db/schema.ts
docker compose -f docker-compose.dev.yml exec app npm run db:push -- --force

# Open Drizzle Studio (database GUI)
npm run db:studio

# Stop everything
docker compose -f docker-compose.dev.yml down

# Sync stock price data (fills stock_prices table from Yahoo Finance)
curl -X POST http://localhost:3000/api/stocks/sync
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `network intelligence_network not found` | Start the Intelligence API first -- it creates the network |
| Intelligence API ECONNREFUSED / ENOTFOUND | Verify Intelligence API is running: `docker ps \| grep intelligence` |
| Port 3000 already in use | `lsof -i :3000` then `kill <PID>` |
| Port 5433 already in use | `lsof -i :5433` then `kill <PID>` |
| White page / no styles on dashboard | Check you're on a protected route (`/dashboard`) and logged in via Clerk |
| `DATABASE_URL not set` | Ensure `.env.local` exists with the DATABASE_URL line |
| Docker build fails on npm ci | `npm install` locally to update lock file, then `docker compose build --no-cache` |
| Hot reload not working | Already configured via `WATCHPACK_POLLING=true`. Try restarting the container. |
| Clerk webhook not firing | Verify ngrok tunnel is running and webhook URL is correct in Clerk Dashboard |
| Stripe webhook errors | Ensure `stripe listen` is running and `STRIPE_WEBHOOK_SECRET` matches |
| Dates show wrong timezone | Expected -- Docker runs UTC. Date formatting is deferred to client-side. |

---

## Project structure

```
hivemind_app/
├── src/
│   ├── app/                    # Next.js App Router (pages + API routes)
│   │   ├── (auth)/             # Sign-in, sign-up pages
│   │   ├── (protected)/        # Dashboard, settings, pricing
│   │   └── api/                # REST API routes
│   │       ├── intelligence/   # BFF proxy to Intelligence API
│   │       ├── portfolios/     # Portfolio CRUD
│   │       ├── stocks/         # Stock data + Yahoo Finance sync
│   │       ├── stripe/         # Checkout + portal
│   │       └── webhooks/       # Clerk + Stripe webhooks
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── dashboard/          # Dashboard panels
│   │   └── landing-page.tsx    # Landing page
│   └── lib/
│       ├── db/                 # Drizzle ORM (schema, queries, connection)
│       ├── intelligence/       # Intelligence API client + types
│       └── stripe/             # Stripe utilities
├── e2e/                        # Playwright E2E tests
├── docker-compose.dev.yml      # Docker services
├── Dockerfile.dev              # App container
└── package.json
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL 16 + Drizzle ORM |
| Auth | Clerk |
| Payments | Stripe |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | lightweight-charts v5 (TradingView) |
| Testing | Vitest + Playwright |
| Runtime | Docker + Node 20 |
