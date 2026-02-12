"use client";

import { motion, AnimatePresence } from "motion/react";
import { Clock, ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useIntelligenceData } from "./intelligence-data-provider";
import { StaleDataBadge } from "./stale-data-badge";
import { mapSentiment, mapMagnitude, toRelativeTime } from "@/lib/intelligence/mappers";
import type { Sentiment, Impact, Article } from "@/lib/intelligence/types";

type SortOption = "time" | "impact" | "relevance";
type SentimentFilter = "all" | "positive" | "negative" | "neutral";

interface DisplayItem {
  id: number;
  title: string;
  summary: string;
  time: string;
  source: string;
  impact: Impact;
  sentiment: Sentiment;
  stocks: string[];
  relevance: number;
  url: string;
  sectorName: string;
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

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-6 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
        >
          <div className="h-4 bg-white/10 rounded w-3/4 mb-3" />
          <div className="h-3 bg-white/10 rounded w-full mb-2" />
          <div className="flex gap-2">
            <div className="h-5 bg-white/10 rounded-full w-16" />
            <div className="h-5 bg-white/10 rounded w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

function mapArticleToDisplay(article: Article): DisplayItem {
  const signal = article.enrichment?.signals?.[0];
  const entity = article.enrichment?.entities?.[0];
  return {
    id: article.id,
    title: article.title,
    summary: article.summary,
    time: toRelativeTime(article.published_at),
    source: article.source,
    impact: signal ? mapMagnitude(signal.magnitude_category) : "low",
    sentiment: signal ? mapSentiment(signal.direction) : "neutral",
    stocks: article.tickers,
    relevance: 0,
    url: article.url,
    sectorName: entity?.canonical_name ?? article.tickers[0] ?? "General",
  };
}

export function SectorNewsPanel() {
  const { dashboard, status, isStale, lastFetchedAt } = useIntelligenceData();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>("time");
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchArticles = useCallback(async (offset = 0) => {
    try {
      if (offset === 0) setLoading(true);
      const res = await fetch(`/api/intelligence/articles?limit=30&offset=${offset}`);
      if (!res.ok) return;
      const data = await res.json();
      if (offset === 0) {
        setArticles(data.data ?? []);
      } else {
        setArticles((prev) => [...prev, ...(data.data ?? [])]);
      }
      setTotal(data.meta?.total ?? 0);
    } catch {
      // Non-critical — digest data still available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

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

  // Also use digest sector_context as supplemental data
  const digestSectorItems = dashboard?.data?.digest?.sections?.sector_context ?? [];

  // Memoize expensive mapping + filtering + sorting + grouping
  const { sectors, groupedNews } = useMemo(() => {
    // Map articles to display items
    const allNews = articles.map(mapArticleToDisplay);

    // Add digest items that aren't already in articles
    const articleIds = new Set(articles.map((a) => a.id));
    for (const item of digestSectorItems) {
      if (!articleIds.has(item.article_id)) {
        allNews.push({
          id: item.article_id,
          title: item.headline,
          summary: item.summary,
          time: toRelativeTime(item.published_at ?? null),
          source: item.source ?? "Intelligence",
          impact: mapMagnitude(item.magnitude ?? "moderate"),
          sentiment: mapSentiment(item.sentiment ?? "NEUTRAL"),
          stocks: item.affected_holdings,
          relevance: Math.round(item.relevance_score * 100),
          url: "",
          sectorName: item.affected_holdings[0] ?? "General",
        });
      }
    }

    // Extract unique sectors
    const sectors = [...new Set(allNews.map((n) => n.sectorName))].sort();

    const filteredAndSortedNews = allNews
      .filter((item) => sectorFilter === "all" || item.sectorName === sectorFilter)
      .filter((item) => sentimentFilter === "all" || item.sentiment === sentimentFilter)
      .sort((a, b) => {
        switch (sortBy) {
          case "time":
            return 0;
          case "impact": {
            const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
            return (impactOrder[a.impact] ?? 2) - (impactOrder[b.impact] ?? 2);
          }
          case "relevance":
            return b.relevance - a.relevance;
          default:
            return 0;
        }
      });

    // Group by sector for display
    const groupedNews = filteredAndSortedNews.reduce(
      (acc, item) => {
        if (!acc[item.sectorName]) {
          acc[item.sectorName] = [];
        }
        acc[item.sectorName]!.push(item);
        return acc;
      },
      {} as Record<string, DisplayItem[]>
    );

    return { sectors, groupedNews };
  }, [articles, digestSectorItems, sectorFilter, sentimentFilter, sortBy]);

  const isInitialLoading = loading && articles.length === 0 && status === "loading";

  return (
    <div className="space-y-6">
      {/* Header with Sort & Filter */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h3 className="text-lg font-medium mb-1">Sector News Feed</h3>
          <p className="text-sm text-gray-400">
            {total > 0
              ? `${total.toLocaleString()} articles across your holdings`
              : "Market-moving news across sectors"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isStale && <StaleDataBadge lastFetchedAt={lastFetchedAt} />}

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
                    {/* Sector Filter */}
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block">
                        Ticker
                      </label>
                      <select
                        className="w-full px-3 py-2 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none text-sm"
                        value={sectorFilter}
                        onChange={(e) => setSectorFilter(e.target.value)}
                      >
                        <option value="all">All</option>
                        {sectors.map((sector) => (
                          <option key={sector} value={sector}>
                            {sector}
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
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                      >
                        <option value="time">Time</option>
                        <option value="impact">Impact</option>
                        <option value="relevance">Relevance</option>
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
                          setSentimentFilter(e.target.value as SentimentFilter)
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

      {isInitialLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* News Cards */}
          {Object.entries(groupedNews).map(([sector, news]) => (
            <div key={sector} className="mb-6">
              <h3 className="text-lg font-medium mb-4">{sector}</h3>
              <div className="space-y-4">
                {news.map((item) => (
                  <a
                    key={item.id}
                    href={item.url || undefined}
                    target={item.url ? "_blank" : undefined}
                    rel={item.url ? "noopener noreferrer" : undefined}
                    className="block p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200 cursor-pointer"
                  >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          {getSentimentIcon(item.sentiment)}
                          <h4 className="text-white font-medium">{item.title}</h4>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {item.time}
                        </div>
                      </div>

                      {item.summary && (
                        <p className="text-sm text-gray-400 mb-4 leading-relaxed line-clamp-2">
                          {item.summary}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-xs">
                            <span className="text-gray-400">Source: </span>
                            <span className="text-white/80">{item.source}</span>
                          </div>
                          {item.relevance > 0 && (
                            <div className="text-xs">
                              <span className="text-gray-400">Relevance: </span>
                              <span className="text-white/80">{item.relevance}%</span>
                            </div>
                          )}
                        </div>

                        {item.stocks.length > 0 && (
                          <div className="flex items-center gap-1">
                            {item.stocks.slice(0, 3).map((stock) => (
                              <span
                                key={stock}
                                className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-gray-300"
                              >
                                {stock}
                              </span>
                            ))}
                            {item.stocks.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{item.stocks.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                  </a>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedNews).length === 0 && (
            <div className="p-8 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 text-center">
              <p className="text-gray-400">No news matching your filters</p>
            </div>
          )}

          {/* Load More */}
          {articles.length < total && (
            <div className="flex justify-center">
              <button
                onClick={() => fetchArticles(articles.length)}
                className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-sm"
              >
                Load More ({total - articles.length} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
