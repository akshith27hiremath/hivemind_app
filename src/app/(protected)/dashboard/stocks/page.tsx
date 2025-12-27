"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Stock {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const res = await fetch("/api/stocks");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch stocks");
        }

        setStocks(data.stocks);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStocks();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const formatChange = (change: number, percent: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)} (${sign}${percent.toFixed(2)}%)`;
  };

  return (
    <div className="min-h-[80vh]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Stocks
        </h1>
        <p className="mt-1 text-gray-500">
          Browse S&P 500 stocks with real-time data from Yahoo Finance
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
            />
          ))}
        </div>
      ) : (
        /* Stock Grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stocks.map((stock) => {
            const isPositive = stock.change >= 0;

            return (
              <Link
                key={stock.symbol}
                href={`/dashboard/stocks/${stock.symbol}`}
                className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg hover:border-gray-300 hover:-translate-y-0.5"
              >
                {/* Gradient overlay */}
                <div
                  className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isPositive
                      ? "bg-gradient-to-br from-emerald-50/50 to-transparent"
                      : "bg-gradient-to-br from-red-50/50 to-transparent"
                  }`}
                />

                <div className="relative p-5">
                  {/* Symbol & Exchange */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                        {stock.symbol}
                      </h3>
                      <p className="text-xs text-gray-400 font-medium">
                        {stock.exchange}
                      </p>
                    </div>
                    <div
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        isPositive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {stock.changePercent.toFixed(2)}%
                    </div>
                  </div>

                  {/* Company Name */}
                  <p className="text-sm text-gray-600 truncate mb-3">
                    {stock.name}
                  </p>

                  {/* Price & Change */}
                  <div className="flex items-end justify-between pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Price</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {stock.price > 0 ? formatPrice(stock.price) : "—"}
                      </p>
                    </div>
                    {stock.price > 0 && (
                      <p
                        className={`text-sm font-medium ${
                          isPositive ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {formatChange(stock.change, stock.changePercent)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Arrow indicator */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Info Footer */}
      <div className="mt-8 text-center text-sm text-gray-400">
        Data provided by Yahoo Finance. Prices may be delayed.
      </div>
    </div>
  );
}
