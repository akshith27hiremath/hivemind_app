import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock database queries
vi.mock("@/lib/db/queries/users", () => ({
  getUserByClerkId: vi.fn(),
  updateUserStripeCustomerId: vi.fn(),
}));

// Mock Stripe functions
vi.mock("@/lib/stripe", () => ({
  createCheckoutSession: vi.fn(),
  createStripeCustomer: vi.fn(),
  PLANS: {
    free: {
      name: "Free",
      price: 0,
      priceId: null,
    },
    pro: {
      name: "Pro",
      price: 5,
      priceId: "price_test_pro",
    },
  },
}));

// Import after mocking
import { POST } from "../stripe/checkout/route";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId, updateUserStripeCustomerId } from "@/lib/db/queries/users";
import { createCheckoutSession, createStripeCustomer } from "@/lib/stripe";

describe("POST /api/stripe/checkout", () => {
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

  it("should return 404 if user not found in database", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(null);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("should create Stripe customer if user has no stripeCustomerId", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue({
      id: "user_1",
      clerkId: "clerk_123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      stripeCustomerId: null,
    } as any);
    vi.mocked(createStripeCustomer).mockResolvedValue({ id: "cus_new_123" } as any);
    vi.mocked(createCheckoutSession).mockResolvedValue({
      url: "https://checkout.stripe.com/session_123",
    } as any);

    const response = await POST();
    const data = await response.json();

    expect(createStripeCustomer).toHaveBeenCalledWith({
      email: "test@example.com",
      name: "Test User",
      metadata: {
        clerkId: "clerk_123",
        userId: "user_1",
      },
    });
    expect(updateUserStripeCustomerId).toHaveBeenCalledWith("clerk_123", "cus_new_123");
    expect(response.status).toBe(200);
    expect(data.url).toBe("https://checkout.stripe.com/session_123");
  });

  it("should use existing stripeCustomerId if available", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue({
      id: "user_1",
      clerkId: "clerk_123",
      email: "test@example.com",
      stripeCustomerId: "cus_existing_123",
    } as any);
    vi.mocked(createCheckoutSession).mockResolvedValue({
      url: "https://checkout.stripe.com/session_456",
    } as any);

    const response = await POST();
    const data = await response.json();

    expect(createStripeCustomer).not.toHaveBeenCalled();
    expect(createCheckoutSession).toHaveBeenCalledWith({
      customerId: "cus_existing_123",
      priceId: "price_test_pro",
      successUrl: expect.stringContaining("/settings?success=true"),
      cancelUrl: expect.stringContaining("/settings?canceled=true"),
    });
    expect(data.url).toBe("https://checkout.stripe.com/session_456");
  });

  it("should return 500 if checkout session creation fails", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue({
      id: "user_1",
      clerkId: "clerk_123",
      email: "test@example.com",
      stripeCustomerId: "cus_123",
    } as any);
    vi.mocked(createCheckoutSession).mockRejectedValue(new Error("Stripe error"));

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create checkout session");
  });

  describe("idempotency", () => {
    it("should reuse existing stripeCustomerId on multiple checkout attempts", async () => {
      // Simulates user clicking checkout button multiple times
      vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
      vi.mocked(getUserByClerkId).mockResolvedValue({
        id: "user_1",
        clerkId: "clerk_123",
        email: "test@example.com",
        stripeCustomerId: "cus_existing_123",
      } as any);
      vi.mocked(createCheckoutSession).mockResolvedValue({
        url: "https://checkout.stripe.com/session_789",
      } as any);

      // Simulate multiple rapid requests
      const [response1, response2, response3] = await Promise.all([
        POST(),
        POST(),
        POST(),
      ]);

      // All should succeed
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response3.status).toBe(200);

      // Should NOT create new customers - just reuse existing
      expect(createStripeCustomer).not.toHaveBeenCalled();

      // Checkout sessions are fine to create multiple times
      // (Stripe handles this - old sessions expire, only one can be completed)
      expect(createCheckoutSession).toHaveBeenCalledTimes(3);
    });

    it("should not create duplicate Stripe customers for same user", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);

      // First request - no stripeCustomerId
      vi.mocked(getUserByClerkId).mockResolvedValueOnce({
        id: "user_1",
        clerkId: "clerk_123",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        stripeCustomerId: null,
      } as any);
      vi.mocked(createStripeCustomer).mockResolvedValue({ id: "cus_new_123" } as any);
      vi.mocked(createCheckoutSession).mockResolvedValue({
        url: "https://checkout.stripe.com/session_1",
      } as any);

      await POST();

      // Verify customer was created and saved
      expect(createStripeCustomer).toHaveBeenCalledTimes(1);
      expect(updateUserStripeCustomerId).toHaveBeenCalledWith("clerk_123", "cus_new_123");

      // Clear mocks for second request
      vi.clearAllMocks();

      // Second request - now has stripeCustomerId (simulating DB was updated)
      vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as any);
      vi.mocked(getUserByClerkId).mockResolvedValue({
        id: "user_1",
        clerkId: "clerk_123",
        email: "test@example.com",
        stripeCustomerId: "cus_new_123", // Now has customer ID
      } as any);
      vi.mocked(createCheckoutSession).mockResolvedValue({
        url: "https://checkout.stripe.com/session_2",
      } as any);

      await POST();

      // Should NOT create another customer
      expect(createStripeCustomer).not.toHaveBeenCalled();
      expect(updateUserStripeCustomerId).not.toHaveBeenCalled();
    });
  });
});
