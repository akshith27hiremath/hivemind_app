"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { StockChart } from "@/components/stocks/stock-chart";
import { ChevronLeft, TrendingUp, TrendingDown, ExternalLink, AlertTriangle } from "lucide-react";

interface PriceData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockQuote {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap?: number;
}

interface NewsItem {
  title: string;
  source: string;
  date: string;
  url: string;
}

interface StockData {
  quote: StockQuote;
  historicalData: PriceData[];
  news: NewsItem[];
}

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string)?.toUpperCase();

  const [data, setData] = useState<StockData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;

    const fetchStockData = async () => {
      try {
        const res = await fetch(`/api/stocks/${symbol}`);
        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.error || "Failed to fetch stock data");
        }

        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStockData();
  }, [symbol]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1_000_000_000) {
      return (volume / 1_000_000_000).toFixed(2) + "B";
    }
    if (volume >= 1_000_000) {
      return (volume / 1_000_000).toFixed(2) + "M";
    }
    if (volume >= 1_000) {
      return (volume / 1_000).toFixed(2) + "K";
    }
    return volume.toString();
  };

  const formatMarketCap = (cap: number | undefined) => {
    if (!cap) return "—";
    if (cap >= 1_000_000_000_000) {
      return "$" + (cap / 1_000_000_000_000).toFixed(2) + "T";
    }
    if (cap >= 1_000_000_000) {
      return "$" + (cap / 1_000_000_000).toFixed(2) + "B";
    }
    return "$" + (cap / 1_000_000).toFixed(2) + "M";
  };

  if (isLoading) {
    return (
      <div className="min-h-[80vh]">
        {/* Back link skeleton */}
        <div className="mb-6 h-5 w-32 animate-pulse rounded-lg bg-white/10" />

        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-white/10 mb-2" />
          <div className="h-5 w-64 animate-pulse rounded-lg bg-white/10" />
        </div>

        {/* Chart skeleton */}
        <div className="h-[400px] animate-pulse rounded-2xl bg-white/5 border border-white/10 mb-8" />

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5 border border-white/10" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[80vh]">
        <Link
          href="/dashboard/stocks"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Stocks
        </Link>

        <motion.div
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-red-500/20 bg-red-500/5 py-16 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="rounded-full bg-red-500/10 p-4 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {error || "Stock not found"}
          </h3>
          <p className="text-gray-400 text-center mb-6 max-w-sm">
            We couldn&apos;t load data for {symbol}. Please try again later.
          </p>
          <button
            onClick={() => router.back()}
            className="rounded-xl bg-white/10 border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
          >
            Go Back
          </button>
        </motion.div>
      </div>
    );
  }

  const { quote, historicalData, news } = data;
  const isPositive = quote.change >= 0;

  return (
    <div className="min-h-[80vh]">
      {/* Back Link */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href="/dashboard/stocks"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Stocks
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl font-bold tracking-tight text-white">
                {quote.symbol}
              </h1>
              <span className="rounded-full bg-white/10 border border-white/20 px-3 py-1 text-sm font-medium text-gray-300">
                {quote.exchange}
              </span>
            </div>
            <p className="text-lg text-gray-400">{quote.name}</p>
          </div>

          <div className="text-right p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-4xl font-bold text-white">
              {formatPrice(quote.price)}
            </p>
            <p
              className={`flex items-center justify-end gap-1.5 text-lg font-semibold ${
                isPositive ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {isPositive ? "+" : ""}
              {quote.change.toFixed(2)} ({isPositive ? "+" : ""}
              {quote.changePercent.toFixed(2)}%)
            </p>
          </div>
        </div>
      </motion.div>

      {/* Chart */}
      <motion.div
        className="mb-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <StockChart data={historicalData} symbol={quote.symbol} />
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Previous Close</p>
          <p className="text-lg font-semibold text-white">
            {formatPrice(quote.previousClose)}
          </p>
        </div>
        <div className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Open</p>
          <p className="text-lg font-semibold text-white">
            {formatPrice(quote.open)}
          </p>
        </div>
        <div className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Day High</p>
          <p className="text-lg font-semibold text-emerald-400">
            {formatPrice(quote.dayHigh)}
          </p>
        </div>
        <div className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Day Low</p>
          <p className="text-lg font-semibold text-red-400">
            {formatPrice(quote.dayLow)}
          </p>
        </div>
        <div className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Volume</p>
          <p className="text-lg font-semibold text-white">
            {formatVolume(quote.volume)}
          </p>
        </div>
        <div className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Market Cap</p>
          <p className="text-lg font-semibold text-white">
            {formatMarketCap(quote.marketCap)}
          </p>
        </div>
        <div className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">52W High</p>
          <p className="text-lg font-semibold text-gray-500">—</p>
        </div>
        <div className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">52W Low</p>
          <p className="text-lg font-semibold text-gray-500">—</p>
        </div>
      </motion.div>

      {/* News Section */}
      <motion.div
        className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 overflow-hidden"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="border-b border-white/10 bg-white/5 px-6 py-4">
          <h2 className="font-semibold text-white">Latest News</h2>
        </div>
        <div className="divide-y divide-white/5">
          {news.map((item, index) => (
            <motion.div
              key={index}
              className="px-6 py-4 hover:bg-white/5 transition-colors group"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + index * 0.05 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white mb-1 line-clamp-2 group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-medium text-gray-400">{item.source}</span>
                    <span>•</span>
                    <span>{new Date(item.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-gray-600 group-hover:text-gray-400 shrink-0 transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Disclaimer */}
      <motion.div
        className="mt-8 text-center text-xs text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Data provided by Yahoo Finance. Prices may be delayed up to 15 minutes.
        News headlines are for demonstration purposes.
      </motion.div>
    </div>
  );
}
