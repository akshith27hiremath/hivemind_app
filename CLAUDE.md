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
- **Testing**: Vitest + React Testing Library
- **Containerization**: Docker + Docker Compose

### Architecture
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group (sign-in, sign-up)
│   ├── (protected)/       # Protected routes (dashboard, settings, pricing)
│   ├── api/               # API routes
│   │   ├── health/        # Health check endpoint
│   │   ├── stripe/        # Stripe checkout & portal
│   │   └── webhooks/      # Clerk & Stripe webhooks
│   └── layout.tsx         # Root layout with ClerkProvider
├── components/ui/         # shadcn/ui components
├── lib/
│   ├── db/               # Database (Drizzle)
│   │   ├── index.ts      # DB connection
│   │   ├── schema.ts     # Table definitions
│   │   └── queries/      # Query functions
│   ├── stripe/           # Stripe utilities
│   └── utils.ts          # Utility functions (cn)
├── config/               # App configuration
├── env.ts               # Environment validation
└── middleware.ts        # Clerk auth middleware
```

## Development Setup

### Prerequisites
- Docker Desktop
- Node.js 20+
- Clerk account (auth)
- Stripe account (payments)

### Environment Variables
Required in `.env.local`:
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
```

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
npm test                    # Run all tests (81 tests)
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
- Dashboard: User welcome page
- Settings: Profile info + subscription management
- Pricing: Plan comparison + upgrade button

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/stripe/checkout` | POST | Create checkout session |
| `/api/stripe/portal` | POST | Create customer portal session |
| `/api/subscription/status` | GET | Get user subscription status |
| `/api/dev/sync-user` | POST | DEV ONLY: Sync Clerk user to DB |
| `/api/webhooks/clerk` | POST | Clerk user sync webhook |
| `/api/webhooks/stripe` | POST | Stripe subscription webhook |

## Implementation Progress

### Completed Phases
- [x] **Phase 1**: Project initialization (Next.js, TypeScript, Tailwind, shadcn/ui)
- [x] **Phase 2**: Database schema (Drizzle ORM, PostgreSQL, 6 tables)
- [x] **Phase 3**: Clerk authentication (middleware, webhooks, protected routes)
- [x] **Phase 4**: Stripe subscriptions (checkout, portal, webhooks, pricing page)
- [x] **Phase 5**: Testing infrastructure (Vitest 81 tests, Playwright E2E)
- [x] **Phase 6**: Landing page & marketing UI (hero, features, pricing, footer)

### Upcoming Phases
- [ ] **Phase 7**: Portfolio management (CRUD, holdings)
- [ ] **Phase 8**: CSV import (Zerodha format)
- [ ] **Phase 9**: Analytics dashboard

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
`feature/phase-2-database-schema` (includes phases 1-4)
