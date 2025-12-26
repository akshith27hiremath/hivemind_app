import { eq, and } from "drizzle-orm";
import { db } from "../index";
import { subscriptions, users, type NewSubscription, type Subscription } from "../schema";

/**
 * Get a subscription by Stripe subscription ID
 */
export async function getSubscriptionByStripeId(
  stripeSubscriptionId: string
): Promise<Subscription | undefined> {
  const result = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId),
  });
  return result;
}

/**
 * Get active subscription for a user
 */
export async function getActiveSubscriptionByUserId(
  userId: string
): Promise<Subscription | undefined> {
  const result = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, userId),
      eq(subscriptions.status, "active")
    ),
  });
  return result;
}

/**
 * Get user by Stripe customer ID
 */
export async function getUserByStripeCustomerId(stripeCustomerId: string) {
  const result = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, stripeCustomerId),
  });
  return result;
}

/**
 * Create a new subscription
 */
export async function createSubscription(
  data: NewSubscription
): Promise<Subscription> {
  const [subscription] = await db.insert(subscriptions).values(data).returning();
  if (!subscription) {
    throw new Error("Failed to create subscription");
  }
  return subscription;
}

/**
 * Update a subscription by Stripe subscription ID
 */
export async function updateSubscription(
  stripeSubscriptionId: string,
  data: Partial<Omit<NewSubscription, "stripeSubscriptionId">>
): Promise<Subscription | undefined> {
  const [subscription] = await db
    .update(subscriptions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .returning();
  return subscription;
}

/**
 * Delete a subscription by Stripe subscription ID
 */
export async function deleteSubscription(
  stripeSubscriptionId: string
): Promise<boolean> {
  const result = await db
    .delete(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .returning({ id: subscriptions.id });
  return result.length > 0;
}

/**
 * Check if user has an active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await getActiveSubscriptionByUserId(userId);
  return !!subscription;
}
