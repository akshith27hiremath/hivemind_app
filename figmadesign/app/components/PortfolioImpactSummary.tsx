import { motion } from "motion/react";

export function PortfolioImpactSummary() {
  return (
    <motion.div
      className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-lg mb-6">Portfolio Impact Summary</h3>
      <div className="grid grid-cols-3 gap-6">
        <div>
          <div className="text-sm text-gray-400 mb-1">Net Impact</div>
          <div className="text-3xl">+1.4%</div>
        </div>
        <div>
          <div className="text-sm text-gray-400 mb-1">News Items Analyzed</div>
          <div className="text-3xl">127</div>
        </div>
        <div>
          <div className="text-sm text-gray-400 mb-1">Avg. Confidence</div>
          <div className="text-3xl">85%</div>
        </div>
      </div>
    </motion.div>
  );
}
