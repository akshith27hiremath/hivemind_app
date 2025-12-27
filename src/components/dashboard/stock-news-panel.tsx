"use client";

import { motion, AnimatePresence } from "motion/react";
import { Clock, ExternalLink, ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { stockSpecificNews, type NewsSentiment } from "@/lib/mock-data/news";

type SortOption = "time" | "impact" | "sentiment";
type SentimentFilter = "all" | "positive" | "negative" | "neutral";

function getSentimentIcon(sentiment: NewsSentiment) {
  switch (sentiment) {
    case "positive":
      return <TrendingUp className="w-4 h-4 text-hm-candle-green" />;
    case "negative":
      return <TrendingDown className="w-4 h-4 text-hm-candle-red" />;
    default:
      return <Minus className="w-4 h-4 text-gray-400" />;
  }
}

function getPriceImpactColor(value: number) {
  if (value > 0) return "text-hm-candle-green";
  if (value < 0) return "text-hm-candle-red";
  return "text-gray-400";
}

export function StockNewsPanel() {
  const [sortBy, setSortBy] = useState<SortOption>("time");
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
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

  const stocks = [...new Set(stockSpecificNews.map((n) => n.stock))];

  const filteredAndSortedNews = stockSpecificNews
    .filter((item) => stockFilter === "all" || item.stock === stockFilter)
    .filter((item) => sentimentFilter === "all" || item.sentiment === sentimentFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case "time":
          return b.timestamp - a.timestamp;
        case "impact":
          return Math.abs(b.impactValue) - Math.abs(a.impactValue);
        case "sentiment":
          const sentimentOrder = { positive: 0, neutral: 1, negative: 2 };
          return sentimentOrder[a.sentiment] - sentimentOrder[b.sentiment];
        default:
          return 0;
      }
    });

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
                      {stocks.map((stock) => (
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
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
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
        {filteredAndSortedNews.map((item, index) => (
          <motion.div
            key={item.id}
            className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
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
                      <h4 className="font-medium text-white">{item.title}</h4>
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

                  <motion.button
                    className="p-2 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* Summary */}
                <p className="text-sm text-gray-300 leading-relaxed mb-4">
                  {item.summary}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Sentiment: </span>
                      <span className="capitalize text-white/80">
                        {item.sentiment}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Price Impact: </span>
                      <span className={getPriceImpactColor(item.impactValue)}>
                        {item.priceImpact}
                      </span>
                    </div>
                  </div>

                  <motion.button
                    className="px-4 py-2 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Analyze Impact
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {filteredAndSortedNews.length === 0 && (
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
