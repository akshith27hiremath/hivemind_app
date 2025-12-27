import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getUserByClerkId } from "@/lib/db/queries/users";
import { getActiveSubscriptionByUserId } from "@/lib/db/queries/subscriptions";
import {
  getPortfoliosByUserId,
  getPortfolioCountByUserId,
  createPortfolio,
} from "@/lib/db/queries/portfolios";

const FREE_PLAN_PORTFOLIO_LIMIT = 1;

/**
 * GET /api/portfolios
 * List all portfolios for the authenticated user
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByClerkId(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const portfolios = await getPortfoliosByUserId(user.id);

    return NextResponse.json({ portfolios });
  } catch (error) {
    console.error("List portfolios error:", error);
    return NextResponse.json(
      { error: "Failed to list portfolios" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/portfolios
 * Create a new portfolio
 *
 * Body: { name: string, description?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByClerkId(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Portfolio name is required" },
        { status: 400 }
      );
    }

    if (name.length > 255) {
      return NextResponse.json(
        { error: "Portfolio name must be 255 characters or less" },
        { status: 400 }
      );
    }

    // Check subscription limits (free plan = 1 portfolio max)
    const subscription = await getActiveSubscriptionByUserId(user.id);
    const portfolioCount = await getPortfolioCountByUserId(user.id);

    if (!subscription && portfolioCount >= FREE_PLAN_PORTFOLIO_LIMIT) {
      return NextResponse.json(
        {
          error:
            "Free plan limited to 1 portfolio. Upgrade to Pro for unlimited portfolios.",
          code: "PORTFOLIO_LIMIT_EXCEEDED",
        },
        { status: 403 }
      );
    }

    // Create portfolio
    const portfolio = await createPortfolio({
      userId: user.id,
      name: name.trim(),
      description: description?.trim() || null,
      source: "manual",
    });

    return NextResponse.json({ portfolio }, { status: 201 });
  } catch (error) {
    console.error("Create portfolio error:", error);
    return NextResponse.json(
      { error: "Failed to create portfolio" },
      { status: 500 }
    );
  }
}
