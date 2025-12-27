import { motion } from "motion/react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function TodaySummary() {
  const summaryItems = [
    {
      id: 1,
      stock: "NVDA",
      impact: "positive",
      change: "+3.2%",
      reason: "New AI chip announcement drives strong market sentiment. Analyst upgrades from multiple firms.",
      news: "Breakthrough AI chip architecture revealed at tech conference",
      confidence: 94,
    },
    {
      id: 2,
      stock: "AAPL",
      impact: "neutral",
      change: "+0.1%",
      reason: "Minor supply chain updates with minimal impact. Market consolidation continues.",
      news: "Supplier diversification in Asian markets",
      confidence: 67,
    },
    {
      id: 3,
      stock: "TSLA",
      impact: "negative",
      change: "-1.8%",
      reason: "European delivery numbers below analyst expectations. Regulatory headwinds in key markets.",
      news: "Q4 European deliveries miss estimates by 12%",
      confidence: 88,
    },
    {
      id: 4,
      stock: "MSFT",
      impact: "positive",
      change: "+2.1%",
      reason: "Azure cloud growth exceeds projections. Enterprise AI adoption accelerating faster than expected.",
      news: "Azure revenue up 31% YoY; AI services adoption surges",
      confidence: 91,
    },
  ];

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "positive":
        return TrendingUp;
      case "negative":
        return TrendingDown;
      default:
        return Minus;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "positive":
        return "text-white/80";
      case "negative":
        return "text-white/80";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div>
      <h3 className="text-lg mb-4">Today's Summary</h3>
      <div className="space-y-4">
        {summaryItems.map((item) => {
          const Icon = getImpactIcon(item.impact);
          return (
            <div
              key={item.id}
              className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10">
                  <Icon className={`w-5 h-5 ${getImpactColor(item.impact)}`} />
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-lg">{item.stock}</span>
                        <span className={getImpactColor(item.impact)}>{item.change}</span>
                      </div>
                      <p className="text-sm text-gray-400">{item.news}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">Confidence</div>
                      <div className="text-sm">{item.confidence}%</div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-300 leading-relaxed">{item.reason}</p>

                  {/* Confidence bar */}
                  <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-white/20 to-white/40 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${item.confidence}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}