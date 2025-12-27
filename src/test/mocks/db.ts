import { vi } from "vitest";
import type { User, Subscription, Portfolio } from "@/lib/db/schema";

// Mock user data
export const mockUser: User = {
  id: "user-uuid-123",
  clerkId: "clerk_user_123",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  imageUrl: "https://example.com/avatar.jpg",
  stripeCustomerId: "cus_test_123",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

export const mockUserWithoutStripe: User = {
  ...mockUser,
  stripeCustomerId: null,
};

// Mock subscription data
export const mockSubscription: Subscription = {
  id: "sub-uuid-123",
  userId: "user-uuid-123",
  stripeSubscriptionId: "sub_test_123",
  stripePriceId: "price_test_123",
  status: "active",
  currentPeriodStart: new Date("2024-01-01"),
  currentPeriodEnd: new Date("2024-02-01"),
  cancelAtPeriodEnd: false,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

// Mock portfolio data
export const mockPortfolio: Portfolio = {
  id: "portfolio-uuid-123",
  userId: "user-uuid-123",
  name: "My Portfolio",
  description: "Test portfolio",
  source: "manual",
  sourceAccountId: null,
  isActive: true,
  lastSyncedAt: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

// Database mock factory
export function createDbMock() {
  return {
    query: {
      users: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      subscriptions: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      portfolios: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
  };
}
