"use client";

import { motion } from "motion/react";
import { Brain } from "lucide-react";
import { useIntelligenceData } from "./intelligence-data-provider";
import { StaleDataBadge } from "./stale-data-badge";
import { mapSignalType } from "@/lib/intelligence/mappers";
import { useMemo } from "react";

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-full" />
      <div className="h-4 bg-white/10 rounded w-5/6" />
      <div className="h-4 bg-white/10 rounded w-full" />
      <div className="h-4 bg-white/10 rounded w-4/6" />
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="h-4 bg-white/10 rounded w-1/3 mb-2" />
        <div className="h-3 bg-white/10 rounded w-full" />
      </div>
    </div>
  );
}

export function PortfolioOverview() {
  const { dashboard, signals, status, isStale, lastFetchedAt } =
    useIntelligenceData();

  const content = useMemo(() => {
    const narratives = dashboard?.data?.narratives ?? [];
    const stories =
      dashboard?.data?.digest?.sections?.developing_stories ?? [];
    const alerts = dashboard?.data?.alerts ?? [];
    const summary = signals?.data?.portfolio_summary;

    // Build summary text
    const storyCount = stories.length + narratives.length;
    const topNarrative = narratives[0];
    const summaryText =
      storyCount > 0
        ? `${storyCount} developing ${storyCount === 1 ? "story" : "stories"} across your holdings.${
            topNarrative
              ? ` Top: "${topNarrative.title}" affecting ${topNarrative.primary_ticker}.`
              : ""
          }`
        : "No developing stories detected for your portfolio today.";

    // Build analysis from top narratives
    const analysisItems = narratives.slice(0, 3).map((n) => {
      const trajectory =
        n.sentiment_trajectory === "improving"
          ? "trending positively"
          : n.sentiment_trajectory === "worsening"
            ? "trending negatively"
            : "holding steady";
      return `"${n.title}" (${n.primary_ticker}) — ${trajectory}, ${n.article_count} articles, status: ${n.status}.`;
    });
    const analysisText =
      analysisItems.length > 0
        ? analysisItems.join(" ")
        : "No notable story arcs detected.";

    // Build risk text
    const topAlert = alerts[0];
    const riskText =
      topAlert
        ? `${alerts.length} risk alert${alerts.length !== 1 ? "s" : ""}. Top: ${topAlert.cause_description} (severity: ${topAlert.severity_tier}).`
        : "No active risk alerts for your portfolio.";

    // Build intelligence summary
    const sentimentLabel =
      summary && summary.net_sentiment > 0.2
        ? "positive"
        : summary && summary.net_sentiment < -0.2
          ? "negative"
          : "neutral";
    const intelligenceText = summary
      ? `Portfolio sentiment is ${sentimentLabel} with ${mapSignalType(summary.top_opportunity)} as the dominant opportunity signal and ${mapSignalType(summary.top_risk)} as the primary risk factor.`
      : "Intelligence summary unavailable.";

    return { summaryText, analysisText, riskText, intelligenceText };
  }, [dashboard, signals]);

  return (
    <motion.div
      className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Total Portfolio Overview</h3>
        {isStale && <StaleDataBadge lastFetchedAt={lastFetchedAt} />}
      </div>

      {status === "loading" && !dashboard ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-300 leading-relaxed">
            {content.summaryText}
          </p>

          <p className="text-sm text-gray-300 leading-relaxed">
            <span className="text-white font-medium">Story Analysis:</span>{" "}
            {content.analysisText}
          </p>

          <p className="text-sm text-gray-300 leading-relaxed">
            <span className="text-white font-medium">Risk Assessment:</span>{" "}
            {content.riskText}
          </p>

          <div className="flex items-start gap-3 mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <Brain className="w-5 h-5 text-white/60 flex-shrink-0 mt-1" />
            <div>
              <div className="text-sm font-medium mb-1 text-white">
                Intelligence Summary
              </div>
              <p className="text-sm text-gray-400">
                {content.intelligenceText}
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
