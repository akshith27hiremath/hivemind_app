"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";

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
      <motion.div
        className="mb-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Stocks
        </h1>
        <p className="mt-1 text-gray-400">
          Browse S&P 500 stocks with real-time data from Yahoo Finance
        </p>
      </motion.div>

      {/* Error State */}
      {error && (
        <motion.div
          className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {error}
        </motion.div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-2xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      ) : (
        /* Stock Grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stocks.map((stock, index) => {
            const isPositive = stock.change >= 0;

            return (
              <motion.div
                key={stock.symbol}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
              >
                <Link
                  href={`/dashboard/stocks/${stock.symbol}`}
                  className="group block relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 transition-all hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5"
                >
                  {/* Gradient overlay */}
                  <div
                    className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                      isPositive
                        ? "bg-gradient-to-br from-emerald-500/10 to-transparent"
                        : "bg-gradient-to-br from-red-500/10 to-transparent"
                    }`}
                  />

                  <div className="relative p-5">
                    {/* Symbol & Exchange */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                          {stock.symbol}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">
                          {stock.exchange}
                        </p>
                      </div>
                      <div
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isPositive
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {isPositive ? "+" : ""}
                        {stock.changePercent.toFixed(2)}%
                      </div>
                    </div>

                    {/* Company Name */}
                    <p className="text-sm text-gray-400 truncate mb-3">
                      {stock.name}
                    </p>

                    {/* Price & Change */}
                    <div className="flex items-end justify-between pt-3 border-t border-white/10">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Price</p>
                        <p className="text-lg font-semibold text-white">
                          {stock.price > 0 ? formatPrice(stock.price) : "—"}
                        </p>
                      </div>
                      {stock.price > 0 && (
                        <p
                          className={`text-sm font-medium ${
                            isPositive ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {formatChange(stock.change, stock.changePercent)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Info Footer */}
      <motion.div
        className="mt-8 text-center text-sm text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Data provided by Yahoo Finance. Prices may be delayed.
      </motion.div>
    </div>
  );
}
