I am designing a full stack SAAS web application. Please create a comprehensive phase-by-phase implementation plan. I will approve each phase before you implement it.

All development will be done through a docker container on my local system, and pushed to GitHub https://github.com/akshith27hiremath/hivemind_app with proper version control.

## Tech Stack (Non-negotiable):
- Next.js 14+ with App Router
- TypeScript (strict mode)
- Drizzle ORM with PostgreSQL
- Clerk for authentication
- Stripe for payments
- Tailwind CSS + shadcn/ui -> use claude frontend design skills
- Docker (docker desktop is installed and running locally)

## Core Features Needed:
1. Landing page (hero, features, pricing)
2. User authentication (Clerk handles this)
3. Protected dashboard
4. User settings page
5. Stripe subscription checkout
6. Stripe webhooks for subscription events
7. Portfolio import from trading apps (starting with Zerodha or CSV upload)
8. Store portfolio data (holdings, transactions) in user profile

## Design Notes:
- I have Figma designs I'll integrate later
- Use shadcn/ui for now with modular component structure
- Make design tokens (colors, spacing) easy to change

## What I Need From You:

**Phase 0: Planning**
Create a detailed implementation plan broken into phases:
- Phase 1: Project initialization and basic setup
- Phase 2: Database schema and Drizzle setup
- Phase 3: Authentication with Clerk
- Phase 4: Basic UI (landing page)
- Phase 5: Dashboard and protected routes
- Phase 6: Stripe integration
- Phase 7: Portfolio data model
- Phase 8: Portfolio import (CSV first, then API)
- Phase 9: Docker setup
- Phase 10: Documentation and deployment prep

For EACH phase, specify:
1. Exact files to create/modify
2. Dependencies to install (with versions)
3. Environment variables needed
4. Testing steps to verify the phase works
5. Git workflow (branch naming, commit messages)
6. Potential issues and how to handle them

**IMPORTANT:**
- Do NOT implement multiple phases at once
- Do NOT make assumptions about API integrations without asking
- Do NOT skip error handling
- Do NOT move forward if something doesn't work
- Ask me before making architectural decisions
- Show me the plan for each phase BEFORE implementing
- Wait for my approval after each phase

## Security Requirements:
- Never commit .env files
- Validate all environment variables
- Encrypt sensitive data (portfolio API keys if needed)
- Verify Stripe webhooks properly
- Rate limit API routes

## Deliverables (at the end of all phases):
- Working app locally (`npm run dev`)
- Working Docker setup (`docker-compose up`)
- Clear README with setup instructions
- .env.example with all variables documented
- Database migrations
- Basic tests for critical flows

## First Step:
Create a detailed Phase 0 plan showing:
1. Complete file/folder structure for the entire project
2. All npm packages needed (grouped by phase)
3. Database schema (all tables with columns and relationships)
4. Git branching strategy
5. Environment variables needed (grouped by phase)
6. Order of implementation with dependencies between phases

Show me this plan and STOP. Wait for my approval before starting Phase 1.

Start in PLAN MODE.