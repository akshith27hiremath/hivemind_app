// Intelligence API configuration
// Server-side env vars (no NEXT_PUBLIC_ prefix) are only available in API routes / server components.

// Server-side only
export const INTELLIGENCE_API_URL =
  process.env.INTELLIGENCE_API_URL ?? "http://intelligence-api:8001";

export const INTELLIGENCE_API_KEY =
  process.env.INTELLIGENCE_API_KEY ?? "";

// Client + server (available in browser via NEXT_PUBLIC_ prefix)
export const INTELLIGENCE_ENABLED =
  process.env.NEXT_PUBLIC_INTELLIGENCE_ENABLED === "true";

// Cache TTLs (milliseconds)
export const CACHE_TTL_DASHBOARD = 120_000; // 2 min
export const CACHE_TTL_ARTICLES = 60_000; // 1 min
export const CACHE_TTL_SIGNALS = 300_000; // 5 min

// Polling & stale thresholds (milliseconds)
export const POLLING_INTERVAL = 300_000; // 5 min
export const STALE_THRESHOLD = 600_000; // 10 min

// Request timeout (milliseconds)
export const REQUEST_TIMEOUT = 10_000; // 10s
