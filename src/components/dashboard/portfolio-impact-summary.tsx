"use client";

import { motion } from "motion/react";
import { portfolioSummary } from "@/lib/mock-data/summaries";

export function PortfolioImpactSummary() {
  return (
    <motion.div
      className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-lg font-medium mb-6">Portfolio Impact Summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <div className="text-sm text-gray-400 mb-1">Net Impact</div>
          <div className="text-3xl font-medium text-white">
            {portfolioSummary.netImpact}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-400 mb-1">News Analyzed</div>
          <div className="text-3xl font-medium text-white">
            {portfolioSummary.newsAnalyzed}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-400 mb-1">Avg. Confidence</div>
          <div className="text-3xl font-medium text-white">
            {portfolioSummary.avgConfidence}%
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-400 mb-1">Top Mover</div>
          <div className="text-3xl font-medium text-white">
            {portfolioSummary.topMover}
            <span className="text-lg ml-2 text-white/60">
              {portfolioSummary.topMoverChange}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
