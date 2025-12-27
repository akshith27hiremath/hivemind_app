import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { mockUser, mockPortfolio, mockHolding, mockHolding2 } from "@/test/mocks/db";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock database queries
vi.mock("@/lib/db/queries/users", () => ({
  getUserByClerkId: vi.fn(),
}));

vi.mock("@/lib/db/queries/portfolios", () => ({
  getPortfolioById: vi.fn(),
  getHoldingsByPortfolioId: vi.fn(),
  getHoldingById: vi.fn(),
  upsertHolding: vi.fn(),
  updateHolding: vi.fn(),
  deleteHolding: vi.fn(),
  isValidSymbol: vi.fn(),
  getStockBySymbol: vi.fn(),
  VALID_SYMBOLS: ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JPM", "V", "JNJ"],
}));

// Import after mocking
import { GET, POST } from "../[id]/holdings/route";
import { PATCH, DELETE } from "../[id]/holdings/[holdingId]/route";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/db/queries/users";
import {
  getPortfolioById,
  getHoldingsByPortfolioId,
  getHoldingById,
  upsertHolding,
  updateHolding,
  deleteHolding,
  isValidSymbol,
  getStockBySymbol,
} from "@/lib/db/queries/portfolios";

// Helper to create mock params for holdings list
function createHoldingsParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// Helper to create mock params for single holding
function createHoldingParams(id: string, holdingId: string) {
  return { params: Promise.resolve({ id, holdingId }) };
}

describe("GET /api/portfolios/[id]/holdings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const request = new NextRequest("http://localhost:3000/api/portfolios/123/holdings");
    const response = await GET(request, createHoldingsParams("123"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if portfolio not found", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost:3000/api/portfolios/123/holdings");
    const response = await GET(request, createHoldingsParams("123"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Portfolio not found");
  });

  it("should return 404 if portfolio belongs to another user", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue({
      ...mockPortfolio,
      userId: "different-user",
    });

    const request = new NextRequest("http://localhost:3000/api/portfolios/123/holdings");
    const response = await GET(request, createHoldingsParams("123"));
    const data = await response.json();

    expect(response.status).toBe(404);
  });

  it("should return list of holdings", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(mockPortfolio);
    vi.mocked(getHoldingsByPortfolioId).mockResolvedValue([mockHolding, mockHolding2]);

    const request = new NextRequest("http://localhost:3000/api/portfolios/portfolio-uuid-123/holdings");
    const response = await GET(request, createHoldingsParams("portfolio-uuid-123"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.holdings).toHaveLength(2);
    expect(data.holdings[0].symbol).toBe("AAPL");
  });

  it("should return empty array when portfolio has no holdings", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(mockPortfolio);
    vi.mocked(getHoldingsByPortfolioId).mockResolvedValue([]);

    const request = new NextRequest("http://localhost:3000/api/portfolios/portfolio-uuid-123/holdings");
    const response = await GET(request, createHoldingsParams("portfolio-uuid-123"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.holdings).toHaveLength(0);
  });
});

