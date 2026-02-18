import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockPortfolio, mockPortfolio2, mockHolding, mockHolding2 } from "@/test/mocks/db";

// Mock the database module
vi.mock("@/lib/db", () => {
  const mockDb = {
    query: {
      portfolios: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      holdings: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  return { db: mockDb };
});

// Import after mocking
import { db } from "@/lib/db";
import {
  getPortfoliosByUserId,
  getPortfolioById,
  getPortfolioWithHoldings,
  getPortfolioCountByUserId,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  getHoldingsByPortfolioId,
  getHoldingById,
  createHolding,
  updateHolding,
  deleteHolding,
  isValidSymbol,
  getStockBySymbol,
  VALID_SYMBOLS,
} from "../portfolios";

// Type the mocked db
const mockDb = db as unknown as {
  query: {
    portfolios: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    holdings: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe("Portfolio Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("S&P 500 Stock Validation", () => {
    it("should have 27 valid symbols", () => {
      expect(VALID_SYMBOLS).toHaveLength(27);
    });

    it("should validate known S&P 500 symbols", () => {
      expect(isValidSymbol("AAPL")).toBe(true);
      expect(isValidSymbol("MSFT")).toBe(true);
      expect(isValidSymbol("GOOGL")).toBe(true);
      expect(isValidSymbol("aapl")).toBe(true); // case insensitive
    });

    it("should reject invalid symbols", () => {
      expect(isValidSymbol("INVALID")).toBe(false);
      expect(isValidSymbol("")).toBe(false);
      expect(isValidSymbol("XYZ")).toBe(false);
    });

    it("should return stock info by symbol", () => {
      const apple = getStockBySymbol("AAPL");
      expect(apple).toBeDefined();
      expect(apple?.name).toBe("Apple Inc.");
      expect(apple?.exchange).toBe("NASDAQ");
    });

    it("should return undefined for unknown symbol", () => {
      expect(getStockBySymbol("INVALID")).toBeUndefined();
    });
  });

  describe("getPortfoliosByUserId", () => {
    it("should return all portfolios for a user", async () => {
      mockDb.query.portfolios.findMany.mockResolvedValue([mockPortfolio, mockPortfolio2]);

      const result = await getPortfoliosByUserId("user-uuid-123");

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("My Portfolio");
      expect(mockDb.query.portfolios.findMany).toHaveBeenCalled();
    });

    it("should return empty array when user has no portfolios", async () => {
      mockDb.query.portfolios.findMany.mockResolvedValue([]);

      const result = await getPortfoliosByUserId("user-with-no-portfolios");

      expect(result).toHaveLength(0);
    });
  });

  describe("getPortfolioById", () => {
    it("should return portfolio when found", async () => {
      mockDb.query.portfolios.findFirst.mockResolvedValue(mockPortfolio);

      const result = await getPortfolioById("portfolio-uuid-123");

      expect(result).toEqual(mockPortfolio);
      expect(result?.name).toBe("My Portfolio");
    });

    it("should return undefined when portfolio not found", async () => {
      mockDb.query.portfolios.findFirst.mockResolvedValue(undefined);

      const result = await getPortfolioById("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("getPortfolioWithHoldings", () => {
    it("should return portfolio with holdings", async () => {
      const portfolioWithHoldings = {
        ...mockPortfolio,
        holdings: [mockHolding, mockHolding2],
      };
      mockDb.query.portfolios.findFirst.mockResolvedValue(portfolioWithHoldings);

      const result = await getPortfolioWithHoldings("portfolio-uuid-123");

      expect(result?.holdings).toHaveLength(2);
      expect(result?.holdings[0].symbol).toBe("AAPL");
    });
  });

  describe("getPortfolioCountByUserId", () => {
    it("should return count of user portfolios", async () => {
      mockDb.query.portfolios.findMany.mockResolvedValue([
        { id: "1" },
        { id: "2" },
        { id: "3" },
      ]);

      const result = await getPortfolioCountByUserId("user-uuid-123");

      expect(result).toBe(3);
    });

    it("should return 0 when user has no portfolios", async () => {
      mockDb.query.portfolios.findMany.mockResolvedValue([]);

      const result = await getPortfolioCountByUserId("user-uuid-123");

      expect(result).toBe(0);
    });
  });

  describe("createPortfolio", () => {
    it("should create and return new portfolio", async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockPortfolio]),
        }),
      });

      const result = await createPortfolio({
        userId: "user-uuid-123",
        name: "My Portfolio",
        source: "manual",
      });

      expect(result.name).toBe("My Portfolio");
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should throw error when creation fails", async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        createPortfolio({
          userId: "user-uuid-123",
          name: "Failed Portfolio",
          source: "manual",
        })
      ).rejects.toThrow("Failed to create portfolio");
    });
  });

  describe("updatePortfolio", () => {
    it("should update and return portfolio", async () => {
      const updatedPortfolio = { ...mockPortfolio, name: "Updated Name" };

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedPortfolio]),
          }),
        }),
      });

      const result = await updatePortfolio("portfolio-uuid-123", { name: "Updated Name" });

      expect(result?.name).toBe("Updated Name");
    });

    it("should return undefined when portfolio not found", async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await updatePortfolio("nonexistent", { name: "Test" });

      expect(result).toBeUndefined();
    });
  });

  describe("deletePortfolio", () => {
    it("should return true when portfolio deleted", async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "portfolio-uuid-123" }]),
        }),
      });

      const result = await deletePortfolio("portfolio-uuid-123");

      expect(result).toBe(true);
    });

    it("should return false when portfolio not found", async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await deletePortfolio("nonexistent");

      expect(result).toBe(false);
    });
  });
});

