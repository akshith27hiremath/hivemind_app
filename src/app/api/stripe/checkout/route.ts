import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createCheckoutSession, createStripeCustomer, PLANS } from "@/lib/stripe";
import { getUserByClerkId, updateUserStripeCustomerId } from "@/lib/db/queries/users";

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await getUserByClerkId(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const priceId = PLANS.pro.priceId;
    if (!priceId) {
      return NextResponse.json(
        { error: "Pro plan price ID not configured" },
        { status: 500 }
      );
    }

    // Create or get Stripe customer
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await createStripeCustomer({
        email: user.email,
        name: user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : undefined,
        metadata: {
          clerkId: userId,
          userId: user.id,
        },
      });
      stripeCustomerId = customer.id;

      // Save customer ID to database
      await updateUserStripeCustomerId(userId, stripeCustomerId);
    }

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await createCheckoutSession({
      customerId: stripeCustomerId,
      priceId,
      successUrl: `${appUrl}/settings?success=true`,
      cancelUrl: `${appUrl}/settings?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
