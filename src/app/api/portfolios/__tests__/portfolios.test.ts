import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { mockUser, mockPortfolio, mockPortfolio2, mockSubscription, mockHolding } from "@/test/mocks/db";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock database queries
vi.mock("@/lib/db/queries/users", () => ({
  getUserByClerkId: vi.fn(),
}));

vi.mock("@/lib/db/queries/subscriptions", () => ({
  getActiveSubscriptionByUserId: vi.fn(),
}));

vi.mock("@/lib/db/queries/portfolios", () => ({
  getPortfoliosByUserId: vi.fn(),
  getPortfolioById: vi.fn(),
  getPortfolioWithHoldings: vi.fn(),
  getPortfolioCountByUserId: vi.fn(),
  createPortfolio: vi.fn(),
  updatePortfolio: vi.fn(),
  deletePortfolio: vi.fn(),
}));

// Import after mocking
import { GET, POST } from "../route";
import { GET as GET_BY_ID, PATCH, DELETE } from "../[id]/route";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/db/queries/users";
import { getActiveSubscriptionByUserId } from "@/lib/db/queries/subscriptions";
import {
  getPortfoliosByUserId,
  getPortfolioById,
  getPortfolioWithHoldings,
  getPortfolioCountByUserId,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
} from "@/lib/db/queries/portfolios";

// Helper to create mock request
function createRequest(body?: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/portfolios", {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

// Helper to create mock params
function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/portfolios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if user not found in database", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(undefined);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("should return list of portfolios", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfoliosByUserId).mockResolvedValue([mockPortfolio, mockPortfolio2]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.portfolios).toHaveLength(2);
    expect(data.portfolios[0].name).toBe("My Portfolio");
  });

  it("should return empty array when user has no portfolios", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfoliosByUserId).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.portfolios).toHaveLength(0);
  });
});

describe("POST /api/portfolios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const request = createRequest({ name: "Test Portfolio" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 if name is missing", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);

    const request = createRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Portfolio name is required");
  });

  it("should return 400 if name is empty string", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);

    const request = createRequest({ name: "   " });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Portfolio name is required");
  });

  it("should return 400 if name exceeds 255 characters", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);

    const request = createRequest({ name: "a".repeat(256) });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Portfolio name must be 255 characters or less");
  });

  it("should return 403 if free plan limit exceeded", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getActiveSubscriptionByUserId).mockResolvedValue(undefined);
    vi.mocked(getPortfolioCountByUserId).mockResolvedValue(1);

    const request = createRequest({ name: "Second Portfolio" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.code).toBe("PORTFOLIO_LIMIT_EXCEEDED");
  });

  it("should allow free user to create first portfolio", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getActiveSubscriptionByUserId).mockResolvedValue(undefined);
    vi.mocked(getPortfolioCountByUserId).mockResolvedValue(0);
    vi.mocked(createPortfolio).mockResolvedValue(mockPortfolio);

    const request = createRequest({ name: "My Portfolio" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.portfolio.name).toBe("My Portfolio");
  });

  it("should allow Pro user to create unlimited portfolios", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getActiveSubscriptionByUserId).mockResolvedValue(mockSubscription);
    vi.mocked(getPortfolioCountByUserId).mockResolvedValue(10);
    vi.mocked(createPortfolio).mockResolvedValue(mockPortfolio2);

    const request = createRequest({ name: "Eleventh Portfolio" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.portfolio).toBeDefined();
  });

  it("should trim portfolio name", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getActiveSubscriptionByUserId).mockResolvedValue(undefined);
    vi.mocked(getPortfolioCountByUserId).mockResolvedValue(0);
    vi.mocked(createPortfolio).mockResolvedValue(mockPortfolio);

    const request = createRequest({ name: "  My Portfolio  " });
    await POST(request);

    expect(createPortfolio).toHaveBeenCalledWith(
      expect.objectContaining({ name: "My Portfolio" })
    );
  });
});