describe("POST /api/portfolios/[id]/holdings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isValidSymbol).mockImplementation((s) =>
      ["AAPL", "MSFT", "GOOGL"].includes(s.toUpperCase())
    );
    vi.mocked(getStockBySymbol).mockImplementation((s) => {
      const stocks: Record<string, { symbol: string; name: string; exchange: string }> = {
        AAPL: { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
        MSFT: { symbol: "MSFT", name: "Microsoft", exchange: "NASDAQ" },
      };
      return stocks[s.toUpperCase()];
    });
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const request = new NextRequest("http://localhost:3000/api/portfolios/123/holdings", {
      method: "POST",
      body: JSON.stringify({ symbol: "AAPL", quantity: 100, averagePrice: 150 }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request, createHoldingsParams("123"));
    const data = await response.json();

    expect(response.status).toBe(401);
  });

  it("should return 400 if symbol is missing", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(mockPortfolio);

    const request = new NextRequest("http://localhost:3000/api/portfolios/123/holdings", {
      method: "POST",
      body: JSON.stringify({ quantity: 100, averagePrice: 150 }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request, createHoldingsParams("portfolio-uuid-123"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Symbol is required");
  });

  it("should return 400 if symbol is not in S&P 500 list", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(mockPortfolio);
    vi.mocked(isValidSymbol).mockReturnValue(false);

    const request = new NextRequest("http://localhost:3000/api/portfolios/123/holdings", {
      method: "POST",
      body: JSON.stringify({ symbol: "INVALID", quantity: 100, averagePrice: 150 }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request, createHoldingsParams("portfolio-uuid-123"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_SYMBOL");
  });

  it("should return 400 if quantity is not positive", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(mockPortfolio);

    const request = new NextRequest("http://localhost:3000/api/portfolios/123/holdings", {
      method: "POST",
      body: JSON.stringify({ symbol: "AAPL", quantity: 0, averagePrice: 150 }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request, createHoldingsParams("portfolio-uuid-123"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Quantity must be a positive number");
  });

  it("should return 400 if averagePrice is negative", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(mockPortfolio);

    const request = new NextRequest("http://localhost:3000/api/portfolios/123/holdings", {
      method: "POST",
      body: JSON.stringify({ symbol: "AAPL", quantity: 100, averagePrice: -50 }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request, createHoldingsParams("portfolio-uuid-123"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Average price must be a non-negative number");
  });

  it("should create holding successfully", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(mockPortfolio);
    vi.mocked(upsertHolding).mockResolvedValue(mockHolding);

    const request = new NextRequest("http://localhost:3000/api/portfolios/portfolio-uuid-123/holdings", {
      method: "POST",
      body: JSON.stringify({ symbol: "AAPL", quantity: 100, averagePrice: 150 }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request, createHoldingsParams("portfolio-uuid-123"));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.holding.symbol).toBe("AAPL");
  });

  it("should uppercase the symbol", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(mockPortfolio);
    vi.mocked(upsertHolding).mockResolvedValue(mockHolding);

    const request = new NextRequest("http://localhost:3000/api/portfolios/portfolio-uuid-123/holdings", {
      method: "POST",
      body: JSON.stringify({ symbol: "aapl", quantity: 100, averagePrice: 150 }),
      headers: { "Content-Type": "application/json" },
    });
    await POST(request, createHoldingsParams("portfolio-uuid-123"));

    expect(upsertHolding).toHaveBeenCalledWith(
      "portfolio-uuid-123",
      "AAPL",
      expect.anything(),
      expect.anything()
    );
  });
});

describe("PATCH /api/portfolios/[id]/holdings/[holdingId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const request = new NextRequest("http://localhost:3000/api/portfolios/123/holdings/456", {
      method: "PATCH",
      body: JSON.stringify({ quantity: 200 }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, createHoldingParams("123", "456"));
    const data = await response.json();

    expect(response.status).toBe(401);
  });

  it("should return 404 if portfolio not found", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost:3000/api/portfolios/123/holdings/456", {
      method: "PATCH",
      body: JSON.stringify({ quantity: 200 }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, createHoldingParams("123", "456"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Portfolio not found");
  });

  it("should return 404 if holding not found", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(mockPortfolio);
    vi.mocked(getHoldingById).mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost:3000/api/portfolios/portfolio-uuid-123/holdings/456", {
      method: "PATCH",
      body: JSON.stringify({ quantity: 200 }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, createHoldingParams("portfolio-uuid-123", "456"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Holding not found");
  });

  it("should return 404 if holding belongs to different portfolio", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(mockPortfolio);
    vi.mocked(getHoldingById).mockResolvedValue({
      ...mockHolding,
      portfolioId: "different-portfolio",
    });

    const request = new NextRequest("http://localhost:3000/api/portfolios/portfolio-uuid-123/holdings/holding-uuid-123", {
      method: "PATCH",
      body: JSON.stringify({ quantity: 200 }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, createHoldingParams("portfolio-uuid-123", "holding-uuid-123"));
    const data = await response.json();

    expect(response.status).toBe(404);
  });

  it("should return 400 if no valid fields to update", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(mockPortfolio);
    vi.mocked(getHoldingById).mockResolvedValue(mockHolding);

    const request = new NextRequest("http://localhost:3000/api/portfolios/portfolio-uuid-123/holdings/holding-uuid-123", {
      method: "PATCH",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, createHoldingParams("portfolio-uuid-123", "holding-uuid-123"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No valid fields to update");
  });

  it("should update holding quantity", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(mockPortfolio);
    vi.mocked(getHoldingById).mockResolvedValue(mockHolding);
    vi.mocked(updateHolding).mockResolvedValue({ ...mockHolding, quantity: "200.000000" });

    const request = new NextRequest("http://localhost:3000/api/portfolios/portfolio-uuid-123/holdings/holding-uuid-123", {
      method: "PATCH",
      body: JSON.stringify({ quantity: 200 }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, createHoldingParams("portfolio-uuid-123", "holding-uuid-123"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.holding.quantity).toBe("200.000000");
  });

  it("should update holding averagePrice", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(mockPortfolio);
    vi.mocked(getHoldingById).mockResolvedValue(mockHolding);
    vi.mocked(updateHolding).mockResolvedValue({ ...mockHolding, averagePrice: "175.0000" });

    const request = new NextRequest("http://localhost:3000/api/portfolios/portfolio-uuid-123/holdings/holding-uuid-123", {
      method: "PATCH",
      body: JSON.stringify({ averagePrice: 175 }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, createHoldingParams("portfolio-uuid-123", "holding-uuid-123"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.holding.averagePrice).toBe("175.0000");
  });
});

describe("DELETE /api/portfolios/[id]/holdings/[holdingId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const request = new NextRequest("http://localhost:3000/api/portfolios/123/holdings/456", {
      method: "DELETE",
    });
    const response = await DELETE(request, createHoldingParams("123", "456"));
    const data = await response.json();

    expect(response.status).toBe(401);
  });

  it("should return 404 if portfolio not found", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost:3000/api/portfolios/123/holdings/456", {
      method: "DELETE",
    });
    const response = await DELETE(request, createHoldingParams("123", "456"));
    const data = await response.json();

    expect(response.status).toBe(404);
  });

  it("should return 404 if holding not found", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(mockPortfolio);
    vi.mocked(getHoldingById).mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost:3000/api/portfolios/portfolio-uuid-123/holdings/456", {
      method: "DELETE",
    });
    const response = await DELETE(request, createHoldingParams("portfolio-uuid-123", "456"));
    const data = await response.json();

    expect(response.status).toBe(404);
  });

  it("should delete holding successfully", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(mockPortfolio);
    vi.mocked(getHoldingById).mockResolvedValue(mockHolding);
    vi.mocked(deleteHolding).mockResolvedValue(true);

    const request = new NextRequest("http://localhost:3000/api/portfolios/portfolio-uuid-123/holdings/holding-uuid-123", {
      method: "DELETE",
    });
    const response = await DELETE(request, createHoldingParams("portfolio-uuid-123", "holding-uuid-123"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(deleteHolding).toHaveBeenCalledWith("holding-uuid-123");
  });
});
