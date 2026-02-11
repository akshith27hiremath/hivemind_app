# Risk & Edge Case Analysis — Intelligence API Integration

## 1. Critical Risk: Portfolio Mismatch

**Severity: CRITICAL**
**Probability: CERTAIN**

### The Problem

The Intelligence API computes ALL personalized data (relevance, summaries, risk, exposure, discovery, digest) against a **hardcoded mock portfolio** with fixed holdings and weights:

```
AAPL 20%, MSFT 18%, NVDA 15%, GOOGL 12%, AMZN 10%, META 8%, TSM 7%, JPM 5%, JNJ 3%, XOM 2%
```

Our frontend allows users to create their own portfolios with any combination of 10 S&P 500 stocks (AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, JPM, V, JNJ) at arbitrary quantities and weights.

### Impact

| Scenario | Effect |
|----------|--------|
| User holds only AAPL and TSLA | API returns relevance for 10 stocks including 8 the user doesn't hold. Relevance for TSLA is computed as non-portfolio entity. |
| User holds no stocks | API still returns full portfolio-based analysis |
| User's weights differ from mock | Exposure percentages, severity calculations, and concentration risks are wrong |
| Discovery shows entities connected to TSM/XOM | User doesn't hold TSM or XOM, so discoveries are irrelevant |
| Risk alert says "36% portfolio exposure to Intel" | User's actual exposure may be 0% |

### Mitigation Options

**Option A: Accept the mismatch (Recommended for V1)**
- Treat intelligence data as "market intelligence" rather than "portfolio intelligence"
- Remove or de-emphasize portfolio-specific language (e.g., "your portfolio exposure is 36%")
- Label as "Market Intelligence" not "Portfolio Analysis"
- Still useful: articles, entities, narratives, graph data, sector news
- Pro: Zero API changes, fast integration
- Con: Core value proposition (personalized portfolio intelligence) is reduced

**Option B: Filter client-side**
- Fetch intelligence data, then filter to only show data relevant to user's actual holdings
- For relevance: only show `per_holding_relevance` entries matching user's tickers
- For exposure: ignore, compute our own from user's holdings
- For discovery: filter `connected_holdings` to user's actual holdings
- Pro: More accurate than showing everything
- Con: Still using mock portfolio weights for scoring. A "high relevance" score was computed with wrong weights.

**Option C: Request API enhancement (Future)**
- Ask API to accept portfolio holdings as a parameter (POST body or header)
- Recompute relevance, exposure, risk, discovery per-request with real data
- Pro: Accurate personalization
- Con: Requires API changes, out of scope for V1

**Recommendation**: Option B for V1. Use the intelligence API for article data, entity graph, and narratives (which are NOT portfolio-dependent). For portfolio-specific features (exposure, risk), clearly label as "based on market intelligence model" or compute our own simpler versions using the user's real holdings.

---

## 2. Network Failure Modes

### 2.1 Intelligence API Completely Down

**Probability**: Medium (Docker container crash, resource exhaustion, SQLite corruption)

**Symptoms**: Connection refused, timeout on all proxy routes.

**Impact**: All intelligence-powered dashboard panels fail to load.

**Mitigation**:
- Health check on app startup (call `GET /api/health` from proxy)
- Feature flag `NEXT_PUBLIC_INTELLIGENCE_ENABLED` to disable intelligence features entirely
- Each panel shows "Intelligence service unavailable" with retry button
- Core features (portfolio CRUD, stock prices, auth, billing) continue working
- Dashboard gracefully degrades: PortfolioManagerPanel still works, other panels show empty state

### 2.2 Intelligence API Slow/Degraded

**Probability**: Medium (SQLite under concurrent load, backfill in progress, scraper latency)

**Symptoms**: Responses take 5-30 seconds instead of <1 second.

**Impact**: Dashboard feels sluggish, user abandons page.

**Mitigation**:
- Abort controller with 10-second timeout on all proxy requests
- Show skeleton loaders immediately
- Stagger non-critical requests (fetch digest first, then exposure and alerts)
- Server-side caching in proxy routes prevents re-fetching within TTL window

### 2.3 Partial Intelligence API Failure

**Probability**: Medium (one endpoint fails, others work)

**Symptoms**: `/api/digest/today` returns 500 but `/api/articles` works.

**Impact**: Panels dependent on the failed endpoint show errors; others work.

**Mitigation**:
- Each proxy route handles errors independently
- `DashboardDataProvider` tracks per-resource loading/error states
- Never block the entire dashboard on a single failed fetch

### 2.4 Scraper External Dependency Down

**Probability**: Low-Medium (external scraper at `159.89.162.233:5000` goes down)

**Symptoms**: Intelligence API stays up but no new articles arrive. `last_poll` timestamp stales.

**Impact**: Data becomes stale. Articles from hours/days ago shown as "latest".

**Mitigation**:
- Monitor `GET /api/health` → `last_poll` timestamp
- If `last_poll` is >15 minutes old, show "Data may be delayed" warning
- Show `published_at` timestamps prominently so users can assess freshness

