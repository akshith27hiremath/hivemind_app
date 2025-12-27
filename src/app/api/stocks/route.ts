import { NextResponse } from "next/server";
import { getAllStockQuotes, STOCK_LIST } from "@/lib/stocks";

export async function GET() {
  try {
    // Try to get live quotes, fall back to basic info if Yahoo API fails
    let stocks;
    try {
      stocks = await getAllStockQuotes();
    } catch {
      // Fallback to basic stock list without live prices
      stocks = STOCK_LIST.map((stock) => ({
        ...stock,
        price: 0,
        change: 0,
        changePercent: 0,
      }));
    }

    return NextResponse.json({ stocks });
  } catch (error) {
    console.error("Failed to fetch stocks:", error);
    return NextResponse.json(
      { error: "Failed to fetch stocks" },
      { status: 500 }
    );
  }
}
