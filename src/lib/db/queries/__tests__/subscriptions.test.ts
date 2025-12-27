import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSubscription, mockUser } from "@/test/mocks/db";

// Mock the database module with factory function
vi.mock("@/lib/db", () => {
  const mockDb = {
    query: {
      subscriptions: {
        findFirst: vi.fn(),
      },
      users: {
        findFirst: vi.fn(),
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
  getSubscriptionByStripeId,
  getActiveSubscriptionByUserId,
  getUserByStripeCustomerId,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  hasActiveSubscription,
} from "../subscriptions";

// Type the mocked db
const mockDb = db as unknown as {
  query: {
    subscriptions: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    users: {
      findFirst: ReturnType<typeof vi.fn>;
    };
  };
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe("Subscription Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSubscriptionByStripeId", () => {
    it("should return subscription when found", async () => {
      mockDb.query.subscriptions.findFirst.mockResolvedValue(mockSubscription);

      const result = await getSubscriptionByStripeId("sub_test_123");

      expect(result).toEqual(mockSubscription);
      expect(mockDb.query.subscriptions.findFirst).toHaveBeenCalled();
    });

    it("should return undefined when not found", async () => {
      mockDb.query.subscriptions.findFirst.mockResolvedValue(undefined);

      const result = await getSubscriptionByStripeId("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("getActiveSubscriptionByUserId", () => {
    it("should return active subscription for user", async () => {
      mockDb.query.subscriptions.findFirst.mockResolvedValue(mockSubscription);

      const result = await getActiveSubscriptionByUserId("user-uuid-123");

      expect(result).toEqual(mockSubscription);
      expect(result?.status).toBe("active");
    });

    it("should return undefined when no active subscription", async () => {
      mockDb.query.subscriptions.findFirst.mockResolvedValue(undefined);

      const result = await getActiveSubscriptionByUserId("user-uuid-123");

      expect(result).toBeUndefined();
    });
  });

  describe("getUserByStripeCustomerId", () => {
    it("should return user when found", async () => {
      mockDb.query.users.findFirst.mockResolvedValue(mockUser);

      const result = await getUserByStripeCustomerId("cus_test_123");

      expect(result).toEqual(mockUser);
    });
  });

  describe("createSubscription", () => {
    it("should create and return subscription", async () => {
      const newSubscriptionData = {
        userId: "user-uuid-123",
        stripeSubscriptionId: "sub_new_123",
        stripePriceId: "price_test_123",
        status: "active",
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...mockSubscription, ...newSubscriptionData }]),
        }),
      });

      const result = await createSubscription(newSubscriptionData);

      expect(result.stripeSubscriptionId).toBe("sub_new_123");
    });

    it("should throw error when creation fails", async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        createSubscription({
          userId: "user-uuid-123",
          stripeSubscriptionId: "sub_fail",
          stripePriceId: "price_test",
        })
      ).rejects.toThrow("Failed to create subscription");
    });
  });

  describe("updateSubscription", () => {
    it("should update subscription status", async () => {
      const canceledSubscription = {
        ...mockSubscription,
        status: "canceled",
        cancelAtPeriodEnd: true,
      };

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([canceledSubscription]),
          }),
        }),
      });

      const result = await updateSubscription("sub_test_123", {
        status: "canceled",
        cancelAtPeriodEnd: true,
      });

      expect(result?.status).toBe("canceled");
      expect(result?.cancelAtPeriodEnd).toBe(true);
    });
  });

  describe("deleteSubscription", () => {
    it("should return true when subscription deleted", async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "sub-uuid-123" }]),
        }),
      });

      const result = await deleteSubscription("sub_test_123");

      expect(result).toBe(true);
    });

    it("should return false when subscription not found", async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await deleteSubscription("nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("hasActiveSubscription", () => {
    it("should return true when user has active subscription", async () => {
      mockDb.query.subscriptions.findFirst.mockResolvedValue(mockSubscription);

      const result = await hasActiveSubscription("user-uuid-123");

      expect(result).toBe(true);
    });

    it("should return false when user has no subscription", async () => {
      mockDb.query.subscriptions.findFirst.mockResolvedValue(undefined);

      const result = await hasActiveSubscription("user-uuid-123");

      expect(result).toBe(false);
    });
  });
});
