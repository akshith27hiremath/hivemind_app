"use client";

import { motion, AnimatePresence } from "motion/react";
import { Clock, ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { sectorNews, type NewsItem } from "@/lib/mock-data/news";

type SortOption = "time" | "impact" | "relevance";
type SentimentFilter = "all" | "positive" | "negative" | "neutral";

function getSentimentIcon(sentiment: NewsItem["sentiment"]) {
  switch (sentiment) {
    case "positive":
      return <TrendingUp className="w-4 h-4 text-hm-candle-green" />;
    case "negative":
      return <TrendingDown className="w-4 h-4 text-hm-candle-red" />;
    default:
      return <Minus className="w-4 h-4 text-gray-400" />;
  }
}

export function SectorNewsPanel() {
  const [sortBy, setSortBy] = useState<SortOption>("time");
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Flatten news for filtering and sorting
  const allNews = sectorNews.flatMap((sector) =>
    sector.news.map((newsItem) => ({ ...newsItem, sectorName: sector.sector }))
  );

  const sectors = [...new Set(sectorNews.map((s) => s.sector))];

  const filteredAndSortedNews = allNews
    .filter((item) => sectorFilter === "all" || item.sectorName === sectorFilter)
    .filter((item) => sentimentFilter === "all" || item.sentiment === sentimentFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case "time":
          return b.timestamp - a.timestamp;
        case "impact":
          const impactOrder = { high: 0, medium: 1, low: 2 };
          return impactOrder[a.impact] - impactOrder[b.impact];
        case "relevance":
          return (b.relevance ?? 0) - (a.relevance ?? 0);
        default:
          return 0;
      }
    });

  // Group back by sector for display
  const groupedNews = filteredAndSortedNews.reduce(
    (acc, item) => {
      if (!acc[item.sectorName]) {
        acc[item.sectorName] = [];
      }
      acc[item.sectorName].push(item);
      return acc;
    },
    {} as Record<string, typeof filteredAndSortedNews>
  );

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
            Market-moving news across sectors
          </p>
        </div>

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
                      Sector
                    </label>
                    <select
                      className="w-full px-3 py-2 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none text-sm"
                      value={sectorFilter}
                      onChange={(e) => setSectorFilter(e.target.value)}
                    >
                      <option value="all">All Sectors</option>
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
      </motion.div>

      {/* News Cards */}
      <AnimatePresence mode="wait">
        {Object.entries(groupedNews).map(([sector, news], sectorIndex) => (
          <motion.div
            key={sector}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: sectorIndex * 0.1 }}
          >
            <h3 className="text-lg font-medium mb-4">{sector}</h3>
            <div className="space-y-4">
              {news.map((item, index) => (
                <motion.div
                  key={item.id}
                  className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
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
                    <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                      {item.summary}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-xs">
                        <span className="text-gray-400">Source: </span>
                        <span className="text-white/80">{item.source}</span>
                      </div>
                      {item.relevance && (
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

                  {/* Relevance bar */}
                  {item.relevance && (
                    <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-white/20 to-white/40 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${item.relevance}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {Object.keys(groupedNews).length === 0 && (
        <motion.div
          className="p-8 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-gray-400">No news matching your filters</p>
        </motion.div>
      )}
    </div>
  );
}
