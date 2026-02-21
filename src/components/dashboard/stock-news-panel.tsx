"use client";

import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  ExternalLink,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useIntelligenceData } from "./intelligence-data-provider";
import { StaleDataBadge } from "./stale-data-badge";
import {
  mapSentiment,
  mapMagnitude,
  toRelativeTime,
  mapSignalType,
} from "@/lib/intelligence/mappers";
import type { Sentiment, Impact, Article } from "@/lib/intelligence/types";
import { ArticleHeadline } from "@/components/ui/article-headline";

type SortOption = "time" | "impact" | "sentiment";
type SentimentFilter = "all" | "positive" | "negative" | "neutral";

interface DisplayItem {
  id: number;
  stock: string;
  title: string;
  summary: string;
  time: string;
  source: string;
  sentiment: Sentiment;
  impact: Impact;
  signalLabel: string;
  relevance: number;
  url: string;
}

function getSentimentIcon(sentiment: Sentiment) {
  switch (sentiment) {
    case "positive":
      return <TrendingUp className="w-4 h-4 text-hm-candle-green" />;
    case "negative":
      return <TrendingDown className="w-4 h-4 text-hm-candle-red" />;
    default:
      return <Minus className="w-4 h-4 text-gray-400" />;
  }
}

function getImpactBadge(impact: Impact) {
  switch (impact) {
    case "high":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "medium":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="p-6 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
        >
          <div className="flex gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/10" />
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-white/10 rounded w-3/4" />
              <div className="h-3 bg-white/10 rounded w-full" />
              <div className="h-3 bg-white/10 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function mapArticleToStockDisplay(article: Article): DisplayItem[] {
  const signal = article.enrichment?.signals?.[0];
  const tickers = article.tickers.length > 0 ? article.tickers : ["General"];
  return tickers.slice(0, 1).map((ticker) => ({
    id: article.id,
    stock: ticker,
    title: article.title,
    summary: article.summary,
    time: toRelativeTime(article.published_at),
    source: article.source,
    sentiment: signal ? mapSentiment(signal.direction) : "neutral",
    impact: signal ? mapMagnitude(signal.magnitude_category) : "low",
    signalLabel: signal ? mapSignalType(signal.signal_type) : "",
    relevance: 0,
    url: article.url,
  }));
}

export function StockNewsPanel() {
  const { portfolios, selectedPortfolioId, isStale, lastFetchedAt } =
    useIntelligenceData();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("time");
  const [sentimentFilter, setSentimentFilter] =
    useState<SentimentFilter>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchArticles = useCallback(
    async (ticker?: string) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ limit: "20" });
        if (ticker && ticker !== "all") params.set("ticker", ticker);
        const res = await fetch(`/api/intelligence/articles?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        setArticles(data.data ?? []);
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Fetch on stock filter change
  useEffect(() => {
    fetchArticles(stockFilter);
  }, [stockFilter, fetchArticles]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Memoize expensive derivations
  const holdingStocks = useMemo(
    () => [...new Set(articles.flatMap((a) => a.tickers))].sort(),
    [articles]
  );

  const filteredAndSortedNews = useMemo(() => {
    const displayItems = articles.flatMap(mapArticleToStockDisplay);
    return displayItems
      .filter(
        (item) => sentimentFilter === "all" || item.sentiment === sentimentFilter
      )
      .sort((a, b) => {
        switch (sortBy) {
          case "time":
            return 0;
          case "impact": {
            const order: Record<string, number> = {
              high: 0,
              medium: 1,
              low: 2,
            };
            return (order[a.impact] ?? 2) - (order[b.impact] ?? 2);
          }
          case "sentiment": {
            const order: Record<string, number> = {
              positive: 0,
              neutral: 1,
              negative: 2,
            };
            return (order[a.sentiment] ?? 1) - (order[b.sentiment] ?? 1);
          }
          default:
            return 0;
        }
      });
  }, [articles, sentimentFilter, sortBy]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between mb-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h3 className="text-lg font-medium mb-1">Stock-Specific News</h3>
          <p className="text-sm text-gray-400">
            Latest news affecting your individual holdings
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isStale && <StaleDataBadge lastFetchedAt={lastFetchedAt} />}

          {/* Sort & Filter Button */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="px-4 py-2 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm flex items-center gap-2"
            >
              <span>Sort & Filter</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-white/60 transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  className="absolute right-0 mt-2 w-64 rounded-2xl backdrop-blur-xl bg-black/90 border border-white/10 shadow-2xl z-20 overflow-hidden"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.1 }}
                >
                  <div className="p-4 space-y-4">
                    {/* Stock Filter */}
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block">
                        Stock
                      </label>
                      <select
                        className="w-full px-3 py-2 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none text-sm"
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value)}
                      >
                        <option value="all">All Stocks</option>
                        {holdingStocks.map((stock) => (
                          <option key={stock} value={stock}>
                            {stock}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block">
                        Sort By
                      </label>
                      <select
                        className="w-full px-3 py-2 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none text-sm"
                        value={sortBy}
                        onChange={(e) =>
                          setSortBy(e.target.value as SortOption)
                        }
                      >
                        <option value="time">Time</option>
                        <option value="impact">Impact</option>
                        <option value="sentiment">Sentiment</option>
                      </select>
                    </div>

                    {/* Sentiment Filter */}
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block">
                        Sentiment
                      </label>
                      <select
                        className="w-full px-3 py-2 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none text-sm"
                        value={sentimentFilter}
                        onChange={(e) =>
                          setSentimentFilter(
                            e.target.value as SentimentFilter
                          )
                        }
                      >
                        <option value="all">All</option>
                        <option value="positive">Positive</option>
                        <option value="negative">Negative</option>
                        <option value="neutral">Neutral</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {loading && articles.length === 0 ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* News Cards */}
          {filteredAndSortedNews.map((item) => (
            <div
              key={item.id}
              className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200"
            >
                <div className="flex items-start gap-4">
                  {/* Stock Badge */}
                  <div className="px-3 py-2 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 flex-shrink-0">
                    <div className="text-sm font-medium">{item.stock}</div>
                  </div>

                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getSentimentIcon(item.sentiment)}
                          <ArticleHeadline
                            url={item.url}
                            className="font-medium text-white"
                          >
                            {item.title}
                          </ArticleHeadline>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>{item.source}</span>
                          <span>-</span>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.time}
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Summary */}
                    <p className="text-sm text-gray-300 leading-relaxed mb-4 line-clamp-2">
                      {item.summary}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm">
                        <div>
                          <span className="text-gray-400">Sentiment: </span>
                          <span className="capitalize text-white/80">
                            {item.sentiment}
                          </span>
                        </div>
                        {item.signalLabel && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border ${getImpactBadge(item.impact)}`}
                          >
                            {item.signalLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          ))}

          {filteredAndSortedNews.length === 0 && (
            <div className="p-8 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 text-center">
              <p className="text-gray-400">No news matching your filters</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
