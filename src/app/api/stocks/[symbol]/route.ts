import { NextRequest, NextResponse } from "next/server";
import {
  isValidSymbol,
  getStockQuote,
  getStoredPrices,
  getStockNews,
  getStockInfo,
  getStoredPriceCount,
} from "@/lib/stocks";

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
    // Check if we have stored prices
    const priceCount = await getStoredPriceCount(upperSymbol);

    // Fetch quote, stored prices, and news in parallel
    const [quote, historicalData, news] = await Promise.all([
      getStockQuote(upperSymbol),
      getStoredPrices(upperSymbol), // Gets all stored data from DB
      Promise.resolve(getStockNews(upperSymbol)),
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
