import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock database queries
vi.mock("@/lib/db/queries/users", () => ({
  getUserByClerkId: vi.fn(),
}));

// Mock Stripe functions
vi.mock("@/lib/stripe", () => ({
  createCustomerPortalSession: vi.fn(),
}));

// Import after mocking
import { POST } from "../stripe/portal/route";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/db/queries/users";
import { createCustomerPortalSession } from "@/lib/stripe";

describe("POST /api/stripe/portal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if user not found", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(null);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("should return 400 if user has no stripeCustomerId", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue({
      id: "user_1",
      clerkId: "clerk_123",
      email: "test@example.com",
      stripeCustomerId: null,
    } as any);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No subscription found");
  });

  it("should create portal session and return URL", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue({
      id: "user_1",
      clerkId: "clerk_123",
      email: "test@example.com",
      stripeCustomerId: "cus_123",
    } as any);
    vi.mocked(createCustomerPortalSession).mockResolvedValue({
      url: "https://billing.stripe.com/portal_123",
    } as any);

    const response = await POST();
    const data = await response.json();

    expect(createCustomerPortalSession).toHaveBeenCalledWith({
      customerId: "cus_123",
      returnUrl: expect.stringContaining("/settings"),
    });
    expect(response.status).toBe(200);
    expect(data.url).toBe("https://billing.stripe.com/portal_123");
  });

  it("should return 500 if portal session creation fails", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue({
      id: "user_1",
      clerkId: "clerk_123",
      email: "test@example.com",
      stripeCustomerId: "cus_123",
    } as any);
    vi.mocked(createCustomerPortalSession).mockRejectedValue(new Error("Stripe error"));

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create portal session");
  });
});
