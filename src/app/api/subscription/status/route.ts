import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserByClerkId } from "@/lib/db/queries/users";
import { getActiveSubscriptionByUserId } from "@/lib/db/queries/subscriptions";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByClerkId(userId);

    if (!user) {
      return NextResponse.json({
        hasSubscription: false,
        status: null,
        plan: "free",
      });
    }

    const subscription = await getActiveSubscriptionByUserId(user.id);

    if (!subscription) {
      return NextResponse.json({
        hasSubscription: false,
        status: null,
        plan: "free",
      });
    }

    return NextResponse.json({
      hasSubscription: true,
      status: subscription.status,
      plan: "pro",
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    });
  } catch (error) {
    console.error("Subscription status error:", error);
    return NextResponse.json(
      { error: "Failed to get subscription status" },
      { status: 500 }
    );
  }
}