---

## 3. Data Integrity Risks

### 3.1 HTML/XSS in Article Summaries

**Severity: HIGH**

The API documentation explicitly states summaries "may contain HTML from source." Rendering unsanitized HTML is a direct XSS attack vector.

**Mitigation**: Mandatory. Use DOMPurify or similar sanitizer on ALL `summary` fields before rendering. Never use `dangerouslySetInnerHTML` without sanitization.

```typescript
import DOMPurify from 'dompurify';
const safeSummary = DOMPurify.sanitize(article.summary, { ALLOWED_TAGS: [] });
```

Strip ALL HTML tags. Article summaries should be plain text in our UI.

### 3.2 Nullable `published_at`

**Severity: Medium**

Some articles have `null` for `published_at`. This affects:
- Sorting by time (null sorts unpredictably)
- Relative time display ("? ago")
- Chart news markers (cannot place on timeline)

**Mitigation**: Fall back to `fetched_at` when `published_at` is null. Always prefer `published_at` but handle null gracefully.

### 3.3 Article ID Stability

**Severity: Low**

Article IDs come from an external scraper (`id: 12428112`). If the intelligence API's SQLite database is reset (delete volume, restart), all IDs change for the same articles.

**Impact**: Any bookmarked or cached article references become invalid.

**Mitigation**: Don't persist article IDs in our PostgreSQL database. Treat them as ephemeral session-level identifiers.

### 3.4 Enrichment Completeness

**Severity: Medium**

Not documented: Can `enrichment.entities` be empty? Can `enrichment.signals` be empty? Can `enrichment.narrative` be null?

**Assumption**: All enrichment sub-fields can be null or empty. Defensive coding required throughout.

```typescript
// Always check
const sentiment = article.enrichment?.entities?.[0]?.sentiment ?? "NEUTRAL";
const signal = article.enrichment?.signals?.[0] ?? null;
const narrative = article.enrichment?.narrative ?? null;
```

---

## 4. Race Conditions

### 4.1 Stale Digest After Article Ingestion

**Scenario**: User loads dashboard. Digest is cached (2-min TTL). New articles are ingested. User sees stale digest for up to 2 minutes.

**Impact**: Low. News is delayed by minutes, not critical for non-trading users.

**Mitigation**: Show `generated_at` timestamp on digest. Add manual refresh button.

### 4.2 Offset-Based Pagination Race

**Scenario**: User scrolls article feed. Between page 1 and page 2 fetches, new articles are ingested. Offset shifts — user may see duplicates or miss articles.

**Impact**: Medium. Duplicate articles in feed, or gaps.

**Mitigation**: Deduplicate client-side by article `id`. Accept potential gaps (not critical for a news feed).

### 4.3 Panel Switch During Fetch

**Scenario**: User clicks "Sector News" panel, fetch starts. User immediately clicks "Stock News" panel. First fetch completes and tries to update unmounted component.

**Impact**: Low (React handles this, but can cause warnings).

**Mitigation**: Use AbortController to cancel in-flight requests when panel changes. Standard React cleanup pattern in useEffect.

---

## 5. Security Concerns

### 5.1 Unauthenticated Intelligence API

**Severity: HIGH**

The Intelligence API has no authentication. If its port (8001) is exposed to the internet:
- Anyone can read all articles and portfolio data
- No rate limiting means potential abuse

**Mitigation**:
- **MUST** proxy through Next.js API routes with Clerk auth
- **MUST NOT** expose port 8001 to the internet
- In `docker-compose.dev.yml`, bind port 8001 to `127.0.0.1:8001` only (not `0.0.0.0:8001`)
- Client-side code calls `/api/intelligence/*`, never `localhost:8001`

### 5.2 SSRF via Article URLs

**Severity: Low**

Articles contain `url` fields pointing to external websites. If the frontend renders these as clickable links, users click through to external sites. This is expected behavior, not a vulnerability. But if any server-side code follows these URLs (e.g., fetching article content), it becomes an SSRF risk.

**Mitigation**: Never follow article URLs server-side. Only render as `<a href>` for user clicks. Use `target="_blank" rel="noopener noreferrer"`.

### 5.3 Information Leakage via Proxy

**Severity: Low**

The proxy routes forward responses from the intelligence API to authenticated users. Since the intelligence API returns the same data for all requests (no user scoping), there's no per-user data leakage. However, the mock portfolio data could confuse users into thinking it's their data.

**Mitigation**: Never display `user_id: "usr_demo"` or `portfolio_id: "pf_demo_growth"` to the user. Strip these fields in the proxy layer.

---

## 6. Scalability Bottlenecks

### 6.1 SQLite Single-Writer Lock

**Severity: Medium**

The Intelligence API uses SQLite, which supports one writer at a time. Under concurrent requests from multiple users, write operations (article ingestion) will block reads.

**Impact**: Increased latency during ingestion cycles (every 5 minutes).

