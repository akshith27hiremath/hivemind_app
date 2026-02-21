# HiveMind Knowledge Core

> API version gotchas and patterns NOT covered in CLAUDE.md.
> Last updated: 2026-02-21

---

## API Version Gotchas

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
import { createSeriesMarkers, SeriesMarker, Time } from "lightweight-charts";
const markers: SeriesMarker<Time>[] = events.map((event) => ({
  time: event.date as Time,
  position: "aboveBar",
  color: "#22c55e",
  shape: "arrowUp",
  text: "Label text",
  size: 2,
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

---

## Intelligence API Shapes

**RiskAlert vs DigestItem** (common mistake — different field names):
```typescript
// digest.sections.risk_alerts → RiskAlert:
{ alert_id, trigger_article_id, trigger_headline, severity_tier, affected_holdings }

// digest.sections.direct_news → DigestItem:
{ article_id, headline, relevance_score, affected_holdings, summary }
```

---

## Database Patterns

### Drizzle Upsert
```typescript
await db.insert(table).values(data).onConflictDoUpdate({
  target: [table.col1, table.col2],
  set: { ...updateData },
});
```

### Stock Price Sync (Incremental)
- Check `getLatestPriceDate()` before fetching
- Only fetch from last date + 1 day to today

---

## UI Patterns

### Dark Glassmorphism Theme (Protected Pages)
- Cards: `bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl`
- Text: `text-white` / `text-gray-400` / `text-gray-500`
- Positive: `bg-emerald-500/20 text-emerald-400 border-emerald-500/30`
- Negative: `bg-red-500/20 text-red-400 border-red-500/30`

---

## Troubleshooting

### CRLF Entrypoint Crash (Windows)
- `docker-entrypoint.sh` gets Windows line endings from git checkout
- Dockerfile.dev strips them: `RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh`

### Hydration Mismatch on Dates
- Docker = UTC, browser = local timezone
- Defer date formatting to client: `useState("") + useEffect(() => setDate(...))`
