import { motion } from "motion/react";
import { Brain, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, PolarRadiusAxis } from "recharts";

export function ImpactAnalysisPanel() {
  const analysisData = [
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
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-lg mb-2">Neural Impact Analysis</h3>
        <p className="text-sm text-gray-400">
          Deep learning analysis of how news events affect your holdings across multiple dimensions
        </p>
      </div>

      {analysisData.map((analysis, index) => (
        <motion.div
          key={analysis.stock}
          className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: index * 0.2 }}
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-xl">{analysis.stock}</h4>
                <span className="text-xs px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                  {analysis.timeframe}
                </span>
              </div>
              <p className="text-sm text-gray-400">{analysis.news}</p>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20">
              <Brain className="w-4 h-4" />
              <span className="text-sm">{analysis.confidence}% confidence</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Impact Scores */}
            <div className="space-y-4">
              <h5 className="text-sm text-gray-400 mb-4">Impact Scores</h5>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Direct Impact</span>
                    <div className="flex items-center gap-2">
                      {analysis.directImpact > 0 ? (
                        <TrendingUp className="w-4 h-4 text-white/80" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-white/80" />
                      )}
                      <span className="text-sm">
                        {Math.abs(analysis.directImpact).toFixed(1)}/10
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-white/20 to-white/40 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.abs(analysis.directImpact) * 10}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Sector Correlation</span>
                    <div className="flex items-center gap-2">
                      {analysis.sectorImpact > 0 ? (
                        <TrendingUp className="w-4 h-4 text-white/80" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-white/80" />
                      )}
                      <span className="text-sm">
                        {Math.abs(analysis.sectorImpact).toFixed(1)}/10
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-white/20 to-white/40 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.abs(analysis.sectorImpact) * 10}%` }}
                      transition={{ duration: 1, delay: 0.4 }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Market Influence</span>
                    <div className="flex items-center gap-2">
                      {analysis.marketImpact > 0 ? (
                        <TrendingUp className="w-4 h-4 text-white/80" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-white/80" />
                      )}
                      <span className="text-sm">
                        {Math.abs(analysis.marketImpact).toFixed(1)}/10
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-white/20 to-white/40 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.abs(analysis.marketImpact) * 10}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </div>
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
                      tick={{ fill: "rgba(255, 255, 255, 0.5)", fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: "rgba(255, 255, 255, 0.3)", fontSize: 10 }}
                    />
                    <Radar
                      name="Impact Factors"
                      dataKey="value"
                      stroke="rgba(255, 255, 255, 0.6)"
                      fill="rgba(255, 255, 255, 0.2)"
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
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-start gap-3">
              <Activity className="w-5 h-5 text-white/60 flex-shrink-0 mt-1" />
              <div>
                <h5 className="text-sm mb-2">Neural Engine Insight</h5>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {analysis.directImpact > 0
                    ? `Strong positive signals detected across multiple indicators. The knowledge graph identifies high correlation with historical similar events, suggesting sustained momentum. Recommended action: Monitor for profit-taking opportunities at key resistance levels.`
                    : `Analysis reveals structural challenges that may persist into Q1. The knowledge graph connects this event to broader sector headwinds. Recommended action: Consider rebalancing or defensive positioning until sentiment stabilizes.`}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}