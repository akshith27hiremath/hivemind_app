import { describe, it, expect, vi, beforeEach } from "vitest";

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

// Import after mocking
import { GET } from "../subscription/status/route";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/db/queries/users";
import { getActiveSubscriptionByUserId } from "@/lib/db/queries/subscriptions";

describe("GET /api/subscription/status", () => {
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

  it("should return free plan if user not found", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      hasSubscription: false,
      status: null,
      plan: "free",
    });
  });

  it("should return free plan if no active subscription", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue({
      id: "user_1",
      clerkId: "clerk_123",
      email: "test@example.com",
    } as any);
    vi.mocked(getActiveSubscriptionByUserId).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      hasSubscription: false,
      status: null,
      plan: "free",
    });
  });

  it("should return pro plan if user has active subscription", async () => {
    const mockSubscription = {
      id: "sub_1",
      userId: "user_1",
      status: "active",
      currentPeriodEnd: new Date("2024-12-31"),
      cancelAtPeriodEnd: false,
    };

    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue({
      id: "user_1",
      clerkId: "clerk_123",
      email: "test@example.com",
    } as any);
    vi.mocked(getActiveSubscriptionByUserId).mockResolvedValue(mockSubscription as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasSubscription).toBe(true);
    expect(data.status).toBe("active");
    expect(data.plan).toBe("pro");
    expect(data.cancelAtPeriodEnd).toBe(false);
  });

  it("should include cancelAtPeriodEnd when subscription is being canceled", async () => {
    const mockSubscription = {
      id: "sub_1",
      userId: "user_1",
      status: "active",
      currentPeriodEnd: new Date("2024-12-31"),
      cancelAtPeriodEnd: true,
    };

    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue({
      id: "user_1",
      clerkId: "clerk_123",
      email: "test@example.com",
    } as any);
    vi.mocked(getActiveSubscriptionByUserId).mockResolvedValue(mockSubscription as any);

    const response = await GET();
    const data = await response.json();

    expect(data.cancelAtPeriodEnd).toBe(true);
  });
});
