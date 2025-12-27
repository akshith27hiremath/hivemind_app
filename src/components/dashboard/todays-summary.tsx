"use client";

import { motion } from "motion/react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  summaryItems,
  type SummaryItem,
} from "@/lib/mock-data/summaries";

function getImpactIcon(impact: SummaryItem["impact"]) {
  switch (impact) {
    case "positive":
      return TrendingUp;
    case "negative":
      return TrendingDown;
    default:
      return Minus;
  }
}

function getImpactColor(impact: SummaryItem["impact"]) {
  switch (impact) {
    case "positive":
      return "text-white/80";
    case "negative":
      return "text-white/80";
    default:
      return "text-gray-400";
  }
}

export function TodaysSummary() {
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Today&apos;s Summary</h3>
      <div className="space-y-4">
        {summaryItems.map((item, index) => {
          const Icon = getImpactIcon(item.impact);
          return (
            <motion.div
              key={item.id}
              className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-colors"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <div className="flex items-start gap-4">
                {/* Impact Icon */}
                <div className="p-3 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10">
                  <Icon className={`w-5 h-5 ${getImpactColor(item.impact)}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-lg font-medium text-white">
                          {item.stock}
                        </span>
                        <span className={getImpactColor(item.impact)}>
                          {item.change}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{item.news}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-xs text-gray-500 mb-1">Confidence</div>
                      <div className="text-sm text-white">{item.confidence}%</div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-300 leading-relaxed">
                    {item.reason}
                  </p>

                  {/* Confidence bar */}
                  <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-white/20 to-white/40 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${item.confidence}%` }}
                      transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
