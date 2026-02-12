import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  getCache,
  setCache,
  INTELLIGENCE_ENABLED,
  CACHE_TTL_ARTICLES,
} from "@/lib/intelligence";
import { fetchArticles } from "@/lib/intelligence/client";
import type { ArticlesResponse } from "@/lib/intelligence/types";

/**
 * GET /api/intelligence/articles
 * BFF proxy for Intelligence API article list.
 * Universal — no portfolio injection needed.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ticker = request.nextUrl.searchParams.get("ticker") ?? undefined;
    const limit = request.nextUrl.searchParams.get("limit")
      ? parseInt(request.nextUrl.searchParams.get("limit")!, 10)
      : undefined;
    const offset = request.nextUrl.searchParams.get("offset")
      ? parseInt(request.nextUrl.searchParams.get("offset")!, 10)
      : undefined;

    const cacheKey = `articles:${ticker ?? "all"}:${limit ?? 20}:${offset ?? 0}`;
    const cached = getCache<ArticlesResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    if (!INTELLIGENCE_ENABLED) {
      // No mock article list — return empty
      const empty: ArticlesResponse = { data: [], meta: { count: 0, total: 0 } };
      return NextResponse.json(empty);
    }

    try {
      const data = await fetchArticles({ ticker, limit, offset });
      setCache(cacheKey, data, CACHE_TTL_ARTICLES);
      return NextResponse.json(data);
    } catch (apiError) {
      console.error("Intelligence API articles error:", apiError);
      return NextResponse.json(
        { data: [], meta: { count: 0, total: 0 } },
        { headers: { "X-Data-Fallback": "empty" } }
      );
    }
  } catch (error) {
    console.error("Intelligence articles route error:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}
