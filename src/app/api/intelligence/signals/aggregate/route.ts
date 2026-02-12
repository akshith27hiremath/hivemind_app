import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getUserByClerkId } from "@/lib/db/queries/users";
import {
  getPortfoliosByUserId,
  getHoldingsByPortfolioId,
} from "@/lib/db/queries/portfolios";
import {
  computePortfolioWeights,
  simpleHash,
  getCache,
  setCache,
  getStaleCacheEntry,
  INTELLIGENCE_ENABLED,
  CACHE_TTL_SIGNALS,
} from "@/lib/intelligence";
import { getMockSignals } from "@/lib/intelligence/mock-fallback";
import { fetchSignalAggregation } from "@/lib/intelligence/client";
import type { SignalAggregationResponse } from "@/lib/intelligence/types";

/**
 * GET /api/intelligence/signals/aggregate
 * BFF proxy for Intelligence API signal aggregation endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByClerkId(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const portfolios = await getPortfoliosByUserId(user.id);
    const portfolioId = request.nextUrl.searchParams.get("portfolioId");
    const days = parseInt(request.nextUrl.searchParams.get("days") ?? "7", 10);

    const selectedPortfolio = portfolioId
      ? portfolios.find((p) => p.id === portfolioId)
      : portfolios.find((p) => p.isActive) ?? portfolios[0];

    if (!selectedPortfolio) {
      return NextResponse.json({
        data: null,
        meta: { no_portfolio: true },
      });
    }

    const holdings = await getHoldingsByPortfolioId(selectedPortfolio.id);
    const weights = computePortfolioWeights(holdings);
    const portfolioHash = simpleHash(
      weights.map((w) => `${w.ticker}:${w.weight_pct}`).join(",")
    );

    const cacheKey = `signals:${portfolioHash}:${days}`;
    const cached = getCache<SignalAggregationResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    if (!INTELLIGENCE_ENABLED) {
      const mockData = getMockSignals();
      setCache(cacheKey, mockData, CACHE_TTL_SIGNALS);
      return NextResponse.json(mockData);
    }

    try {
      const data = await fetchSignalAggregation(weights, days);
      setCache(cacheKey, data, CACHE_TTL_SIGNALS);
      return NextResponse.json(data);
    } catch (apiError) {
      console.error("Intelligence API signals error:", apiError);

      const stale = getStaleCacheEntry<SignalAggregationResponse>(cacheKey);
      if (stale) {
        return NextResponse.json(stale, {
          headers: { "X-Data-Stale": "true" },
        });
      }

      const mockData = getMockSignals();
      return NextResponse.json(mockData, {
        headers: { "X-Data-Fallback": "mock" },
      });
    }
  } catch (error) {
    console.error("Intelligence signals route error:", error);
    return NextResponse.json(
      { error: "Failed to fetch signal data" },
      { status: 500 }
    );
  }
}
