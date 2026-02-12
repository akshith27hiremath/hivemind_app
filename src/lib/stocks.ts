import YahooFinance from "yahoo-finance2";
import { db } from "./db";
import { stockPrices } from "./db/schema";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import { fetchArticles } from "./intelligence/client";
import { INTELLIGENCE_ENABLED } from "./intelligence/config";
import type { Article } from "./intelligence/types";

// Initialize Yahoo Finance client
const yahooFinance = new YahooFinance();

// ============================================
// Types
// ============================================

export interface PriceData {
  time: string; // "2024-12-27"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockQuote {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap?: number;
}

export interface NewsItem {
  title: string;
  source: string;
  date: string;
  url: string;
}

// ============================================
// Stock List (S&P 500 Sample)
// ============================================

export const STOCK_LIST = [
  // Portfolio Holdings (10)
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
  { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ" },
  { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ" },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ" },
  { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ" },
  { symbol: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ" },
  { symbol: "TSM", name: "Taiwan Semiconductor", exchange: "NYSE" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", exchange: "NYSE" },
  { symbol: "JNJ", name: "Johnson & Johnson", exchange: "NYSE" },
  { symbol: "XOM", name: "Exxon Mobil Corporation", exchange: "NYSE" },
  // Supply Chain Neighbors (10)
  { symbol: "ASML", name: "ASML Holding", exchange: "NASDAQ" },
  { symbol: "LRCX", name: "Lam Research", exchange: "NASDAQ" },
  { symbol: "AMAT", name: "Applied Materials", exchange: "NASDAQ" },
  { symbol: "MU", name: "Micron Technology", exchange: "NASDAQ" },
  { symbol: "QCOM", name: "Qualcomm Inc.", exchange: "NASDAQ" },
  { symbol: "AVGO", name: "Broadcom Inc.", exchange: "NASDAQ" },
  { symbol: "TXN", name: "Texas Instruments", exchange: "NASDAQ" },
  { symbol: "INTC", name: "Intel Corporation", exchange: "NASDAQ" },
  { symbol: "AMD", name: "Advanced Micro Devices", exchange: "NASDAQ" },
  { symbol: "CRM", name: "Salesforce Inc.", exchange: "NYSE" },
  // Competitors / 2nd-Hop (7)
  { symbol: "GS", name: "Goldman Sachs Group", exchange: "NYSE" },
  { symbol: "V", name: "Visa Inc.", exchange: "NYSE" },
  { symbol: "MA", name: "Mastercard Inc.", exchange: "NYSE" },
  { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ" },
  { symbol: "NFLX", name: "Netflix Inc.", exchange: "NASDAQ" },
  { symbol: "DIS", name: "Walt Disney Co.", exchange: "NYSE" },
  { symbol: "BA", name: "Boeing Co.", exchange: "NYSE" },
] as const;

export const VALID_SYMBOLS = STOCK_LIST.map((s) => s.symbol);

export function isValidSymbol(symbol: string): boolean {
  return VALID_SYMBOLS.includes(symbol.toUpperCase() as typeof VALID_SYMBOLS[number]);
}

export function getStockInfo(symbol: string) {
  return STOCK_LIST.find((s) => s.symbol === symbol.toUpperCase());
}

// ============================================
// Yahoo Finance Data Fetching
// ============================================

/**
 * Fallback: fetch OHLCV from Yahoo Finance v8 chart API (no crumb needed).
 * Used when the yahoo-finance2 library gets 429 rate-limited.
 */
async function fetchFromChartAPI(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ symbol: string; date: Date; open: string; high: string; low: string; close: string; volume: string }>> {
  const period1 = Math.floor(startDate.getTime() / 1000);
  const period2 = Math.floor(endDate.getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&events=history`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) {
    throw new Error(`Chart API returned ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return [];

  const timestamps: number[] = result.timestamp ?? [];
  const quotes = result.indicators?.quote?.[0];
  if (!quotes || timestamps.length === 0) return [];

  const opens: (number | null)[] = quotes.open ?? [];
  const highs: (number | null)[] = quotes.high ?? [];
  const lows: (number | null)[] = quotes.low ?? [];
  const closes: (number | null)[] = quotes.close ?? [];
  const volumes: (number | null)[] = quotes.volume ?? [];

  const data: Array<{ symbol: string; date: Date; open: string; high: string; low: string; close: string; volume: string }> = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close == null) continue; // skip days with no data
    data.push({
      symbol,
      date: new Date(timestamps[i]! * 1000),
      open: String((opens[i] ?? 0).toFixed(4)),
      high: String((highs[i] ?? 0).toFixed(4)),
      low: String((lows[i] ?? 0).toFixed(4)),
      close: String(close.toFixed(4)),
      volume: String(volumes[i] ?? 0),
    });
  }
  return data;
}

/**
 * Fetch historical price data from Yahoo Finance
 */
export async function getHistoricalData(
  symbol: string,
  days: number = 90
): Promise<PriceData[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const result = await yahooFinance.historical(symbol, {
      period1: startDate,
      period2: endDate,
      interval: "1d",
    });

    return result.map((item) => ({
      time: item.date.toISOString().split("T")[0] ?? "",
      open: Number(item.open?.toFixed(2) || 0),
      high: Number(item.high?.toFixed(2) || 0),
      low: Number(item.low?.toFixed(2) || 0),
      close: Number(item.close?.toFixed(2) || 0),
      volume: item.volume || 0,
    }));
  } catch (error) {
    console.error(`Failed to fetch historical data for ${symbol}:`, error);
    return [];
  }
}

/**
 * Fetch current quote from Yahoo Finance
 */
export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  const stockInfo = getStockInfo(symbol);
  if (!stockInfo) return null;

  try {
    const quote = await yahooFinance.quote(symbol);

    return {
      symbol: stockInfo.symbol,
      name: stockInfo.name,
      exchange: stockInfo.exchange,
      price: quote.regularMarketPrice || 0,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      previousClose: quote.regularMarketPreviousClose || 0,
      open: quote.regularMarketOpen || 0,
      dayHigh: quote.regularMarketDayHigh || 0,
      dayLow: quote.regularMarketDayLow || 0,
      volume: quote.regularMarketVolume || 0,
      marketCap: quote.marketCap,
    };
  } catch (error) {
    console.error(`Failed to fetch quote for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch quotes for all stocks in our list
 */
export async function getAllStockQuotes(): Promise<StockQuote[]> {
  const quotes: StockQuote[] = [];

  for (const stock of STOCK_LIST) {
    const quote = await getStockQuote(stock.symbol);
    if (quote) {
      quotes.push(quote);
    }
  }

  return quotes;
}

// ============================================
// News (from Intelligence API)
// ============================================

export async function getStockArticles(symbol: string): Promise<{ articles: Article[]; news: NewsItem[] }> {
  if (!INTELLIGENCE_ENABLED) {
    return { articles: [], news: [] };
  }

  try {
    const response = await fetchArticles({ ticker: symbol.toUpperCase(), limit: 6 });
    const articles = response.data ?? [];

    const today = new Date().toISOString().split("T")[0] ?? "";
    const news: NewsItem[] = articles.map((a) => ({
      title: a.title,
      source: a.source,
      date: (a.published_at ? a.published_at.split("T")[0] : today) ?? today,
      url: a.url || "#",
    }));

    return { articles, news };
  } catch (err) {
    console.error(`Failed to fetch articles for ${symbol}:`, err);
    return { articles: [], news: [] };
  }
}

// ============================================
// Database Operations for Stock Prices
// ============================================

/**
 * Get historical prices from database
 */
export async function getStoredPrices(
  symbol: string,
  startDate?: Date,
  endDate?: Date
): Promise<PriceData[]> {
  const conditions = [eq(stockPrices.symbol, symbol.toUpperCase())];

  if (startDate) {
    conditions.push(gte(stockPrices.date, startDate));
  }
  if (endDate) {
    conditions.push(lte(stockPrices.date, endDate));
  }

  const result = await db
    .select()
    .from(stockPrices)
    .where(and(...conditions))
    .orderBy(asc(stockPrices.date));

  return result.map((row) => ({
    time: row.date.toISOString().split("T")[0] ?? "",
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
    volume: Number(row.volume),
  }));
}

/**
 * Get the latest price date for a symbol
 */
export async function getLatestPriceDate(symbol: string): Promise<Date | null> {
  const result = await db
    .select({ date: stockPrices.date })
    .from(stockPrices)
    .where(eq(stockPrices.symbol, symbol.toUpperCase()))
    .orderBy(desc(stockPrices.date))
    .limit(1);

  return result[0]?.date || null;
}

/**
 * Sync historical data from Yahoo Finance to database
 * @param symbol Stock symbol
 * @param years Number of years to fetch (default 12)
 * @param forceRefresh If true, fetches all data regardless of existing data
 */
export async function syncStockPrices(
  symbol: string,
  years: number = 12,
  forceRefresh: boolean = false
): Promise<{ synced: number; symbol: string }> {
  const upperSymbol = symbol.toUpperCase();

  // Determine start date based on existing data
  let startDate: Date;
  const endDate = new Date();

  if (forceRefresh) {
    startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);
  } else {
    const latestDate = await getLatestPriceDate(upperSymbol);
    if (latestDate) {
      // Start from the day after the latest stored date
      startDate = new Date(latestDate);
      startDate.setDate(startDate.getDate() + 1);
    } else {
      // No existing data, fetch full history
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - years);
    }
  }

  // Skip if start date is today or in the future
  if (startDate >= endDate) {
    return { synced: 0, symbol: upperSymbol };
  }

  try {
    console.log(`Fetching ${upperSymbol} from ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`);

    let priceData: Array<{
      symbol: string;
      date: Date;
      open: string;
      high: string;
      low: string;
      close: string;
      volume: string;
    }> = [];

    try {
      // Primary: yahoo-finance2 library
      const result = await yahooFinance.historical(upperSymbol, {
        period1: startDate,
        period2: endDate,
        interval: "1d",
      });

      priceData = result.map((item) => ({
        symbol: upperSymbol,
        date: item.date,
        open: String(item.open?.toFixed(4) || "0"),
        high: String(item.high?.toFixed(4) || "0"),
        low: String(item.low?.toFixed(4) || "0"),
        close: String(item.close?.toFixed(4) || "0"),
        volume: String(item.volume || 0),
      }));
    } catch {
      // Fallback: Yahoo Finance v8 chart API (no crumb required)
      console.log(`yahoo-finance2 failed for ${upperSymbol}, trying chart API fallback`);
      priceData = await fetchFromChartAPI(upperSymbol, startDate, endDate);
    }

    if (priceData.length === 0) {
      return { synced: 0, symbol: upperSymbol };
    }

    // Insert with ON CONFLICT DO UPDATE
    for (const data of priceData) {
      await db
        .insert(stockPrices)
        .values(data)
        .onConflictDoUpdate({
          target: [stockPrices.symbol, stockPrices.date],
          set: {
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            volume: data.volume,
          },
        });
    }

    console.log(`Synced ${priceData.length} prices for ${upperSymbol}`);
    return { synced: priceData.length, symbol: upperSymbol };
  } catch (error) {
    console.error(`Failed to sync prices for ${upperSymbol}:`, error);
    throw error;
  }
}

/**
 * Sync all stocks in our list (with delay to avoid Yahoo Finance rate limits)
 */
export async function syncAllStockPrices(
  years: number = 12,
  forceRefresh: boolean = false
): Promise<{ results: Array<{ symbol: string; synced: number; error?: string }> }> {
  const results: Array<{ symbol: string; synced: number; error?: string }> = [];

  for (let i = 0; i < STOCK_LIST.length; i++) {
    const stock = STOCK_LIST[i]!;
    try {
      const result = await syncStockPrices(stock.symbol, years, forceRefresh);
      results.push(result);
    } catch (error) {
      results.push({
        symbol: stock.symbol,
        synced: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    // Delay between requests to avoid Yahoo Finance rate limits
    if (i < STOCK_LIST.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }

  return { results };
}

/**
 * Check if a stock's stored data is stale (latest date older than last trading day)
 */
export function isStockDataStale(latestDate: Date | null): boolean {
  if (!latestDate) return true;
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
  // Figure out the most recent expected trading day
  let expectedLatest = new Date(now);
  if (dayOfWeek === 0) expectedLatest.setDate(now.getDate() - 2); // Sun → Fri
  else if (dayOfWeek === 6) expectedLatest.setDate(now.getDate() - 1); // Sat → Fri
  // Otherwise today or yesterday is fine (market may not have closed yet today)
  expectedLatest.setHours(0, 0, 0, 0);
  // Allow 1 day of slack (market close timing, holidays)
  expectedLatest.setDate(expectedLatest.getDate() - 1);
  const latestNorm = new Date(latestDate);
  latestNorm.setHours(0, 0, 0, 0);
  return latestNorm < expectedLatest;
}

/**
 * Get price count for a symbol (useful for checking if data exists)
 */
export async function getStoredPriceCount(symbol: string): Promise<number> {
  const result = await db
    .select({ date: stockPrices.date })
    .from(stockPrices)
    .where(eq(stockPrices.symbol, symbol.toUpperCase()));

  return result.length;
}
