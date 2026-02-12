import { NextResponse } from "next/server";
import { INTELLIGENCE_ENABLED } from "@/lib/intelligence";
import { checkHealth } from "@/lib/intelligence/client";

/**
 * GET /api/intelligence/health
 * Health check proxy for Intelligence API.
 */
export async function GET() {
  if (!INTELLIGENCE_ENABLED) {
    return NextResponse.json({
      status: "disabled",
      message: "Intelligence API integration is not enabled",
    });
  }

  const healthy = await checkHealth();
  return NextResponse.json({
    status: healthy ? "ok" : "unavailable",
  });
}
