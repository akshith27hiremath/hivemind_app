"use client";

import { motion } from "motion/react";
import { Brain } from "lucide-react";
import { portfolioOverview } from "@/lib/mock-data/summaries";

export function PortfolioOverview() {
  return (
    <motion.div
      className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <h3 className="text-lg font-medium mb-4">Total Portfolio Overview</h3>
      <div className="space-y-4">
        <p className="text-sm text-gray-300 leading-relaxed">
          Your portfolio is experiencing{" "}
          <span className="text-white font-medium">
            strong positive momentum
          </span>{" "}
          {portfolioOverview.summary.split("strong positive momentum")[1]}
        </p>

        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="text-white font-medium">Critical News Analysis:</span>{" "}
          {portfolioOverview.analysis}
        </p>

        <p className="text-sm text-gray-300 leading-relaxed">
          {portfolioOverview.riskFactors.split("moderate risk factor")[0]}
          <span className="text-white font-medium">moderate risk factor</span>
          {portfolioOverview.riskFactors.split("moderate risk factor")[1]}
        </p>

        {/* Neural Engine Recommendation */}
        <div className="flex items-start gap-3 mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
          <Brain className="w-5 h-5 text-white/60 flex-shrink-0 mt-1" />
          <div>
            <div className="text-sm font-medium mb-1 text-white">
              Neural Engine Recommendation
            </div>
            <p className="text-sm text-gray-400">
              {portfolioOverview.recommendation}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