describe("GET /api/portfolios/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const request = new NextRequest("http://localhost:3000/api/portfolios/123");
    const response = await GET_BY_ID(request, createParams("123"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if portfolio not found", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioWithHoldings).mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost:3000/api/portfolios/nonexistent");
    const response = await GET_BY_ID(request, createParams("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Portfolio not found");
  });

  it("should return 404 if portfolio belongs to another user", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioWithHoldings).mockResolvedValue({
      ...mockPortfolio,
      userId: "different-user-id",
      holdings: [],
    });

    const request = new NextRequest("http://localhost:3000/api/portfolios/123");
    const response = await GET_BY_ID(request, createParams("123"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Portfolio not found");
  });

  it("should return portfolio with holdings", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioWithHoldings).mockResolvedValue({
      ...mockPortfolio,
      holdings: [mockHolding],
    });

    const request = new NextRequest("http://localhost:3000/api/portfolios/portfolio-uuid-123");
    const response = await GET_BY_ID(request, createParams("portfolio-uuid-123"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.portfolio.name).toBe("My Portfolio");
    expect(data.portfolio.holdings).toHaveLength(1);
  });
});

describe("PATCH /api/portfolios/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const request = new NextRequest("http://localhost:3000/api/portfolios/123", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, createParams("123"));
    const data = await response.json();

    expect(response.status).toBe(401);
  });

  it("should return 404 if portfolio not found", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost:3000/api/portfolios/123", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, createParams("123"));
    const data = await response.json();

    expect(response.status).toBe(404);
  });

  it("should return 400 if no valid fields provided", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(mockPortfolio);

    const request = new NextRequest("http://localhost:3000/api/portfolios/123", {
      method: "PATCH",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, createParams("portfolio-uuid-123"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No valid fields to update");
  });

  it("should update portfolio name", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(mockPortfolio);
    vi.mocked(updatePortfolio).mockResolvedValue({ ...mockPortfolio, name: "Updated Name" });

    const request = new NextRequest("http://localhost:3000/api/portfolios/123", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated Name" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, createParams("portfolio-uuid-123"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.portfolio.name).toBe("Updated Name");
  });

  it("should update isActive status", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(mockPortfolio);
    vi.mocked(updatePortfolio).mockResolvedValue({ ...mockPortfolio, isActive: false });

    const request = new NextRequest("http://localhost:3000/api/portfolios/123", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, createParams("portfolio-uuid-123"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.portfolio.isActive).toBe(false);
  });
});

describe("DELETE /api/portfolios/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const request = new NextRequest("http://localhost:3000/api/portfolios/123", {
      method: "DELETE",
    });
    const response = await DELETE(request, createParams("123"));
    const data = await response.json();

    expect(response.status).toBe(401);
  });

  it("should return 404 if portfolio not found", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost:3000/api/portfolios/123", {
      method: "DELETE",
    });
    const response = await DELETE(request, createParams("123"));
    const data = await response.json();

    expect(response.status).toBe(404);
  });

  it("should return 404 if portfolio belongs to another user", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue({
      ...mockPortfolio,
      userId: "different-user-id",
    });

    const request = new NextRequest("http://localhost:3000/api/portfolios/123", {
      method: "DELETE",
    });
    const response = await DELETE(request, createParams("123"));
    const data = await response.json();

    expect(response.status).toBe(404);
  });

  it("should delete portfolio and return success", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(getPortfolioById).mockResolvedValue(mockPortfolio);
    vi.mocked(deletePortfolio).mockResolvedValue(true);

    const request = new NextRequest("http://localhost:3000/api/portfolios/portfolio-uuid-123", {
      method: "DELETE",
    });
    const response = await DELETE(request, createParams("portfolio-uuid-123"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(deletePortfolio).toHaveBeenCalledWith("portfolio-uuid-123");
  });
});
