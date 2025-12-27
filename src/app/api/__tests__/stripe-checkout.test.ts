import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockUser, mockUserWithoutStripe } from "@/test/mocks/db";

// Mock auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock database queries
vi.mock("@/lib/db/queries/users", () => ({
  getUserByClerkId: vi.fn(),
  updateUserStripeCustomerId: vi.fn(),
}));

// Mock Stripe
vi.mock("@/lib/stripe", () => ({
  createCheckoutSession: vi.fn(),
  createStripeCustomer: vi.fn(),
  PLANS: {
    pro: {
      priceId: "price_test_123",
    },
  },
}));

import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId, updateUserStripeCustomerId } from "@/lib/db/queries/users";
import { createCheckoutSession, createStripeCustomer } from "@/lib/stripe";
import { POST } from "../stripe/checkout/route";

describe("Stripe Checkout API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 when user not found", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_test" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(undefined);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("should create new Stripe customer if none exists", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_test" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUserWithoutStripe);
    vi.mocked(createStripeCustomer).mockResolvedValue({ id: "cus_new_123" } as any);
    vi.mocked(createCheckoutSession).mockResolvedValue({
      url: "https://checkout.stripe.com/test",
    } as any);

    const response = await POST();
    const data = await response.json();

    expect(createStripeCustomer).toHaveBeenCalled();
    expect(updateUserStripeCustomerId).toHaveBeenCalledWith("user_test", "cus_new_123");
    expect(response.status).toBe(200);
    expect(data.url).toBe("https://checkout.stripe.com/test");
  });

  it("should use existing Stripe customer", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_test" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(createCheckoutSession).mockResolvedValue({
      url: "https://checkout.stripe.com/test",
    } as any);

    const response = await POST();

    expect(createStripeCustomer).not.toHaveBeenCalled();
    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cus_test_123",
      })
    );
  });

  it("should return checkout URL on success", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_test" } as any);
    vi.mocked(getUserByClerkId).mockResolvedValue(mockUser);
    vi.mocked(createCheckoutSession).mockResolvedValue({
      url: "https://checkout.stripe.com/test_session",
    } as any);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBe("https://checkout.stripe.com/test_session");
  });
});
