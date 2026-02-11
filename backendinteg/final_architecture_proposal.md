# Architecture Proposal — Intelligence API Integration

## 1. Recommended Architecture: Backend-for-Frontend (BFF) Proxy

### Decision

**All intelligence API requests MUST pass through Next.js API routes (BFF pattern).** No direct browser-to-intelligence-API communication.

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         Docker Compose                            │
│                                                                    │
│  ┌─────────────────────┐   ┌──────────────────────────────────┐  │
│  │  app (Next.js)       │   │  hivemind_mock (Intelligence)   │  │
│  │  Port 3000           │──▶│  Port 8001 (internal only)      │  │
│  │                      │   │  SQLite DB                       │  │
│  │  /api/intelligence/* │   │  Polls scraper every 5min       │  │
│  │  (proxy routes)      │   │                                  │  │
│  └──────────┬───────────┘   └──────────────────────────────────┘  │
│             │                                                      │
│  ┌──────────┴───────────┐                                         │
│  │  db (PostgreSQL 16)  │                                         │
│  │  Port 5432 (internal)│                                         │
│  └──────────────────────┘                                         │
└──────────────────────────────────────────────────────────────────┘
        │
        │ Port 3000 (exposed to host)
        ▼
┌────────────────────┐
│  Browser (Client)  │
│                    │
│  Calls:            │
│  /api/intelligence │  ← Proxied to hivemind_mock:8001
│  /api/portfolios   │  ← Direct to PostgreSQL (existing)
│  /api/stocks       │  ← Direct to Yahoo Finance (existing)
│  /api/stripe       │  ← Direct to Stripe (existing)
└────────────────────┘
```

### Justification

1. **Security**: The intelligence API has no authentication. Exposing port 8001 to browsers means anyone can access all data without logging in. The BFF proxy enforces Clerk auth on every request.

2. **CORS avoidance**: Browser requests to `localhost:8001` would require CORS configuration. Proxying through the same-origin Next.js server eliminates CORS entirely.

3. **Server-side caching**: The proxy layer can cache intelligence API responses, preventing redundant SQLite hits when multiple clients request the same data.

4. **Response shaping**: The proxy can strip internal fields (`user_id: "usr_demo"`, `portfolio_id: "pf_demo_growth"`), sanitize HTML, and normalize data before it reaches the client.

5. **Feature flagging**: The proxy can check `INTELLIGENCE_API_URL` and return 503 if the intelligence service is not configured, rather than having client-side code fail with opaque network errors.

6. **Docker networking**: Server-side routes use the container DNS name (`http://hivemind_mock:8001`), which is reliable and fast. Browser code cannot resolve Docker container names.

---

## 2. Direct Client → API: Rejected

**Why not**: No auth, CORS complexity, exposes internal container topology, no caching layer, HTML/XSS risk passes through unsanitized. Every reason to avoid this.

---

## 3. Batching

### Decision: Not Required

**Justification**: The intelligence API endpoints are already well-aggregated. `/api/digest/today` returns 6 sections in one call — this is effectively a batch endpoint. No need to add a custom batching layer.

**One exception**: Article detail pages that need 3 parallel requests (`/articles/{id}`, `/articles/{id}/relevance`, `/articles/{id}/summary`). These should be fetched in parallel from the client. A server-side batch route could combine them:

```typescript
// Optional optimization: single proxy route that fetches all 3
GET /api/intelligence/articles/{id}/full
  → parallel: [article, relevance, summary]
  → combined response
```

This reduces 3 round-trips to 1 from the browser. Worth building if article detail pages are frequently accessed.

---

## 4. Queueing

### Decision: Not Required

**Justification**: The intelligence API is read-only. There are no write operations to queue. All requests are synchronous GET requests with immediate responses. No long-running tasks, no webhooks, no callbacks.

If the intelligence API were to accept portfolio data in the future (POST endpoints), queueing the portfolio sync would be warranted. Not needed now.

---

## 5. Polling vs WebSockets

### Decision: Polling at 5-Minute Intervals

**Justification**:

1. The intelligence API has **no streaming or WebSocket support**. It's a request-response HTTP API.
2. The scraper polls every 5 minutes. New data arrives at 5-minute intervals regardless of how often we poll.
3. WebSocket would require a custom push layer between the intelligence API and our frontend — massive over-engineering for the current data freshness model.
4. 5-minute polling from the client (or server-side cache refresh) matches the data refresh rate exactly.

**Implementation**:

```typescript
// In DashboardDataProvider
useEffect(() => {
  fetchDashboardData();  // initial fetch

  const interval = setInterval(() => {
    fetchDashboardData();  // refresh every 5 min
  }, 5 * 60 * 1000);

  return () => clearInterval(interval);
}, []);
```

**Alternative considered**: `visibilitychange` event — only poll when tab is active. Saves resources when user navigates away.

```typescript
useEffect(() => {
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      fetchDashboardData();  // refetch when tab becomes active
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, []);
```

---

## 6. Caching Strategy

### 6.1 Three-Layer Cache

```
Layer 1: Client-side (React state in DashboardDataProvider)
  - TTL: Session-scoped, refreshed every 5 minutes
  - Scope: Per-user, per-tab
  - Purpose: Prevent re-fetching when switching panels

Layer 2: Server-side (Next.js API route, in-memory)
  - TTL: Varies per endpoint (30s to 30min, see integration map)
  - Scope: Shared across all users
  - Purpose: Absorb concurrent requests, reduce SQLite load

Layer 3: Intelligence API internal (SQLite)
  - TTL: Data is persistent, queries are live
  - Scope: Global
  - Purpose: Source of truth
```

### 6.2 Cache Implementation — Server-Side

Use a simple in-memory Map with TTL. The app container has sufficient memory for this.

```typescript
// src/lib/intelligence/cache.ts

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const existing = cache.get(key);
  if (existing && existing.expiresAt > Date.now()) {
    return existing.data as T;
  }

  const data = await fetcher();
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  return data;
}
```

### 6.3 Cache Keys

```
intelligence:health                          → 30s
intelligence:digest:today                    → 2min
intelligence:risk:alerts                     → 2min
intelligence:risk:alerts:critical            → 2min
intelligence:risk:exposure                   → 10min
intelligence:narratives                      → 2min
intelligence:discovery                       → 5min
intelligence:alerts:history:50               → 60s
intelligence:articles:20:0                   → 60s
intelligence:articles:AAPL:20:0              → 60s
intelligence:article:12345                   → 5min
intelligence:article:12345:relevance         → 5min
intelligence:article:12345:summary           → 5min
intelligence:entity:AAPL                     → 30min
intelligence:search:apple                    → 5min
```

### 6.4 Cache Invalidation

No explicit invalidation needed. TTL-based expiry is sufficient because:
- Intelligence API data changes at 5-minute intervals (scraper poll)
- No user writes to invalidate
- Stale data for 30-60 seconds is acceptable for a news dashboard

---

## 7. Docker Compose Integration

### 7.1 Recommended Approach

Add the intelligence API as a service in the existing `docker-compose.dev.yml`:

```yaml
services:
  app:
    # ... existing config ...
    environment:
      INTELLIGENCE_API_URL: http://hivemind_mock:8001
      NEXT_PUBLIC_INTELLIGENCE_ENABLED: "true"
    depends_on:
      db:
        condition: service_healthy
      hivemind_mock:
        condition: service_started
    networks:
      - hivemind_network

  db:
    # ... existing config ...
    networks:
      - hivemind_network

  hivemind_mock:
    image: hivemind-mock:latest          # or build from local path
    container_name: hivemind_mock
    ports:
      - "127.0.0.1:8001:8001"           # host-only, NOT 0.0.0.0
    volumes:
      - intelligence_data:/app/data
    environment:
      POLL_INTERVAL: 300
    networks:
      - hivemind_network

volumes:
  postgres_data:
  intelligence_data:    # SQLite persistence

networks:
  hivemind_network:
    driver: bridge
```

### 7.2 Key Configuration Choices

1. **Port binding**: `127.0.0.1:8001:8001` restricts to localhost only. The intelligence API has no auth — it must not be internet-accessible.

2. **depends_on**: The app waits for `hivemind_mock` to start before starting. However, `service_started` (not `service_healthy`) is used because the intelligence API has no Docker health check defined. The app's proxy routes should handle connection failures gracefully during the 2-5 minute backfill period.

3. **Volume**: `intelligence_data` persists the SQLite database across container restarts, preventing full re-backfill every time.

4. **Network**: All services share `hivemind_network`. Container DNS resolution allows `http://hivemind_mock:8001` from the app container.

---

## 8. Environment Configuration

### 8.1 New Environment Variables

| Variable | Server/Client | Value (Dev) | Value (Prod) | Required |
|----------|--------------|-------------|--------------|----------|
| `INTELLIGENCE_API_URL` | Server only | `http://hivemind_mock:8001` | TBD (production URL) | Yes (if feature enabled) |
| `NEXT_PUBLIC_INTELLIGENCE_ENABLED` | Client + Server | `true` | `true` / `false` | No (defaults to `false`) |

### 8.2 Feature Flag Behavior

```typescript
// src/lib/intelligence/config.ts
export const intelligenceConfig = {
  enabled: process.env.NEXT_PUBLIC_INTELLIGENCE_ENABLED === 'true',
  apiUrl: process.env.INTELLIGENCE_API_URL || '',
};
```

When disabled:
- Proxy routes return `503 Service Unavailable`
- `DashboardDataProvider` skips intelligence fetches
- Dashboard panels show "Intelligence features not configured" or fallback to static placeholder
- No mock data shown (we are removing mock data)

---

## 9. Request Flow — Detailed

### 9.1 Dashboard Page Load

```
Browser: GET /dashboard
  → Next.js SSR renders layout + sidebar + header + active panel skeleton
  → Client hydrates, DashboardDataProvider mounts

DashboardDataProvider:
  → Promise.all([
      fetch('/api/intelligence/digest'),       // Browser → Next.js :3000
      fetch('/api/intelligence/risk/exposure'),
      fetch('/api/intelligence/risk/alerts'),
    ])

Each proxy route (e.g., /api/intelligence/digest/route.ts):
  1. const { userId } = await auth();          // Clerk auth check
  2. if (!userId) return 401
  3. if (!intelligenceConfig.enabled) return 503
  4. const data = await cached('digest:today', 120_000, () =>
       fetch(`${INTELLIGENCE_API_URL}/api/digest/today`).then(r => r.json())
     )
  5. // Strip usr_demo, sanitize summaries
  6. return NextResponse.json(data)

Browser receives responses:
  → DashboardDataProvider updates state
  → Child components re-render with real data
  → Loading skeletons replaced with content
```

### 9.2 Article Detail (Click-Through)

```
User clicks article in CriticalNews panel
  → Navigate to /dashboard/articles/[id] (new route)

New page mounts:
  → Promise.all([
      fetch(`/api/intelligence/articles/${id}`),
      fetch(`/api/intelligence/articles/${id}/relevance`),
      fetch(`/api/intelligence/articles/${id}/summary`),
    ])

Renders:
  - Article headline + source + published_at
  - Summary (sanitized)
  - Enrichment: entities, signals, narrative
  - "Impact on your portfolio" cards (from relevance + summary)
  - Historical patterns (if any)
  - Contradiction indicator (if any)
  - Link to original article (external URL)
```

---

## 10. Retry Logic

### 10.1 Proxy Route Retry

```typescript
async function fetchWithRetry(url: string, maxRetries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) return response;
      if (response.status === 404) return response;  // Don't retry 404s
      // Retry on 500, 502, 503
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));  // backoff
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 10.2 Client-Side Retry

No automatic retry from the browser. If a request fails:
1. Show error state in the affected panel
2. Show "Retry" button
3. User clicks → refetch

Rationale: Automatic retries from the browser + server-side retries = 2×3 = 6 requests for a single user action. Too aggressive. Let the proxy handle retries. Client shows the result.

---

## 11. Implementation Phases

### Phase 1: Infrastructure (1 session)
1. Add `hivemind_mock` to `docker-compose.dev.yml`
2. Add environment variables to `.env.local`
3. Create `src/lib/intelligence/types.ts` (TypeScript interfaces)
4. Create `src/lib/intelligence/client.ts` (API client)
5. Create `src/lib/intelligence/cache.ts` (server-side cache)
6. Create `src/lib/intelligence/transforms.ts` (data shape transforms)
7. Create `src/lib/intelligence/config.ts` (feature flag)
8. Verify connectivity: health check from proxy

### Phase 2: Proxy Routes (1 session)
1. Create all 13 proxy routes under `src/app/api/intelligence/`
2. Each route: auth check → cache check → fetch → sanitize → respond
3. Test each proxy route manually via browser/curl

### Phase 3: Dashboard Integration (2-3 sessions)
1. Create `DashboardDataProvider` context
2. Wire CriticalNews to digest data
3. Wire TodaysSummary to digest data
4. Wire PortfolioImpactSummary to digest + exposure
5. Wire PortfolioOverview to narratives + developing stories
6. Wire SectorNewsPanel to articles endpoint
7. Wire StockNewsPanel to articles endpoint (ticker-filtered)
8. Wire notification bell to alerts/history
9. Redesign ImpactAnalysisPanel with risk alerts + exposure

### Phase 4: Stock Pages Integration (1 session)
1. Replace `getStockNews()` template data with real articles
2. Replace StockChart mock news markers with real article data
3. Update stock detail page news section

### Phase 5: New Features (2-3 sessions, optional)
1. Article detail page (new route)
2. Entity explorer page (new route)
3. Narratives tracking panel (new dashboard panel)
4. Discovery feed panel (new dashboard panel)

---

## 12. Decision Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Client ↔ API communication | BFF Proxy (Next.js API routes) | Security (no auth on API), CORS, caching |
| Caching | 3-layer (client state, server in-memory, SQLite) | Reduce SQLite load, fast panel switching |
| Real-time updates | 5-min polling from client | Matches scraper poll interval, no WebSocket support |
| Batching | Not needed (digest endpoint already aggregates) | API is well-designed for dashboard consumption |
| Queueing | Not needed | Read-only API, no writes to queue |
| Portfolio mismatch handling | Client-side filtering + relabeling (V1) | No API changes possible in V1 |
| HTML sanitization | Mandatory DOMPurify on all summaries | Documented XSS risk in API docs |
| Feature flag | Env var, compile-time | Simple, sufficient for single deployment |
| Docker integration | Add to existing docker-compose.dev.yml | Minimal friction, single `docker compose up` |
| Port exposure | 127.0.0.1 only for port 8001 | No auth on intelligence API |
| Error handling | Per-panel degradation, no mock fallback | Users should know when data is unavailable |
| Retry logic | Server-side only (max 2 retries, backoff) | Prevents retry amplification |

---

## 13. Open Questions for API Team

These questions should be resolved before production integration:

1. **Total count for pagination**: Does `meta.count` return items in response or total available? Critical for UX.
2. **Error codes**: What HTTP status codes are returned for invalid input (bad ticker, negative offset)?
3. **Rate limits**: Are there any? Should we implement client-side throttling?
4. **Portfolio customization**: Is there a roadmap for accepting user-specific portfolio data?
5. **Health check endpoint**: Can a Docker HEALTHCHECK be added to the container image?
6. **Timezone**: Are all timestamps UTC? Can we add timezone info to ISO strings?
7. **Enrichment nullability**: Which enrichment sub-fields can be null or empty?
8. **Backfill status**: Is there an endpoint to check backfill progress during cold start?
9. **Data retention**: How far back are articles retained? Is there a cleanup policy?
10. **Concurrent access**: Has the SQLite backend been tested under concurrent read load (10+ parallel queries)?