describe("Holding Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getHoldingsByPortfolioId", () => {
    it("should return all holdings for a portfolio", async () => {
      mockDb.query.holdings.findMany.mockResolvedValue([mockHolding, mockHolding2]);

      const result = await getHoldingsByPortfolioId("portfolio-uuid-123");

      expect(result).toHaveLength(2);
      expect(result[0].symbol).toBe("AAPL");
    });

    it("should return empty array when portfolio has no holdings", async () => {
      mockDb.query.holdings.findMany.mockResolvedValue([]);

      const result = await getHoldingsByPortfolioId("empty-portfolio");

      expect(result).toHaveLength(0);
    });
  });

  describe("getHoldingById", () => {
    it("should return holding when found", async () => {
      mockDb.query.holdings.findFirst.mockResolvedValue(mockHolding);

      const result = await getHoldingById("holding-uuid-123");

      expect(result?.symbol).toBe("AAPL");
      expect(result?.quantity).toBe("100.000000");
    });

    it("should return undefined when holding not found", async () => {
      mockDb.query.holdings.findFirst.mockResolvedValue(undefined);

      const result = await getHoldingById("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("createHolding", () => {
    it("should create and return new holding", async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockHolding]),
        }),
      });

      const result = await createHolding({
        portfolioId: "portfolio-uuid-123",
        symbol: "AAPL",
        quantity: "100",
        averagePrice: "150",
      });

      expect(result.symbol).toBe("AAPL");
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should throw error when creation fails", async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        createHolding({
          portfolioId: "portfolio-uuid-123",
          symbol: "AAPL",
          quantity: "100",
          averagePrice: "150",
        })
      ).rejects.toThrow("Failed to create holding");
    });
  });

  describe("updateHolding", () => {
    it("should update and return holding", async () => {
      const updatedHolding = { ...mockHolding, quantity: "200.000000" };

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedHolding]),
          }),
        }),
      });

      const result = await updateHolding("holding-uuid-123", { quantity: "200" });

      expect(result?.quantity).toBe("200.000000");
    });
  });

  describe("deleteHolding", () => {
    it("should return true when holding deleted", async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "holding-uuid-123" }]),
        }),
      });

      const result = await deleteHolding("holding-uuid-123");

      expect(result).toBe(true);
    });

    it("should return false when holding not found", async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await deleteHolding("nonexistent");

      expect(result).toBe(false);
    });
  });
});
