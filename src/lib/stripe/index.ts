import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-01-27.acacia",
  typescript: true,
});

export const PLANS = {
  free: {
    name: "Free",
    description: "Basic portfolio tracking",
    price: 0,
    priceId: null,
    features: [
      "1 portfolio",
      "Manual transaction entry",
      "Basic analytics",
      "CSV import (limited)",
    ],
  },
  pro: {
    name: "Pro",
    description: "Advanced portfolio management",
    price: 9,
    priceId: process.env.STRIPE_PRICE_ID_PRO,
    features: [
      "Unlimited portfolios",
      "Zerodha CSV import",
      "Advanced analytics",
      "Performance tracking",
      "Export reports",
      "Priority support",
    ],
  },
} as const;

export type PlanType = keyof typeof PLANS;

export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
}: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

export async function createCustomerPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export async function createStripeCustomer({
  email,
  name,
  metadata,
}: {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}) {
  return stripe.customers.create({
    email,
    name,
    metadata,
  });
}

export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}
