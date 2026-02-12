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
  CACHE_TTL_DASHBOARD,
} from "@/lib/intelligence";
import { getMockDashboard } from "@/lib/intelligence/mock-fallback";
import { fetchDashboard } from "@/lib/intelligence/client";
import type { DashboardResponse } from "@/lib/intelligence/types";

/**
 * GET /api/intelligence/dashboard
 * BFF proxy for Intelligence API batch dashboard endpoint.
 * Injects user's portfolio holdings from PostgreSQL.
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

    // Get user's portfolios
    const portfolios = await getPortfoliosByUserId(user.id);

    // Accept ?portfolioId=xxx to select specific portfolio
    const portfolioId = request.nextUrl.searchParams.get("portfolioId");
    const selectedPortfolio = portfolioId
      ? portfolios.find((p) => p.id === portfolioId)
      : portfolios.find((p) => p.isActive) ?? portfolios[0];

    if (!selectedPortfolio) {
      return NextResponse.json({
        data: null,
        meta: { no_portfolio: true },
      });
    }

    // Get holdings and compute weights
    const holdings = await getHoldingsByPortfolioId(selectedPortfolio.id);
    const weights = computePortfolioWeights(holdings);
    const portfolioHash = simpleHash(
      weights.map((w) => `${w.ticker}:${w.weight_pct}`).join(",")
    );

    // Check cache
    const cacheKey = `dashboard:${portfolioHash}`;
    const cached = getCache<DashboardResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // If intelligence API disabled, use mock fallback
    if (!INTELLIGENCE_ENABLED) {
      const mockData = getMockDashboard();
      setCache(cacheKey, mockData, CACHE_TTL_DASHBOARD);
      return NextResponse.json(mockData);
    }

    // Fetch from Intelligence API
    try {
      const data = await fetchDashboard(weights);
      setCache(cacheKey, data, CACHE_TTL_DASHBOARD);
      return NextResponse.json(data);
    } catch (apiError) {
      console.error("Intelligence API dashboard error:", apiError);

      // Stale data fallback
      const stale = getStaleCacheEntry<DashboardResponse>(cacheKey);
      if (stale) {
        return NextResponse.json(stale, {
          headers: { "X-Data-Stale": "true" },
        });
      }

      // No stale data — fall back to mock
      const mockData = getMockDashboard();
      return NextResponse.json(mockData, {
        headers: { "X-Data-Fallback": "mock" },
      });
    }
  } catch (error) {
    console.error("Intelligence dashboard route error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