**Mitigation**: Server-side caching in proxy routes absorbs most concurrent reads. Only one cache miss per TTL window actually hits the intelligence API.

### 6.2 No Horizontal Scaling

The Intelligence API is a single container with a single SQLite file. It cannot be scaled horizontally.

**Impact**: If the frontend has many concurrent users, the single intelligence container becomes a bottleneck.

**Mitigation**: Acceptable for current scale (single-user dev, small user base). For production, the intelligence API would need to be re-architected with PostgreSQL or a proper database.

### 6.3 Article Volume Growth

**Severity: Low-Medium**

~2-4 articles every 5 minutes = ~576-1152 articles/day. The SQLite database grows continuously.

**Impact**: Over weeks/months, queries slow down without indexing or cleanup.

**Mitigation**: Not our concern directly, but monitor `/api/health` → `articles_count`. If it exceeds 10K+, latency testing is warranted.

---

## 7. Concurrency Hazards

### 7.1 Parallel Proxy Requests to Same Endpoint

**Scenario**: 5 users load the dashboard simultaneously. 5 proxy requests hit `/api/digest/today` concurrently.

**Impact**: 5 concurrent SQLite reads. Acceptable for reads, but adds latency.

**Mitigation**: Server-side cache with coalescing. If a request for the same endpoint is already in-flight, wait for it and share the result (request deduplication).

### 7.2 Feature Flag Race

**Scenario**: Admin toggles `NEXT_PUBLIC_INTELLIGENCE_ENABLED` to false while users are on the dashboard.

**Impact**: Client-side flag is baked into the JavaScript bundle at build time. Runtime changes require a rebuild/redeploy.

**Mitigation**: For dynamic feature toggling, check an API endpoint rather than an env var. For now, accept that the flag requires a rebuild.

---

## 8. Secondary and Tertiary Effects

### 8.1 Increased Docker Resource Usage

Adding the intelligence API container increases:
- Memory: SQLite + Python service (~200-500MB)
- CPU: Periodic enrichment processing
- Disk: SQLite database growth
- Network: Scraper polling every 5 minutes

**Impact on existing services**: The PostgreSQL and Next.js containers may experience resource contention on machines with limited RAM.

### 8.2 Cold Start Delay

First startup backfills ~1500 articles over 2-5 minutes. During this time:
- Endpoints return partial/empty data
- Digest may be empty
- Risk alerts may be empty
- Discovery may be empty

**User experience**: If a user hits the dashboard during cold start, they see empty intelligence panels. The UX must handle this gracefully (loading state with "Initializing intelligence engine..." message).

### 8.3 Development Workflow Change

Developers must now start an additional Docker container. The dev startup checklist grows:
1. Start app + postgres (existing)
2. Start intelligence API (new)
3. Start Stripe CLI (existing)

**Mitigation**: Add intelligence API to `docker-compose.dev.yml` so it starts automatically with `docker compose up -d`.

### 8.4 Testing Complexity

The intelligence API is a live service with a live scraper. Tests cannot mock it easily because:
- No authentication = no way to inject test data
- No write endpoints = no way to set up test fixtures
- Data changes every 5 minutes

**Mitigation for unit tests**: Mock the proxy routes' fetch calls. The intelligence client module is the mock boundary.

**Mitigation for integration tests**: Use the real intelligence API in test environments. Accept non-deterministic article data. Test UI behavior (renders, error handling), not specific article content.

### 8.5 Debugging Difficulty

When a dashboard panel shows wrong data, the debugging path is:
1. Check browser DevTools → proxy route response
2. Check proxy route → intelligence API response
3. Check intelligence API → SQLite data
4. Check SQLite → scraper ingestion
5. Check scraper → external source

This is a 5-hop debug chain. Each hop can introduce issues.

**Mitigation**: Log request/response at the proxy layer. Include `X-Intelligence-Request-Id` header for correlation. Surface `last_poll` and `articles_count` in a developer tools panel.

---

## 9. Failure Mode Summary

| Failure | Probability | Impact | Degradation |
|---------|------------|--------|-------------|
| Intelligence API down | Medium | Dashboard panels empty | Core features work, intelligence panels show error state |
| Intelligence API slow (>5s) | Medium | Bad UX, loading states | Timeout + retry, cached data if available |
| Scraper down (no new articles) | Low-Medium | Stale data | Show last_poll warning, data still usable |
| SQLite corruption | Low | Intelligence API crashes | Container restart with fresh backfill |
| HTML XSS in summaries | High (if unsanitized) | Security vulnerability | DOMPurify mandatory |
| Portfolio mismatch | Certain | Wrong personalization | Client-side filtering, relabeling |
| Article ID instability | Low | Broken deep links | Don't persist IDs |
| Timezone inconsistency | Low | Wrong time display | Normalize all to UTC, display in local |
| Empty enrichment fields | Medium | Null pointer errors | Defensive optional chaining everywhere |
| Pagination duplicates | Medium | Repeated articles | Client-side dedup by ID |
