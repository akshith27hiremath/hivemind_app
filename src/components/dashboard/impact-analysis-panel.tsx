"use client";

import { motion, AnimatePresence } from "motion/react";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Clock,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  PolarRadiusAxis,
} from "recharts";
import { useIntelligenceData } from "./intelligence-data-provider";
import { StaleDataBadge } from "./stale-data-badge";
import { mapSignalType, mapSentiment, mapMagnitude, toRelativeTime } from "@/lib/intelligence/mappers";
import { ArticleHeadline } from "@/components/ui/article-headline";
import type {
  SignalAggregationResponse,
  SignalTypeAggregate,
  HoldingSignalSummary,
  Sentiment,
} from "@/lib/intelligence/types";

type TabId = "radar" | "heatmap" | "timeline";
type DayRange = 7 | 14 | 30;

// === Loading skeleton ===

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-64 rounded-2xl bg-white/5 border border-white/10" />
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-white/5 border border-white/10" />
        ))}
      </div>
    </div>
  );
}

// === Tab 1: Signal Radar ===

function SignalRadarTab({
  signals,
}: {
  signals: SignalAggregationResponse;
}) {
  const byType = signals.data.by_signal_type;
  const summary = signals.data.portfolio_summary;
  const entries = Object.entries(byType);

  if (entries.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>No signal data available for this period</p>
      </div>
    );
  }

  // Compute radar data: value = positive*1.0 + neutral*0.5 - negative*0.5, normalized 0-100
  const radarData = entries.map(([type, agg]) => {
    const raw = agg.positive * 1.0 + agg.neutral * 0.5 - agg.negative * 0.5;
    const maxPossible = agg.article_count || 1;
    const normalized = Math.max(0, Math.min(100, ((raw / maxPossible) * 50) + 50));
    return {
      name: mapSignalType(type),
      value: Math.round(normalized),
      articles: agg.article_count,
    };
  });

  const isPositive = summary.net_sentiment > 0;

  return (
    <div>
      {/* Radar Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="rgba(255, 255, 255, 0.1)" />
            <PolarAngleAxis
              dataKey="name"
              tick={{ fill: "rgba(255, 255, 255, 0.5)", fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "rgba(255, 255, 255, 0.3)", fontSize: 9 }}
            />
            <Radar
              name="Signal Strength"
              dataKey="value"
              stroke={isPositive ? "rgba(34, 197, 94, 0.7)" : "rgba(239, 68, 68, 0.7)"}
              fill={isPositive ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"}
              fillOpacity={0.6}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="text-xs text-gray-400 mb-1">Articles Analyzed</div>
          <div className="text-lg font-medium">{summary.total_articles_analyzed}</div>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="text-xs text-gray-400 mb-1">Net Sentiment</div>
          <div className={`text-lg font-medium ${isPositive ? "text-hm-candle-green" : summary.net_sentiment < 0 ? "text-hm-candle-red" : "text-gray-400"}`}>
            {summary.net_sentiment > 0 ? "+" : ""}{summary.net_sentiment.toFixed(2)}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="text-xs text-gray-400 mb-1">Top Opportunity</div>
          <div className="text-sm font-medium text-hm-candle-green">
            {mapSignalType(summary.top_opportunity)}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="text-xs text-gray-400 mb-1">Top Risk</div>
          <div className="text-sm font-medium text-hm-candle-red">
            {mapSignalType(summary.top_risk)}
          </div>
        </div>
      </div>
    </div>
  );
}

// === Tab 2: Signal Heatmap ===

function getSentimentColor(netSentiment: number): string {
  if (netSentiment > 0.3) return "bg-green-500/40 text-green-300";
  if (netSentiment > 0) return "bg-green-500/20 text-green-400";
  if (netSentiment < -0.3) return "bg-red-500/40 text-red-300";
  if (netSentiment < 0) return "bg-red-500/20 text-red-400";
  return "bg-white/5 text-gray-500";
}

function SignalHeatmapTab({
  signals,
}: {
  signals: SignalAggregationResponse;
}) {
  const byHolding = signals.data.by_holding;
  const byType = signals.data.by_signal_type;
  const holdings = Object.keys(byHolding).sort();
  const signalTypes = Object.keys(byType).sort();

  if (holdings.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>No holdings data available for heatmap</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Heatmap Grid */}
      <div className="min-w-[600px]">
        {/* Header row */}
        <div
          className="grid gap-1 mb-1"
          style={{ gridTemplateColumns: `100px repeat(${signalTypes.length}, 1fr)` }}
        >
          <div className="text-xs text-gray-500 p-2" />
          {signalTypes.map((type) => (
            <div key={type} className="text-xs text-gray-400 p-2 text-center truncate">
              {mapSignalType(type)}
            </div>
          ))}
        </div>

        {/* Data rows */}
        {holdings.map((ticker) => {
          const holdingData = byHolding[ticker]!;
          return (
            <div
              key={ticker}
              className="grid gap-1 mb-1"
              style={{ gridTemplateColumns: `100px repeat(${signalTypes.length}, 1fr)` }}
            >
              <div className="text-sm font-medium p-2 flex items-center">
                {ticker}
              </div>
              {signalTypes.map((type) => {
                // Check if this holding is affected by this signal type
                const typeData = byType[type]!;
                const isAffected = typeData.affected_holdings.includes(ticker);
                if (!isAffected) {
                  return (
                    <div
                      key={type}
                      className="rounded-lg bg-white/[0.02] border border-white/5 p-2 text-center"
                    >
                      <span className="text-xs text-gray-600">-</span>
                    </div>
                  );
                }

                // Compute net sentiment for this cell
                const total = typeData.positive + typeData.negative + typeData.neutral;
                const net = total > 0
                  ? (typeData.positive - typeData.negative) / total
                  : 0;

                return (
                  <div
                    key={type}
                    className={`rounded-lg border border-white/5 p-2 text-center ${getSentimentColor(net)}`}
                  >
                    <span className="text-xs font-medium">
                      {typeData.article_count}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Per-holding summary */}
      <div className="mt-6 space-y-2">
        <h4 className="text-sm text-gray-400 mb-3">Holdings Summary</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {holdings.map((ticker) => {
            const data = byHolding[ticker]!;
            return (
              <div
                key={ticker}
                className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-medium">{ticker}</div>
                  <div className="text-xs text-gray-400">
                    {data.total_articles} articles | {mapSignalType(data.dominant_signal)}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-hm-candle-green">{data.opportunity_signals} opp</span>
                  <span className="text-gray-500">/</span>
                  <span className="text-hm-candle-red">{data.risk_signals} risk</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// === Tab 3: Signal Timeline ===

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

interface TimelineEntry {
  id: number;
  headline: string;
  summary: string;
  affectedHoldings: string[];
  sentiment: Sentiment;
  signalType: string;
  time: string;
  source: string;
  isAlert: boolean;
}

function SignalTimelineTab({
  signals,
  dashboard,
}: {
  signals: SignalAggregationResponse;
  dashboard: NonNullable<ReturnType<typeof useIntelligenceData>["dashboard"]>;
}) {
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  // Combine direct_news + top-level alerts into timeline entries
  const entries: TimelineEntry[] = [];

  const directNews = dashboard.data?.digest?.sections?.direct_news ?? [];
  for (const item of directNews) {
    entries.push({
      id: item.article_id,
      headline: item.headline,
      summary: item.summary,
      affectedHoldings: item.affected_holdings,
      sentiment: mapSentiment(item.sentiment ?? "NEUTRAL"),
      signalType: item.signal_type ?? "GENERAL_NEWS",
      time: toRelativeTime(item.published_at ?? null),
      source: item.source ?? "Intelligence",
      isAlert: false,
    });
  }

  // Use top-level alerts (RiskAlert shape) rather than digest risk_alerts
  const riskAlerts = dashboard.data?.alerts ?? [];
  for (const alert of riskAlerts) {
    entries.push({
      id: alert.trigger_article_id,
      headline: alert.trigger_headline,
      summary: alert.explanation,
      affectedHoldings: alert.affected_holdings,
      sentiment: "negative",
      signalType: alert.correlation_type ?? "GENERAL_NEWS",
      time: "",
      source: "Risk Alert",
      isAlert: true,
    });
  }

  // Group by signal type
  const grouped = entries.reduce(
    (acc, entry) => {
      if (!acc[entry.signalType]) acc[entry.signalType] = [];
      acc[entry.signalType]!.push(entry);
      return acc;
    },
    {} as Record<string, TimelineEntry[]>
  );

  const toggleType = (type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  if (entries.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>No timeline events available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Object.entries(grouped).map(([type, items]) => {
        const isExpanded = expandedTypes.has(type);
        return (
          <div key={type} className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
            {/* Group header */}
            <button
              onClick={() => toggleType(type)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                />
                <span className="text-sm font-medium">{mapSignalType(type)}</span>
                <span className="text-xs text-gray-500">
                  {items.length} {items.length === 1 ? "event" : "events"}
                </span>
              </div>
              {items.some((i) => i.isAlert) && (
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
              )}
            </button>

            {/* Expanded items */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3 space-y-2">
                    {items.map((item) => (
                      <div
                        key={`${item.id}-${item.isAlert}`}
                        className={`p-3 rounded-lg ${item.isAlert ? "bg-red-500/10 border border-red-500/20" : "bg-white/[0.03] border border-white/5"}`}
                      >
                        <div className="flex items-start gap-3">
                          {getSentimentIcon(item.sentiment)}
                          <div className="flex-1 min-w-0">
                            <ArticleHeadline
                              articleId={item.id}
                              className="text-sm font-medium line-clamp-1"
                            >
                              {item.headline}
                            </ArticleHeadline>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                              {item.summary}
                            </p>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {item.time}
                              </div>
                              <span className="text-xs text-gray-500">{item.source}</span>
                              {item.affectedHoldings.slice(0, 3).map((h) => (
                                <span
                                  key={h}
                                  className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-gray-300"
                                >
                                  {h}
                                </span>
                              ))}
                              {item.affectedHoldings.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{item.affectedHoldings.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// === Main Panel ===

export function ImpactAnalysisPanel() {
  const { dashboard, signals: contextSignals, selectedPortfolioId, isStale, lastFetchedAt } =
    useIntelligenceData();
  const [activeTab, setActiveTab] = useState<TabId>("radar");
  const [days, setDays] = useState<DayRange>(7);
  const [signals, setSignals] = useState<SignalAggregationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSignals = useCallback(
    async (dayRange: DayRange) => {
      if (!selectedPortfolioId) return;
      try {
        setLoading(true);
        const res = await fetch(
          `/api/intelligence/signals/aggregate?portfolioId=${selectedPortfolioId}&days=${dayRange}`
        );
        if (!res.ok) return;
        const data = await res.json();
        setSignals(data);
      } catch {
        // Fall back to context signals
        if (contextSignals) setSignals(contextSignals);
      } finally {
        setLoading(false);
      }
    },
    [selectedPortfolioId, contextSignals]
  );

  // Use context signals for default 7-day, fetch custom for other ranges
  useEffect(() => {
    if (days === 7 && contextSignals) {
      setSignals(contextSignals);
      setLoading(false);
    } else {
      fetchSignals(days);
    }
  }, [days, contextSignals, fetchSignals]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "radar", label: "Signal Radar" },
    { id: "heatmap", label: "Signal Heatmap" },
    { id: "timeline", label: "Signal Timeline" },
  ];

  const dayOptions: DayRange[] = [7, 14, 30];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-white/80" />
              <h3 className="text-lg font-medium">Signal Analysis</h3>
            </div>
            <p className="text-sm text-gray-400">
              Signal patterns across your portfolio over the last {days} days
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isStale && <StaleDataBadge lastFetchedAt={lastFetchedAt} />}

            {/* Days selector */}
            <div className="flex items-center rounded-xl bg-white/5 border border-white/10 p-0.5">
              {dayOptions.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    days === d
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:text-white/70"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:text-white/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab Content */}
      {loading && !signals ? (
        <LoadingSkeleton />
      ) : !signals ? (
        <div className="p-8 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 text-center">
          <p className="text-gray-400">
            No signal data available. Make sure you have holdings in your portfolio.
          </p>
        </div>
      ) : (
        <motion.div
          key={activeTab}
          className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === "radar" && <SignalRadarTab signals={signals} />}
          {activeTab === "heatmap" && <SignalHeatmapTab signals={signals} />}
          {activeTab === "timeline" && dashboard && (
            <SignalTimelineTab signals={signals} dashboard={dashboard} />
          )}
          {activeTab === "timeline" && !dashboard && (
            <div className="p-8 text-center text-gray-400">
              <p>Dashboard data loading...</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
