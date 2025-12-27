import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Stripe with class implementation - define mocks inside factory
vi.mock("stripe", () => {
  const mocks = {
    checkoutSessionsCreate: vi.fn(),
    billingPortalSessionsCreate: vi.fn(),
    customersCreate: vi.fn(),
    subscriptionsRetrieve: vi.fn(),
    subscriptionsUpdate: vi.fn(),
  };

  // Expose mocks for test access
  (globalThis as any).__stripeMocks = mocks;

  return {
    default: class MockStripe {
      checkout = {
        sessions: {
          create: mocks.checkoutSessionsCreate,
        },
      };
      billingPortal = {
        sessions: {
          create: mocks.billingPortalSessionsCreate,
        },
      };
      customers = {
        create: mocks.customersCreate,
      };
      subscriptions = {
        retrieve: mocks.subscriptionsRetrieve,
        update: mocks.subscriptionsUpdate,
      };
    },
  };
});

// Import after mocking
import {
  PLANS,
  createCheckoutSession,
  createCustomerPortalSession,
  createStripeCustomer,
  getSubscription,
  cancelSubscription,
} from "../index";

// Get mocks from global
const getMocks = () => (globalThis as any).__stripeMocks as {
  checkoutSessionsCreate: ReturnType<typeof vi.fn>;
  billingPortalSessionsCreate: ReturnType<typeof vi.fn>;
  customersCreate: ReturnType<typeof vi.fn>;
  subscriptionsRetrieve: ReturnType<typeof vi.fn>;
  subscriptionsUpdate: ReturnType<typeof vi.fn>;
};

describe("Stripe Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PLANS", () => {
    it("should have free plan with correct properties", () => {
      expect(PLANS.free).toBeDefined();
      expect(PLANS.free.name).toBe("Free");
      expect(PLANS.free.price).toBe(0);
      expect(PLANS.free.priceId).toBeNull();
      expect(PLANS.free.features).toBeInstanceOf(Array);
      expect(PLANS.free.features.length).toBeGreaterThan(0);
    });

    it("should have pro plan with correct properties", () => {
      expect(PLANS.pro).toBeDefined();
      expect(PLANS.pro.name).toBe("Pro");
      expect(PLANS.pro.price).toBe(5);
      expect(PLANS.pro.features).toBeInstanceOf(Array);
      expect(PLANS.pro.features.length).toBeGreaterThan(0);
    });

    it("pro plan should have more features than free", () => {
      expect(PLANS.pro.features.length).toBeGreaterThan(PLANS.free.features.length);
    });
  });

  describe("createCheckoutSession", () => {
    it("should create checkout session with correct params", async () => {
      const mocks = getMocks();
      const mockSession = {
        id: "cs_test_123",
        url: "https://checkout.stripe.com/test",
      };
      mocks.checkoutSessionsCreate.mockResolvedValue(mockSession);

      const result = await createCheckoutSession({
        customerId: "cus_test_123",
        priceId: "price_test_123",
        successUrl: "http://localhost:3000/success",
        cancelUrl: "http://localhost:3000/cancel",
      });

      expect(result).toEqual(mockSession);
      expect(mocks.checkoutSessionsCreate).toHaveBeenCalledWith({
        customer: "cus_test_123",
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: "price_test_123",
            quantity: 1,
          },
        ],
        success_url: "http://localhost:3000/success",
        cancel_url: "http://localhost:3000/cancel",
      });
    });
  });

  describe("createCustomerPortalSession", () => {
    it("should create portal session with correct params", async () => {
      const mocks = getMocks();
      const mockSession = {
        id: "bps_test_123",
        url: "https://billing.stripe.com/test",
      };
      mocks.billingPortalSessionsCreate.mockResolvedValue(mockSession);

      const result = await createCustomerPortalSession({
        customerId: "cus_test_123",
        returnUrl: "http://localhost:3000/settings",
      });

      expect(result).toEqual(mockSession);
      expect(mocks.billingPortalSessionsCreate).toHaveBeenCalledWith({
        customer: "cus_test_123",
        return_url: "http://localhost:3000/settings",
      });
    });
  });

  describe("createStripeCustomer", () => {
    it("should create customer with email", async () => {
      const mocks = getMocks();
      const mockCustomer = {
        id: "cus_new_123",
        email: "test@example.com",
      };
      mocks.customersCreate.mockResolvedValue(mockCustomer);

      const result = await createStripeCustomer({
        email: "test@example.com",
      });

      expect(result).toEqual(mockCustomer);
      expect(mocks.customersCreate).toHaveBeenCalledWith({
        email: "test@example.com",
        name: undefined,
        metadata: undefined,
      });
    });

    it("should create customer with name and metadata", async () => {
      const mocks = getMocks();
      const mockCustomer = {
        id: "cus_new_123",
        email: "test@example.com",
        name: "Test User",
      };
      mocks.customersCreate.mockResolvedValue(mockCustomer);

      const result = await createStripeCustomer({
        email: "test@example.com",
        name: "Test User",
        metadata: { clerkId: "clerk_123" },
      });

      expect(result).toEqual(mockCustomer);
      expect(mocks.customersCreate).toHaveBeenCalledWith({
        email: "test@example.com",
        name: "Test User",
        metadata: { clerkId: "clerk_123" },
      });
    });
  });

  describe("getSubscription", () => {
    it("should retrieve subscription by id", async () => {
      const mocks = getMocks();
      const mockSub = {
        id: "sub_test_123",
        status: "active",
      };
      mocks.subscriptionsRetrieve.mockResolvedValue(mockSub);

      const result = await getSubscription("sub_test_123");

      expect(result).toEqual(mockSub);
      expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_test_123");
    });
  });

  describe("cancelSubscription", () => {
    it("should cancel subscription at period end", async () => {
      const mocks = getMocks();
      const mockSub = {
        id: "sub_test_123",
        cancel_at_period_end: true,
      };
      mocks.subscriptionsUpdate.mockResolvedValue(mockSub);

      const result = await cancelSubscription("sub_test_123");

      expect(result.cancel_at_period_end).toBe(true);
      expect(mocks.subscriptionsUpdate).toHaveBeenCalledWith("sub_test_123", {
        cancel_at_period_end: true,
      });
    });
  });
});
