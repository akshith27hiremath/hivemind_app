import { eq } from "drizzle-orm";
import { db } from "../index";
import { users, type NewUser, type User } from "../schema";

/**
 * Get a user by their Clerk ID
 */
export async function getUserByClerkId(clerkId: string): Promise<User | undefined> {
  const result = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });
  return result;
}

/**
 * Get a user by their email
 */
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const result = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  return result;
}

/**
 * Get a user by their internal ID
 */
export async function getUserById(id: string): Promise<User | undefined> {
  const result = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  return result;
}

/**
 * Create a new user
 */
export async function createUser(data: NewUser): Promise<User> {
  const [user] = await db.insert(users).values(data).returning();
  if (!user) {
    throw new Error("Failed to create user");
  }
  return user;
}

/**
 * Update a user by their Clerk ID
 */
export async function updateUserByClerkId(
  clerkId: string,
  data: Partial<Omit<NewUser, "clerkId">>
): Promise<User | undefined> {
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.clerkId, clerkId))
    .returning();
  return user;
}

/**
 * Delete a user by their Clerk ID
 */
export async function deleteUserByClerkId(clerkId: string): Promise<boolean> {
  const result = await db
    .delete(users)
    .where(eq(users.clerkId, clerkId))
    .returning({ id: users.id });
  return result.length > 0;
}

/**
 * Update a user's Stripe customer ID
 */
export async function updateUserStripeCustomerId(
  clerkId: string,
  stripeCustomerId: string
): Promise<User | undefined> {
  return updateUserByClerkId(clerkId, { stripeCustomerId });
}
