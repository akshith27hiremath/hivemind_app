import { NextRequest, NextResponse } from "next/server";
import { syncAllStockPrices, syncStockPrices, isValidSymbol } from "@/lib/stocks";

/**
 * POST /api/stocks/sync
 * Sync stock prices from Yahoo Finance to database
 *
 * Body options:
 * - symbol?: string - Sync specific symbol (if omitted, syncs all)
 * - years?: number - Number of years to fetch (default 12)
 * - forceRefresh?: boolean - Force refresh all data (default false)
 *
 * This endpoint should be called:
 * 1. Initially to seed the database with 12 years of history
 * 2. Daily via cron job to update with latest prices
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { symbol, years = 12, forceRefresh = false } = body;

    if (symbol) {
      // Sync specific symbol
      if (!isValidSymbol(symbol)) {
        return NextResponse.json(
          { error: "Invalid stock symbol" },
          { status: 400 }
        );
      }

      const result = await syncStockPrices(symbol, years, forceRefresh);
      return NextResponse.json({
        message: `Synced ${result.synced} prices for ${result.symbol}`,
        ...result,
      });
    }

    // Sync all stocks
    const { results } = await syncAllStockPrices(years, forceRefresh);

    const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);
    const errors = results.filter((r) => r.error);

    return NextResponse.json({
      message: `Synced ${totalSynced} prices across ${results.length} stocks`,
      totalSynced,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Stock sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync stock prices" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stocks/sync
 * Get sync status for all stocks
 */
export async function GET() {
  try {
    const { getStoredPriceCount, getLatestPriceDate, STOCK_LIST } = await import("@/lib/stocks");

    const status = await Promise.all(
      STOCK_LIST.map(async (stock) => {
        const count = await getStoredPriceCount(stock.symbol);
        const latestDate = await getLatestPriceDate(stock.symbol);

        return {
          symbol: stock.symbol,
          name: stock.name,
          priceCount: count,
          latestDate: latestDate?.toISOString().split("T")[0] || null,
          needsSync: !latestDate || isOlderThanYesterday(latestDate),
        };
      })
    );

    const totalPrices = status.reduce((sum, s) => sum + s.priceCount, 0);
    const needsSync = status.filter((s) => s.needsSync).length;

    return NextResponse.json({
      totalPrices,
      stocksNeedingSync: needsSync,
      stocks: status,
    });
  } catch (error) {
    console.error("Failed to get sync status:", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    );
  }
}

function isOlderThanYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return date < yesterday;
}
