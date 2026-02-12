import { NextRequest, NextResponse } from "next/server";
import {
  isValidSymbol,
  getStockQuote,
  getStoredPrices,
  getStockArticles,
  getStockInfo,
  getStoredPriceCount,
  getLatestPriceDate,
  isStockDataStale,
  syncStockPrices,
} from "@/lib/stocks";

// In-memory cooldown to avoid hammering Yahoo Finance during rate limits
const lastSyncAttempt = new Map<string, number>();
const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 min between retries per symbol

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  // Validate symbol
  if (!isValidSymbol(upperSymbol)) {
    return NextResponse.json(
      { error: "Invalid stock symbol" },
      { status: 404 }
    );
  }

  try {
    // Auto-sync if data is stale (keeps charts up to date)
    const latestDate = await getLatestPriceDate(upperSymbol);
    const lastAttempt = lastSyncAttempt.get(upperSymbol) ?? 0;
    const now = Date.now();
    if (isStockDataStale(latestDate) && now - lastAttempt > SYNC_COOLDOWN_MS) {
      lastSyncAttempt.set(upperSymbol, now);
      try {
        await syncStockPrices(upperSymbol, 1);
      } catch {
        // Non-critical — serve whatever we have
      }
    }

    // Check if we have stored prices
    const priceCount = await getStoredPriceCount(upperSymbol);

    // Fetch quote, stored prices, and articles in parallel
    const [quote, historicalData, { articles, news }] = await Promise.all([
      getStockQuote(upperSymbol),
      getStoredPrices(upperSymbol),
      getStockArticles(upperSymbol),
    ]);

    // Fallback if quote fails
    const stockInfo = getStockInfo(upperSymbol);
    const responseQuote = quote || {
      symbol: upperSymbol,
      name: stockInfo?.name || upperSymbol,
      exchange: stockInfo?.exchange || "UNKNOWN",
      price: historicalData[historicalData.length - 1]?.close || 0,
      change: 0,
      changePercent: 0,
      previousClose: 0,
      open: 0,
      dayHigh: 0,
      dayLow: 0,
      volume: 0,
    };

    return NextResponse.json({
      quote: responseQuote,
      historicalData,
      news,
      articles,
      dataInfo: {
        totalDataPoints: priceCount,
        hasStoredData: priceCount > 0,
        oldestDate: historicalData[0]?.time || null,
        newestDate: historicalData[historicalData.length - 1]?.time || null,
      },
    });
  } catch (error) {
    console.error(`Failed to fetch data for ${upperSymbol}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch stock data" },
      { status: 500 }
    );
  }
}
