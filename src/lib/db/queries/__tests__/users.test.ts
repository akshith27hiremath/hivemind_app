import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockUser, mockUserWithoutStripe } from "@/test/mocks/db";

// Mock the database module with factory function
vi.mock("@/lib/db", () => {
  const mockDb = {
    query: {
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
  getUserByClerkId,
  getUserByEmail,
  getUserById,
  createUser,
  updateUserByClerkId,
  deleteUserByClerkId,
  updateUserStripeCustomerId,
} from "../users";

// Type the mocked db
const mockDb = db as unknown as {
  query: {
    users: {
      findFirst: ReturnType<typeof vi.fn>;
    };
  };
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe("User Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserByClerkId", () => {
    it("should return user when found", async () => {
      mockDb.query.users.findFirst.mockResolvedValue(mockUser);

      const result = await getUserByClerkId("clerk_user_123");

      expect(result).toEqual(mockUser);
      expect(mockDb.query.users.findFirst).toHaveBeenCalled();
    });

    it("should return undefined when user not found", async () => {
      mockDb.query.users.findFirst.mockResolvedValue(undefined);

      const result = await getUserByClerkId("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("getUserByEmail", () => {
    it("should return user when found", async () => {
      mockDb.query.users.findFirst.mockResolvedValue(mockUser);

      const result = await getUserByEmail("test@example.com");

      expect(result).toEqual(mockUser);
    });

    it("should return undefined when user not found", async () => {
      mockDb.query.users.findFirst.mockResolvedValue(undefined);

      const result = await getUserByEmail("notfound@example.com");

      expect(result).toBeUndefined();
    });
  });

  describe("getUserById", () => {
    it("should return user when found", async () => {
      mockDb.query.users.findFirst.mockResolvedValue(mockUser);

      const result = await getUserById("user-uuid-123");

      expect(result).toEqual(mockUser);
    });
  });

  describe("createUser", () => {
    it("should create and return new user", async () => {
      const newUserData = {
        clerkId: "clerk_new_123",
        email: "new@example.com",
        firstName: "New",
        lastName: "User",
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...mockUser, ...newUserData }]),
        }),
      });

      const result = await createUser(newUserData);

      expect(result.email).toBe("new@example.com");
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should throw error when creation fails", async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        createUser({
          clerkId: "clerk_fail",
          email: "fail@example.com",
        })
      ).rejects.toThrow("Failed to create user");
    });
  });

  describe("updateUserByClerkId", () => {
    it("should update and return user", async () => {
      const updatedUser = { ...mockUser, firstName: "Updated" };

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedUser]),
          }),
        }),
      });

      const result = await updateUserByClerkId("clerk_user_123", {
        firstName: "Updated",
      });

      expect(result?.firstName).toBe("Updated");
    });
  });

  describe("deleteUserByClerkId", () => {
    it("should return true when user deleted", async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "user-uuid-123" }]),
        }),
      });

      const result = await deleteUserByClerkId("clerk_user_123");

      expect(result).toBe(true);
    });

    it("should return false when user not found", async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await deleteUserByClerkId("nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("updateUserStripeCustomerId", () => {
    it("should update stripe customer id", async () => {
      const userWithStripe = { ...mockUserWithoutStripe, stripeCustomerId: "cus_new_123" };

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([userWithStripe]),
          }),
        }),
      });

      const result = await updateUserStripeCustomerId("clerk_user_123", "cus_new_123");

      expect(result?.stripeCustomerId).toBe("cus_new_123");
    });
  });
});
