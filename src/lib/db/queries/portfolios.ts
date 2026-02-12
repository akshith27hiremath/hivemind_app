import { eq, and, isNull } from "drizzle-orm";
import { db } from "../index";
import {
  portfolios,
  holdings,
  type Portfolio,
  type NewPortfolio,
  type Holding,
  type NewHolding,
} from "../schema";

// ============================================
// S&P 500 Sample Stocks (for validation)
// ============================================

export const SP500_SAMPLE_STOCKS = [
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

export const VALID_SYMBOLS: string[] = SP500_SAMPLE_STOCKS.map((s) => s.symbol);

/**
 * Validate if a symbol is in our supported S&P 500 list
 */
export function isValidSymbol(symbol: string): boolean {
  return VALID_SYMBOLS.includes(symbol.toUpperCase());
}

/**
 * Get stock info by symbol
 */
export function getStockBySymbol(symbol: string) {
  return SP500_SAMPLE_STOCKS.find(
    (s) => s.symbol === symbol.toUpperCase()
  );
}

// ============================================
// Portfolio Queries
// ============================================

/**
 * Get all portfolios for a user by their internal user ID
 */
export async function getPortfoliosByUserId(
  userId: string
): Promise<Portfolio[]> {
  const result = await db.query.portfolios.findMany({
    where: eq(portfolios.userId, userId),
    orderBy: (portfolios, { desc }) => [desc(portfolios.createdAt)],
  });
  return result;
}

/**
 * Get a portfolio by ID
 */
export async function getPortfolioById(
  id: string
): Promise<Portfolio | undefined> {
  const result = await db.query.portfolios.findFirst({
    where: eq(portfolios.id, id),
  });
  return result;
}

/**
 * Get a portfolio by ID with all holdings
 */
export async function getPortfolioWithHoldings(
  id: string
): Promise<(Portfolio & { holdings: Holding[] }) | undefined> {
  const result = await db.query.portfolios.findFirst({
    where: eq(portfolios.id, id),
    with: {
      holdings: true,
    },
  });
  return result;
}

/**
 * Get portfolio count for a user (for subscription limit check)
 */
export async function getPortfolioCountByUserId(
  userId: string
): Promise<number> {
  const result = await db.query.portfolios.findMany({
    where: eq(portfolios.userId, userId),
    columns: { id: true },
  });
  return result.length;
}

/**
 * Create a new portfolio
 */
export async function createPortfolio(
  data: NewPortfolio
): Promise<Portfolio> {
  const [portfolio] = await db.insert(portfolios).values(data).returning();
  if (!portfolio) {
    throw new Error("Failed to create portfolio");
  }
  return portfolio;
}

/**
 * Update a portfolio by ID
 */
export async function updatePortfolio(
  id: string,
  data: Partial<Omit<NewPortfolio, "id" | "userId">>
): Promise<Portfolio | undefined> {
  const [portfolio] = await db
    .update(portfolios)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(portfolios.id, id))
    .returning();
  return portfolio;
}

/**
 * Delete a portfolio by ID
 * Note: Holdings cascade delete is handled by database FK constraint
 */
export async function deletePortfolio(id: string): Promise<boolean> {
  const result = await db
    .delete(portfolios)
    .where(eq(portfolios.id, id))
    .returning({ id: portfolios.id });
  return result.length > 0;
}

// ============================================
// Holding Queries
// ============================================

/**
 * Get all holdings for a portfolio
 */
export async function getHoldingsByPortfolioId(
  portfolioId: string
): Promise<Holding[]> {
  const result = await db.query.holdings.findMany({
    where: eq(holdings.portfolioId, portfolioId),
    orderBy: (holdings, { asc }) => [asc(holdings.symbol)],
  });
  return result;
}

/**
 * Get a holding by ID
 */
export async function getHoldingById(
  id: string
): Promise<Holding | undefined> {
  const result = await db.query.holdings.findFirst({
    where: eq(holdings.id, id),
  });
  return result;
}

/**
 * Get a holding by portfolio, symbol, and exchange (for upsert logic)
 */
export async function getHoldingBySymbol(
  portfolioId: string,
  symbol: string,
  exchange: string | null
): Promise<Holding | undefined> {
  const conditions = [
    eq(holdings.portfolioId, portfolioId),
    eq(holdings.symbol, symbol.toUpperCase()),
  ];

  if (exchange) {
    conditions.push(eq(holdings.exchange, exchange));
  } else {
    conditions.push(isNull(holdings.exchange));
  }

  const result = await db.query.holdings.findFirst({
    where: and(...conditions),
  });
  return result;
}

/**
 * Create a new holding
 */
export async function createHolding(data: NewHolding): Promise<Holding> {
  const [holding] = await db.insert(holdings).values(data).returning();
  if (!holding) {
    throw new Error("Failed to create holding");
  }
  return holding;
}

/**
 * Update a holding by ID
 */
export async function updateHolding(
  id: string,
  data: Partial<Omit<NewHolding, "id" | "portfolioId">>
): Promise<Holding | undefined> {
  const [holding] = await db
    .update(holdings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(holdings.id, id))
    .returning();
  return holding;
}

/**
 * Delete a holding by ID
 */
export async function deleteHolding(id: string): Promise<boolean> {
  const result = await db
    .delete(holdings)
    .where(eq(holdings.id, id))
    .returning({ id: holdings.id });
  return result.length > 0;
}

/**
 * Upsert a holding - update if exists, create if not
 * Used for CSV imports and duplicate prevention
 */
export async function upsertHolding(
  portfolioId: string,
  symbol: string,
  exchange: string | null,
  data: Omit<NewHolding, "portfolioId" | "symbol" | "exchange">
): Promise<Holding> {
  const normalizedSymbol = symbol.toUpperCase();
  const existing = await getHoldingBySymbol(portfolioId, normalizedSymbol, exchange);

  if (existing) {
    const updated = await updateHolding(existing.id, data);
    if (!updated) {
      throw new Error("Failed to update holding");
    }
    return updated;
  }

  return createHolding({
    portfolioId,
    symbol: normalizedSymbol,
    exchange,
    ...data,
  });
}
