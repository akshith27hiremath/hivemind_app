"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useIntelligenceData } from "./intelligence-data-provider";
import { StaleDataBadge } from "./stale-data-badge";
import { mapSentiment } from "@/lib/intelligence/mappers";
import type { Sentiment, DigestItem } from "@/lib/intelligence/types";
import { useMemo } from "react";

function getImpactIcon(impact: Sentiment) {
  switch (impact) {
    case "positive":
      return TrendingUp;
    case "negative":
      return TrendingDown;
    default:
      return Minus;
  }
}

function getImpactColor(impact: Sentiment) {
  switch (impact) {
    case "positive":
      return "text-white/80";
    case "negative":
      return "text-white/80";
    default:
      return "text-gray-400";
  }
}

interface StockGroup {
  stock: string;
  impact: Sentiment;
  relevance: string;
  reason: string;
  news: string;
  confidence: number;
}

function groupByStock(items: DigestItem[]): StockGroup[] {
  const groups = new Map<string, DigestItem[]>();

  for (const item of items) {
    const stock = item.affected_holdings[0];
    if (!stock) continue;
    if (!groups.has(stock)) groups.set(stock, []);
    groups.get(stock)!.push(item);
  }

  return Array.from(groups.entries()).map(([stock, articles]) => {
    // Dominant sentiment in group
    const sentiments = articles.map((a) =>
      mapSentiment(a.sentiment ?? "NEUTRAL")
    );
    const posCount = sentiments.filter((s) => s === "positive").length;
    const negCount = sentiments.filter((s) => s === "negative").length;
    const impact: Sentiment =
      posCount > negCount
        ? "positive"
        : negCount > posCount
          ? "negative"
          : "neutral";

    // Average relevance
    const avgRelevance =
      articles.reduce((sum, a) => sum + a.relevance_score, 0) /
      articles.length;

    // Highest-relevance headline
    const topArticle = articles.reduce((best, a) =>
      a.relevance_score > best.relevance_score ? a : best
    );

    return {
      stock,
      impact,
      relevance: `Relevance: ${Math.round(avgRelevance * 100)}%`,
      reason: articles.map((a) => a.summary).join(" "),
      news: topArticle.headline,
      confidence: Math.round(avgRelevance * 100),
    };
  });
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
            <div className="w-11 h-11 rounded-xl bg-white/10" />
            <div className="flex-1 space-y-3">
              <div className="h-5 bg-white/10 rounded w-1/3" />
              <div className="h-4 bg-white/10 rounded w-2/3" />
              <div className="h-3 bg-white/10 rounded w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TodaysSummary() {
  const { dashboard, status, isStale, lastFetchedAt } = useIntelligenceData();

  const stockGroups = useMemo(() => {
    const directNews =
      dashboard?.data?.digest?.sections?.direct_news ?? [];
    return groupByStock(directNews);
  }, [dashboard]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Today&apos;s Summary</h3>
        {isStale && <StaleDataBadge lastFetchedAt={lastFetchedAt} />}
      </div>

      {status === "loading" && !dashboard ? (
        <LoadingSkeleton />
      ) : stockGroups.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">
          No news data available for your portfolio today
        </p>
      ) : (
        <div className="space-y-4">
          {stockGroups.map((item, index) => {
            const Icon = getImpactIcon(item.impact);
            return (
              <div
                key={item.stock}
                className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-colors duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10">
                    <Icon
                      className={`w-5 h-5 ${getImpactColor(item.impact)}`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-lg font-medium text-white">
                            {item.stock}
                          </span>
                          <span className={getImpactColor(item.impact)}>
                            {item.relevance}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{item.news}</p>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-xs text-gray-500 mb-1">
                          Confidence
                        </div>
                        <div className="text-sm text-white">
                          {item.confidence}%
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-300 leading-relaxed line-clamp-2">
                      {item.reason}
                    </p>

                    <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-white/20 to-white/40 rounded-full transition-all duration-700"
                        style={{ width: `${item.confidence}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
