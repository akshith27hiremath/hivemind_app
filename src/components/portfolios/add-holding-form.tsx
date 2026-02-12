"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const AVAILABLE_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "TSM", name: "Taiwan Semiconductor" },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "XOM", name: "Exxon Mobil Corporation" },
  { symbol: "ASML", name: "ASML Holding" },
  { symbol: "LRCX", name: "Lam Research" },
  { symbol: "AMAT", name: "Applied Materials" },
  { symbol: "MU", name: "Micron Technology" },
  { symbol: "QCOM", name: "Qualcomm Inc." },
  { symbol: "AVGO", name: "Broadcom Inc." },
  { symbol: "TXN", name: "Texas Instruments" },
  { symbol: "INTC", name: "Intel Corporation" },
  { symbol: "AMD", name: "Advanced Micro Devices" },
  { symbol: "CRM", name: "Salesforce Inc." },
  { symbol: "GS", name: "Goldman Sachs Group" },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "MA", name: "Mastercard Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "NFLX", name: "Netflix Inc." },
  { symbol: "DIS", name: "Walt Disney Co." },
  { symbol: "BA", name: "Boeing Co." },
];

interface AddHoldingFormProps {
  portfolioId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddHoldingForm({ portfolioId, onSuccess, onCancel }: AddHoldingFormProps) {
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [averagePrice, setAveragePrice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/portfolios/${portfolioId}/holdings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          quantity: parseFloat(quantity),
          averagePrice: parseFloat(averagePrice),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add holding");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Add Holding</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="symbol" className="block text-sm font-medium text-gray-700">
              Stock Symbol *
            </label>
            <select
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a stock...</option>
              {AVAILABLE_STOCKS.map((stock) => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.symbol} - {stock.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                Quantity *
              </label>
              <input
                id="quantity"
                type="number"
                step="0.000001"
                min="0.000001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="10"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="averagePrice" className="block text-sm font-medium text-gray-700">
                Avg Price ($) *
              </label>
              <input
                id="averagePrice"
                type="number"
                step="0.01"
                min="0"
                value={averagePrice}
                onChange={(e) => setAveragePrice(e.target.value)}
                placeholder="150.00"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={isLoading || !symbol || !quantity || !averagePrice}
            >
              {isLoading ? "Adding..." : "Add Holding"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
