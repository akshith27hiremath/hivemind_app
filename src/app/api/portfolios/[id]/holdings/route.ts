import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getUserByClerkId } from "@/lib/db/queries/users";
import {
  getPortfolioById,
  getHoldingsByPortfolioId,
  upsertHolding,
  isValidSymbol,
  getStockBySymbol,
  VALID_SYMBOLS,
} from "@/lib/db/queries/portfolios";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/portfolios/[id]/holdings
 * List all holdings in a portfolio
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByClerkId(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id: portfolioId } = await params;
    const portfolio = await getPortfolioById(portfolioId);

    // Return 404 for non-existent OR other user's portfolio
    if (!portfolio || portfolio.userId !== user.id) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      );
    }

    const holdings = await getHoldingsByPortfolioId(portfolioId);

    return NextResponse.json({ holdings });
  } catch (error) {
    console.error("List holdings error:", error);
    return NextResponse.json(
      { error: "Failed to list holdings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/portfolios/[id]/holdings
 * Add a holding to a portfolio (upsert behavior for same symbol+exchange)
 *
 * Body: {
 *   symbol: string,
 *   quantity: number,
 *   averagePrice: number,
 *   currentPrice?: number,
 *   instrumentType?: string,
 *   currency?: string
 * }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByClerkId(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id: portfolioId } = await params;
    const portfolio = await getPortfolioById(portfolioId);

    // Return 404 for non-existent OR other user's portfolio
    if (!portfolio || portfolio.userId !== user.id) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { symbol, quantity, averagePrice, currentPrice, instrumentType, currency } =
      body;

    // Validate required fields
    if (!symbol || typeof symbol !== "string" || symbol.trim().length === 0) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    const normalizedSymbol = symbol.trim().toUpperCase();

    if (normalizedSymbol.length > 50) {
      return NextResponse.json(
        { error: "Symbol must be 50 characters or less" },
        { status: 400 }
      );
    }

    // Validate symbol is in S&P 500 list
    if (!isValidSymbol(normalizedSymbol)) {
      return NextResponse.json(
        {
          error: `Invalid symbol. Only supported tickers are allowed. Valid symbols: ${VALID_SYMBOLS.join(", ")}`,
          code: "INVALID_SYMBOL",
        },
        { status: 400 }
      );
    }

    if (
      quantity === undefined ||
      typeof quantity !== "number" ||
      quantity <= 0
    ) {
      return NextResponse.json(
        { error: "Quantity must be a positive number" },
        { status: 400 }
      );
    }

    if (
      averagePrice === undefined ||
      typeof averagePrice !== "number" ||
      averagePrice < 0
    ) {
      return NextResponse.json(
        { error: "Average price must be a non-negative number" },
        { status: 400 }
      );
    }

    if (
      currentPrice !== undefined &&
      (typeof currentPrice !== "number" || currentPrice < 0)
    ) {
      return NextResponse.json(
        { error: "Current price must be a non-negative number" },
        { status: 400 }
      );
    }

    // Get stock info for exchange
    const stockInfo = getStockBySymbol(normalizedSymbol);
    const exchange = stockInfo?.exchange || null;

    // Upsert holding (update if same symbol+exchange exists, create otherwise)
    const holding = await upsertHolding(portfolioId, normalizedSymbol, exchange, {
      instrumentType: instrumentType?.trim() || "equity",
      quantity: quantity.toString(),
      averagePrice: averagePrice.toString(),
      currentPrice: currentPrice?.toString() || null,
      currency: currency?.trim() || "USD",
    });

    return NextResponse.json({ holding }, { status: 201 });
  } catch (error) {
    console.error("Add holding error:", error);
    return NextResponse.json(
      { error: "Failed to add holding" },
      { status: 500 }
    );
  }
}
