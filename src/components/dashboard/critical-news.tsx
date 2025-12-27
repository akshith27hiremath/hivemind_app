"use client";

import { motion } from "motion/react";
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { criticalNews, type NewsItem } from "@/lib/mock-data/news";

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

function getImpactStyles(impact: NewsItem["impact"]) {
  switch (impact) {
    case "high":
      return {
        badge: "bg-red-500/20 text-red-400 border-red-500/30",
        label: "High Impact",
      };
    case "medium":
      return {
        badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        label: "Medium Impact",
      };
    default:
      return {
        badge: "bg-gray-500/20 text-gray-400 border-gray-500/30",
        label: "Low Impact",
      };
  }
}

export function CriticalNews() {
  return (
    <motion.div
      className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-medium">Critical News</h3>
      </div>

      <div className="space-y-3">
        {criticalNews.map((news, index) => {
          const impactStyles = getImpactStyles(news.impact);

          return (
            <motion.div
              key={news.id}
              className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getSentimentIcon(news.sentiment)}
                    <h4 className="text-sm font-medium text-white">
                      {news.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${impactStyles.badge}`}
                    >
                      {impactStyles.label}
                    </span>
                    <span className="text-xs text-gray-500">{news.source}</span>
                    {news.stocks.length > 0 && (
                      <div className="flex items-center gap-1">
                        {news.stocks.slice(0, 3).map((stock) => (
                          <span
                            key={stock}
                            className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-gray-300"
                          >
                            {stock}
                          </span>
                        ))}
                        {news.stocks.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{news.stocks.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {news.time}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
