"use client";

import { motion } from "motion/react";
import { Brain, TrendingUp, TrendingDown, Activity, Sparkles } from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  PolarRadiusAxis,
} from "recharts";

interface AnalysisFactor {
  name: string;
  value: number;
}

interface StockAnalysis {
  stock: string;
  news: string;
  directImpact: number;
  sectorImpact: number;
  marketImpact: number;
  timeframe: "Short-term" | "Medium-term" | "Long-term";
  confidence: number;
  factors: AnalysisFactor[];
}

const analysisData: StockAnalysis[] = [
  {
    stock: "NVDA",
    news: "Next-generation AI accelerator announcement",
    directImpact: 8.5,
    sectorImpact: 7.2,
    marketImpact: 6.8,
    timeframe: "Short-term",
    confidence: 94,
    factors: [
      { name: "Product Innovation", value: 95 },
      { name: "Market Demand", value: 88 },
      { name: "Competition", value: 72 },
      { name: "Pricing Power", value: 85 },
      { name: "Supply Chain", value: 78 },
      { name: "Regulatory", value: 65 },
    ],
  },
  {
    stock: "TSLA",
    news: "European delivery shortfall announcement",
    directImpact: -6.2,
    sectorImpact: -3.5,
    marketImpact: -2.1,
    timeframe: "Medium-term",
    confidence: 88,
    factors: [
      { name: "Product Innovation", value: 70 },
      { name: "Market Demand", value: 55 },
      { name: "Competition", value: 82 },
      { name: "Pricing Power", value: 60 },
      { name: "Supply Chain", value: 48 },
      { name: "Regulatory", value: 52 },
    ],
  },
  {
    stock: "MSFT",
    news: "Azure revenue growth exceeds projections",
    directImpact: 7.1,
    sectorImpact: 5.8,
    marketImpact: 4.2,
    timeframe: "Long-term",
    confidence: 91,
    factors: [
      { name: "Product Innovation", value: 82 },
      { name: "Market Demand", value: 90 },
      { name: "Competition", value: 68 },
      { name: "Pricing Power", value: 88 },
      { name: "Supply Chain", value: 85 },
      { name: "Regulatory", value: 72 },
    ],
  },
];

function ImpactBar({
  label,
  value,
  delay,
}: {
  label: string;
  value: number;
  delay: number;
}) {
  const isPositive = value >= 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">{label}</span>
        <div className="flex items-center gap-2">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-hm-candle-green" />
          ) : (
            <TrendingDown className="w-4 h-4 text-hm-candle-red" />
          )}
          <span
            className={`text-sm ${isPositive ? "text-hm-candle-green" : "text-hm-candle-red"}`}
          >
            {isPositive ? "+" : ""}
            {value.toFixed(1)}/10
          </span>
        </div>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            isPositive
              ? "bg-gradient-to-r from-hm-candle-green/40 to-hm-candle-green/60"
              : "bg-gradient-to-r from-hm-candle-red/40 to-hm-candle-red/60"
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.abs(value) * 10}%` }}
          transition={{ duration: 1, delay }}
        />
      </div>
    </div>
  );
}

function AnalysisCard({
  analysis,
  index,
}: {
  analysis: StockAnalysis;
  index: number;
}) {
  const isPositive = analysis.directImpact >= 0;

  return (
    <motion.div
      className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-xl font-medium">{analysis.stock}</h4>
            <span
              className={`text-xs px-3 py-1 rounded-lg border ${
                analysis.timeframe === "Short-term"
                  ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                  : analysis.timeframe === "Medium-term"
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                    : "bg-purple-500/10 border-purple-500/30 text-purple-400"
              }`}
            >
              {analysis.timeframe}
            </span>
          </div>
          <p className="text-sm text-gray-400">{analysis.news}</p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20">
          <Brain className="w-4 h-4 text-white/80" />
          <span className="text-sm">{analysis.confidence}% confidence</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Impact Scores */}
        <div className="space-y-4">
          <h5 className="text-sm text-gray-400 mb-4">Impact Scores</h5>

          <div className="space-y-4">
            <ImpactBar
              label="Direct Impact"
              value={analysis.directImpact}
              delay={0.3 + index * 0.15}
            />
            <ImpactBar
              label="Sector Correlation"
              value={analysis.sectorImpact}
              delay={0.4 + index * 0.15}
            />
            <ImpactBar
              label="Market Influence"
              value={analysis.marketImpact}
              delay={0.5 + index * 0.15}
            />
          </div>
        </div>

        {/* Radar Chart */}
        <div>
          <h5 className="text-sm text-gray-400 mb-4">Factor Analysis</h5>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={analysis.factors}>
                <PolarGrid stroke="rgba(255, 255, 255, 0.1)" />
                <PolarAngleAxis
                  dataKey="name"
                  tick={{ fill: "rgba(255, 255, 255, 0.5)", fontSize: 10 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: "rgba(255, 255, 255, 0.3)", fontSize: 9 }}
                />
                <Radar
                  name="Impact Factors"
                  dataKey="value"
                  stroke={isPositive ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)"}
                  fill={isPositive ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"}
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <motion.div
        className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 + index * 0.15 }}
      >
        <div className="flex items-start gap-3">
          <Activity className="w-5 h-5 text-white/60 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="text-sm font-medium mb-2">Neural Engine Insight</h5>
            <p className="text-sm text-gray-400 leading-relaxed">
              {isPositive
                ? `Strong positive signals detected across multiple indicators. The knowledge graph identifies high correlation with historical similar events, suggesting sustained momentum. Recommended action: Monitor for profit-taking opportunities at key resistance levels.`
                : `Analysis reveals structural challenges that may persist into Q1. The knowledge graph connects this event to broader sector headwinds. Recommended action: Consider rebalancing or defensive positioning until sentiment stabilizes.`}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ImpactAnalysisPanel() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="mb-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-white/80" />
          <h3 className="text-lg font-medium">Neural Impact Analysis</h3>
        </div>
        <p className="text-sm text-gray-400">
          Deep learning analysis of how news events affect your holdings across
          multiple dimensions
        </p>
      </motion.div>

      {/* Analysis Cards */}
      {analysisData.map((analysis, index) => (
        <AnalysisCard key={analysis.stock} analysis={analysis} index={index} />
      ))}
    </div>
  );
}
