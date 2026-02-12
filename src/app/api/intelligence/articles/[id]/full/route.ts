import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getUserByClerkId } from "@/lib/db/queries/users";
import {
  getPortfoliosByUserId,
  getHoldingsByPortfolioId,
} from "@/lib/db/queries/portfolios";
import {
  computePortfolioWeights,
  buildPortfolioHeader,
  simpleHash,
  getCache,
  setCache,
  INTELLIGENCE_ENABLED,
  CACHE_TTL_ARTICLES,
} from "@/lib/intelligence";
import { fetchArticleFull } from "@/lib/intelligence/client";
import type { ArticleFullResponse } from "@/lib/intelligence/types";

/**
 * GET /api/intelligence/articles/[id]/full
 * BFF proxy for Intelligence API article full detail.
 * Injects portfolio context for relevance scoring.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const articleId = parseInt(id, 10);
    if (isNaN(articleId)) {
      return NextResponse.json(
        { error: "Invalid article ID" },
        { status: 400 }
      );
    }

    if (!INTELLIGENCE_ENABLED) {
      return NextResponse.json(
        { error: "Intelligence API not enabled" },
        { status: 503 }
      );
    }

    const user = await getUserByClerkId(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const portfolios = await getPortfoliosByUserId(user.id);
    const selectedPortfolio =
      portfolios.find((p) => p.isActive) ?? portfolios[0];

    let portfolioHeader = "";
    let portfolioHash = "no-portfolio";

    if (selectedPortfolio) {
      const holdings = await getHoldingsByPortfolioId(selectedPortfolio.id);
      const weights = computePortfolioWeights(holdings);
      portfolioHeader = buildPortfolioHeader(weights);
      portfolioHash = simpleHash(portfolioHeader);
    }

    const cacheKey = `article-full:${articleId}:${portfolioHash}`;
    const cached = getCache<ArticleFullResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    try {
      const data = await fetchArticleFull(articleId, portfolioHeader);
      setCache(cacheKey, data, CACHE_TTL_ARTICLES);
      return NextResponse.json(data);
    } catch (apiError) {
      console.error("Intelligence API article full error:", apiError);
      return NextResponse.json(
        { error: "Failed to fetch article details" },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Intelligence article full route error:", error);
    return NextResponse.json(
      { error: "Failed to fetch article details" },
      { status: 500 }
    );
  }
}
