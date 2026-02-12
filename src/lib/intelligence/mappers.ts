import type { Sentiment, Impact, PortfolioHolding } from "./types";
import type { Holding } from "@/lib/db/schema";

// Sentiment: API returns UPPERCASE, frontend uses lowercase
export function mapSentiment(s: string): Sentiment {
  const lower = s.toLowerCase();
  if (lower === "positive" || lower === "negative" || lower === "neutral") {
    return lower;
  }
  return "neutral";
}

// Magnitude → Impact: API uses major/moderate/minor, frontend uses high/medium/low
const magnitudeMap: Record<string, Impact> = {
  major: "high",
  moderate: "medium",
  minor: "low",
};

export function mapMagnitude(m: string): Impact {
  return magnitudeMap[m.toLowerCase()] ?? "low";
}

// ISO timestamp → relative time string
export function toRelativeTime(iso: string | null): string {
  if (!iso) return "Unknown";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Signal type → human label
const signalLabels: Record<string, string> = {
  EARNINGS_REPORT: "Earnings",
  M_AND_A: "M&A",
  REGULATORY: "Regulatory",
  SUPPLY_DISRUPTION: "Supply Chain",
  LEADERSHIP_CHANGE: "Leadership",
  PRODUCT_LAUNCH: "Product Launch",
  PARTNERSHIP: "Partnership",
  AI_TECHNOLOGY: "AI/Technology",
  GEOPOLITICAL: "Geopolitical",
  MARKET_MOVEMENT: "Market",
  GENERAL_NEWS: "General",
};

export function mapSignalType(t: string): string {
  return signalLabels[t] ?? t;
}

// Defense-in-depth HTML sanitization (API should sanitize at source)
export function sanitizeText(raw: string): string {
  return raw.replace(/<[^>]*>/g, "").trim();
}

// Compute portfolio weights from DB holdings
export function computePortfolioWeights(
  holdings: Holding[]
): PortfolioHolding[] {
  if (holdings.length === 0) return [];

  const totalValue = holdings.reduce(
    (sum, h) => sum + Number(h.quantity) * Number(h.averagePrice),
    0
  );

  if (totalValue === 0) return [];

  return holdings.map((h) => ({
    ticker: h.symbol,
    weight_pct:
      Math.round(
        ((Number(h.quantity) * Number(h.averagePrice)) / totalValue) * 10000
      ) / 100,
  }));
}

// Build X-Portfolio header string from portfolio weights
export function buildPortfolioHeader(weights: PortfolioHolding[]): string {
  return weights.map((w) => `${w.ticker}:${w.weight_pct.toFixed(1)}`).join(",");
}

// Simple djb2 hash for cache keys
export function simpleHash(s: string): string {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 33) ^ s.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}
