import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getUserByClerkId } from "@/lib/db/queries/users";
import {
  getPortfolioById,
  getHoldingById,
  updateHolding,
  deleteHolding,
} from "@/lib/db/queries/portfolios";

interface RouteParams {
  params: Promise<{ id: string; holdingId: string }>;
}

/**
 * Verify portfolio ownership before any holding operation
 */
async function verifyPortfolioOwnership(
  portfolioId: string,
  holdingId: string,
  internalUserId: string
): Promise<{
  error?: string;
  status?: number;
  holding?: Awaited<ReturnType<typeof getHoldingById>>;
}> {
  const portfolio = await getPortfolioById(portfolioId);

  if (!portfolio || portfolio.userId !== internalUserId) {
    return { error: "Portfolio not found", status: 404 };
  }

  const holding = await getHoldingById(holdingId);

  if (!holding || holding.portfolioId !== portfolioId) {
    return { error: "Holding not found", status: 404 };
  }

  return { holding };
}

/**
 * PATCH /api/portfolios/[id]/holdings/[holdingId]
 * Update a holding
 *
 * Body: {
 *   quantity?: number,
 *   averagePrice?: number,
 *   currentPrice?: number,
 *   instrumentType?: string,
 *   currency?: string
 * }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByClerkId(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id: portfolioId, holdingId } = await params;

    const verification = await verifyPortfolioOwnership(
      portfolioId,
      holdingId,
      user.id
    );
    if (verification.error) {
      return NextResponse.json(
        { error: verification.error },
        { status: verification.status }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { quantity, averagePrice, currentPrice, instrumentType, currency } = body;

    const updateData: Record<string, unknown> = {};

    if (quantity !== undefined) {
      if (typeof quantity !== "number" || quantity <= 0) {
        return NextResponse.json(
          { error: "Quantity must be a positive number" },
          { status: 400 }
        );
      }
      updateData.quantity = quantity.toString();
    }

    if (averagePrice !== undefined) {
      if (typeof averagePrice !== "number" || averagePrice < 0) {
        return NextResponse.json(
          { error: "Average price must be a non-negative number" },
          { status: 400 }
        );
      }
      updateData.averagePrice = averagePrice.toString();
    }

    if (currentPrice !== undefined) {
      if (
        currentPrice !== null &&
        (typeof currentPrice !== "number" || currentPrice < 0)
      ) {
        return NextResponse.json(
          { error: "Current price must be a non-negative number or null" },
          { status: 400 }
        );
      }
      updateData.currentPrice = currentPrice?.toString() || null;
    }

    if (instrumentType !== undefined) {
      updateData.instrumentType = instrumentType?.trim() || "equity";
    }

    if (currency !== undefined) {
      updateData.currency = currency?.trim() || "USD";
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const holding = await updateHolding(holdingId, updateData);

    return NextResponse.json({ holding });
  } catch (error) {
    console.error("Update holding error:", error);
    return NextResponse.json(
      { error: "Failed to update holding" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/portfolios/[id]/holdings/[holdingId]
 * Remove a holding from a portfolio
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByClerkId(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id: portfolioId, holdingId } = await params;

    const verification = await verifyPortfolioOwnership(
      portfolioId,
      holdingId,
      user.id
    );
    if (verification.error) {
      return NextResponse.json(
        { error: verification.error },
        { status: verification.status }
      );
    }

    await deleteHolding(holdingId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete holding error:", error);
    return NextResponse.json(
      { error: "Failed to delete holding" },
      { status: 500 }
    );
  }
}
