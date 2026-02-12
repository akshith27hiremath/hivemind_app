// Server-only fetch wrapper for Intelligence API calls.
// Only import this in API routes / server components — never in client components.

import {
  INTELLIGENCE_API_URL,
  INTELLIGENCE_API_KEY,
  REQUEST_TIMEOUT,
} from "./config";
import type {
  DashboardResponse,
  SignalAggregationResponse,
  ArticlesResponse,
  ArticleFullResponse,
  PortfolioHolding,
} from "./types";

class IntelligenceClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "IntelligenceClientError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${INTELLIGENCE_API_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(INTELLIGENCE_API_KEY
          ? { "X-API-Key": INTELLIGENCE_API_KEY }
          : {}),
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new IntelligenceClientError(
        body?.error?.message ?? `Intelligence API returned ${res.status}`,
        res.status,
        body?.error?.code
      );
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof IntelligenceClientError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new IntelligenceClientError(
        "Intelligence API request timed out",
        408
      );
    }
    throw new IntelligenceClientError(
      `Intelligence API unreachable: ${(err as Error).message}`,
      503
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchDashboard(
  holdings: PortfolioHolding[],
  include?: string[]
): Promise<DashboardResponse> {
  return request<DashboardResponse>("/api/dashboard", {
    method: "POST",
    body: JSON.stringify({
      holdings,
      include: include ?? [
        "digest",
        "exposure",
        "alerts",
        "narratives",
        "alert_history",
      ],
    }),
  });
}

export async function fetchSignalAggregation(
  holdings: PortfolioHolding[],
  days = 7
): Promise<SignalAggregationResponse> {
  return request<SignalAggregationResponse>("/api/signals/aggregate", {
    method: "POST",
    body: JSON.stringify({ holdings, days }),
  });
}

export async function fetchArticles(params: {
  ticker?: string;
  limit?: number;
  offset?: number;
}): Promise<ArticlesResponse> {
  const qs = new URLSearchParams();
  if (params.ticker) qs.set("ticker", params.ticker);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return request<ArticlesResponse>(`/api/articles${query ? `?${query}` : ""}`);
}

export async function fetchArticleFull(
  id: number,
  portfolioHeader: string
): Promise<ArticleFullResponse> {
  return request<ArticleFullResponse>(`/api/articles/${id}/full`, {
    headers: portfolioHeader ? { "X-Portfolio": portfolioHeader } : {},
  });
}

export async function checkHealth(): Promise<boolean> {
  try {
    await request<{ status: string }>("/api/health");
    return true;
  } catch {
    return false;
  }
}

export { IntelligenceClientError };
