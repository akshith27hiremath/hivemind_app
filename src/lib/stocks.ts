import YahooFinance from "yahoo-finance2";
import { db } from "./db";
import { stockPrices } from "./db/schema";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

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
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
  { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ" },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ" },
  { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ" },
  { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ" },
  { symbol: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ" },
  { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", exchange: "NYSE" },
  { symbol: "V", name: "Visa Inc.", exchange: "NYSE" },
  { symbol: "JNJ", name: "Johnson & Johnson", exchange: "NYSE" },
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
      time: item.date.toISOString().split("T")[0],
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
// News (Dummy Data for now)
// ============================================

const NEWS_TEMPLATES = [
  { title: "{company} Reports Strong Q4 Earnings, Beats Expectations", source: "Reuters" },
  { title: "{company} Announces Strategic Partnership with AI Startup", source: "Bloomberg" },
  { title: "Analysts Upgrade {symbol} Price Target Amid Growth Outlook", source: "CNBC" },
  { title: "{company} Expands Global Operations with New Facility", source: "WSJ" },
  { title: "{symbol} Stock Rallies on Positive Market Sentiment", source: "MarketWatch" },
  { title: "{company} CEO Discusses Future Innovation Plans", source: "Forbes" },
  { title: "Institutional Investors Increase {symbol} Holdings", source: "Barron's" },
  { title: "{company} Launches New Product Line, Shares Rise", source: "TechCrunch" },
];

export function getStockNews(symbol: string): NewsItem[] {
  const stockInfo = getStockInfo(symbol);
  if (!stockInfo) return [];

  const today = new Date();

  return NEWS_TEMPLATES.slice(0, 6).map((template, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - index);

    return {
      title: template.title
        .replace("{company}", stockInfo.name.split(" ")[0])
        .replace("{symbol}", stockInfo.symbol),
      source: template.source,
      date: date.toISOString().split("T")[0],
      url: "#",
    };
  });
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
    time: row.date.toISOString().split("T")[0],
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

    const result = await yahooFinance.historical(upperSymbol, {
      period1: startDate,
      period2: endDate,
      interval: "1d",
    });

    if (result.length === 0) {
      return { synced: 0, symbol: upperSymbol };
    }

    // Prepare data for upsert
    const priceData = result.map((item) => ({
      symbol: upperSymbol,
      date: item.date,
      open: String(item.open?.toFixed(4) || "0"),
      high: String(item.high?.toFixed(4) || "0"),
      low: String(item.low?.toFixed(4) || "0"),
      close: String(item.close?.toFixed(4) || "0"),
      volume: String(item.volume || 0),
    }));

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
 * Sync all stocks in our list
 */
export async function syncAllStockPrices(
  years: number = 12,
  forceRefresh: boolean = false
): Promise<{ results: Array<{ symbol: string; synced: number; error?: string }> }> {
  const results: Array<{ symbol: string; synced: number; error?: string }> = [];

  for (const stock of STOCK_LIST) {
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
  }

  return { results };
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
