"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { StockChart } from "@/components/stocks/stock-chart";

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
        <div className="mb-6 h-5 w-32 animate-pulse rounded bg-gray-200" />

        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-10 w-48 animate-pulse rounded bg-gray-200 mb-2" />
          <div className="h-5 w-64 animate-pulse rounded bg-gray-200" />
        </div>

        {/* Chart skeleton */}
        <div className="h-[400px] animate-pulse rounded-xl bg-gray-200 mb-8" />

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-200" />
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
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Stocks
        </Link>

        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-red-200 bg-red-50/50 py-16 px-4">
          <div className="rounded-full bg-red-100 p-4 mb-4">
            <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {error || "Stock not found"}
          </h3>
          <p className="text-gray-500 text-center mb-6 max-w-sm">
            We couldn&apos;t load data for {symbol}. Please try again later.
          </p>
          <button
            onClick={() => router.back()}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { quote, historicalData, news } = data;
  const isPositive = quote.change >= 0;

  return (
    <div className="min-h-[80vh]">
      {/* Back Link */}
      <Link
        href="/dashboard/stocks"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Stocks
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                {quote.symbol}
              </h1>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
                {quote.exchange}
              </span>
            </div>
            <p className="text-lg text-gray-500">{quote.name}</p>
          </div>

          <div className="text-right">
            <p className="text-4xl font-bold text-gray-900">
              {formatPrice(quote.price)}
            </p>
            <p
              className={`text-lg font-semibold ${
                isPositive ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {isPositive ? "+" : ""}
              {quote.change.toFixed(2)} ({isPositive ? "+" : ""}
              {quote.changePercent.toFixed(2)}%)
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-8">
        <StockChart data={historicalData} symbol={quote.symbol} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-400 font-medium mb-1">Previous Close</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatPrice(quote.previousClose)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-400 font-medium mb-1">Open</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatPrice(quote.open)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-400 font-medium mb-1">Day High</p>
          <p className="text-lg font-semibold text-emerald-600">
            {formatPrice(quote.dayHigh)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-400 font-medium mb-1">Day Low</p>
          <p className="text-lg font-semibold text-red-600">
            {formatPrice(quote.dayLow)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-400 font-medium mb-1">Volume</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatVolume(quote.volume)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-400 font-medium mb-1">Market Cap</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatMarketCap(quote.marketCap)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-400 font-medium mb-1">52W High</p>
          <p className="text-lg font-semibold text-gray-400">—</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-400 font-medium mb-1">52W Low</p>
          <p className="text-lg font-semibold text-gray-400">—</p>
        </div>
      </div>

      {/* News Section */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
          <h2 className="font-semibold text-gray-900">Latest News</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {news.map((item, index) => (
            <div
              key={index}
              className="px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="font-medium text-gray-500">{item.source}</span>
                    <span>•</span>
                    <span>{new Date(item.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <svg
                  className="h-5 w-5 text-gray-300 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-8 text-center text-xs text-gray-400">
        Data provided by Yahoo Finance. Prices may be delayed up to 15 minutes.
        News headlines are for demonstration purposes.
      </div>
    </div>
  );
}
