"use client";

import { motion } from "motion/react";
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useIntelligenceData } from "./intelligence-data-provider";
import { StaleDataBadge } from "./stale-data-badge";
import {
  mapSentiment,
  mapMagnitude,
  toRelativeTime,
} from "@/lib/intelligence/mappers";
import type { Sentiment, Impact } from "@/lib/intelligence/types";

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

function getImpactStyles(impact: Impact) {
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

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="p-4 rounded-xl bg-white/5 border border-white/10 animate-pulse"
        >
          <div className="h-4 bg-white/10 rounded w-3/4 mb-3" />
          <div className="flex gap-2">
            <div className="h-5 bg-white/10 rounded-full w-20" />
            <div className="h-5 bg-white/10 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CriticalNews() {
  const { dashboard, status, isStale, lastFetchedAt } = useIntelligenceData();

  const items =
    dashboard?.data?.digest?.sections?.direct_news?.slice(0, 3) ?? [];

  return (
    <motion.div
      className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-medium">Critical News</h3>
        </div>
        {isStale && <StaleDataBadge lastFetchedAt={lastFetchedAt} />}
      </div>

      {status === "loading" && !dashboard ? (
        <LoadingSkeleton />
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          No critical news for your portfolio today
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const sentiment = mapSentiment(item.sentiment ?? "NEUTRAL");
            const impact = mapMagnitude(item.magnitude ?? "moderate");
            const impactStyles = getImpactStyles(impact);

            return (
              <div
                key={item.article_id}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getSentimentIcon(sentiment)}
                      <h4 className="text-sm font-medium text-white">
                        {item.headline}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${impactStyles.badge}`}
                      >
                        {impactStyles.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {item.source ?? "Intelligence"}
                      </span>
                      {item.affected_holdings.length > 0 && (
                        <div className="flex items-center gap-1">
                          {item.affected_holdings.slice(0, 3).map((stock) => (
                            <span
                              key={stock}
                              className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-gray-300"
                            >
                              {stock}
                            </span>
                          ))}
                          {item.affected_holdings.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{item.affected_holdings.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {toRelativeTime(item.published_at ?? null)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
