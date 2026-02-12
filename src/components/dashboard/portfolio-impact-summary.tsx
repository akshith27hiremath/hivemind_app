"use client";

import { motion } from "motion/react";
import { useIntelligenceData } from "./intelligence-data-provider";
import { StaleDataBadge } from "./stale-data-badge";
import { mapSignalType } from "@/lib/intelligence/mappers";

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="h-3 bg-white/10 rounded w-20 mb-2" />
          <div className="h-8 bg-white/10 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

export function PortfolioImpactSummary() {
  const { signals, dashboard, status, isStale, lastFetchedAt } =
    useIntelligenceData();

  const summary = signals?.data?.portfolio_summary;
  const alertCount = dashboard?.data?.alerts?.length ?? 0;

  return (
    <motion.div
      className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium">Portfolio Impact Summary</h3>
        {isStale && <StaleDataBadge lastFetchedAt={lastFetchedAt} />}
      </div>

      {status === "loading" && !signals ? (
        <LoadingSkeleton />
      ) : !summary ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          No signal data available
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-400 mb-1">Net Sentiment</div>
            <div className="text-3xl font-medium text-white">
              {summary.net_sentiment > 0 ? "+" : ""}
              {summary.net_sentiment.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Articles Analyzed</div>
            <div className="text-3xl font-medium text-white">
              {summary.total_articles_analyzed}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Signal Types</div>
            <div className="text-3xl font-medium text-white">
              {summary.signal_diversity}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Top Signal</div>
            <div className="text-2xl font-medium text-white">
              {mapSignalType(summary.top_opportunity)}
              {alertCount > 0 && (
                <span className="text-sm ml-2 text-yellow-400/60">
                  {alertCount} alert{alertCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
