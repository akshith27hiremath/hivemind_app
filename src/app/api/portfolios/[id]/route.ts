import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getUserByClerkId } from "@/lib/db/queries/users";
import {
  getPortfolioById,
  getPortfolioWithHoldings,
  updatePortfolio,
  deletePortfolio,
} from "@/lib/db/queries/portfolios";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/portfolios/[id]
 * Get a single portfolio with its holdings
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByClerkId(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id } = await params;
    const portfolio = await getPortfolioWithHoldings(id);

    // Return 404 for non-existent OR other user's portfolio (security: don't reveal existence)
    if (!portfolio || portfolio.userId !== user.id) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ portfolio });
  } catch (error) {
    console.error("Get portfolio error:", error);
    return NextResponse.json(
      { error: "Failed to get portfolio" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/portfolios/[id]
 * Update a portfolio
 *
 * Body: { name?: string, description?: string, isActive?: boolean }
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

    const { id } = await params;
    const existingPortfolio = await getPortfolioById(id);

    // Return 404 for non-existent OR other user's portfolio
    if (!existingPortfolio || existingPortfolio.userId !== user.id) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { name, description, isActive } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Portfolio name cannot be empty" },
          { status: 400 }
        );
      }
      if (name.length > 255) {
        return NextResponse.json(
          { error: "Portfolio name must be 255 characters or less" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return NextResponse.json(
          { error: "isActive must be a boolean" },
          { status: 400 }
        );
      }
      updateData.isActive = isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const portfolio = await updatePortfolio(id, updateData);

    return NextResponse.json({ portfolio });
  } catch (error) {
    console.error("Update portfolio error:", error);
    return NextResponse.json(
      { error: "Failed to update portfolio" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/portfolios/[id]
 * Delete a portfolio (holdings cascade delete via DB constraint)
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

    const { id } = await params;
    const existingPortfolio = await getPortfolioById(id);

    // Return 404 for non-existent OR other user's portfolio
    if (!existingPortfolio || existingPortfolio.userId !== user.id) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      );
    }

    await deletePortfolio(id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete portfolio error:", error);
    return NextResponse.json(
      { error: "Failed to delete portfolio" },
      { status: 500 }
    );
  }
}
