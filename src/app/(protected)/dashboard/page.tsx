"use client";

import { motion } from "motion/react";
import { useDashboard } from "@/components/dashboard";
import { Brain } from "lucide-react";

// Placeholder panels - will be replaced with actual components in later phases
function SummaryPanel() {
  return (
    <div className="space-y-6">
      {/* Portfolio Impact Summary */}
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
            <div className="text-3xl font-medium">+1.4%</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">News Items Analyzed</div>
            <div className="text-3xl font-medium">127</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Avg. Confidence</div>
            <div className="text-3xl font-medium">85%</div>
          </div>
        </div>
      </motion.div>

      {/* Placeholder for more content */}
      <motion.div
        className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-start gap-3">
          <Brain className="w-5 h-5 text-white/60 flex-shrink-0 mt-1" />
          <div>
            <div className="text-sm font-medium mb-1">Neural Engine Active</div>
            <p className="text-sm text-gray-400">
              The dashboard is now using the Figma glassmorphism design.
              Additional panels will be implemented in subsequent phases.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PlaceholderPanel({ title }: { title: string }) {
  return (
    <motion.div
      className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-lg mb-4">{title}</h3>
      <p className="text-sm text-gray-400">
        This panel will be implemented in a future phase.
      </p>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { activePanel } = useDashboard();

  return (
    <>
      {activePanel === "summary" && <SummaryPanel />}
      {activePanel === "portfolio" && <PlaceholderPanel title="Portfolio Manager" />}
      {activePanel === "sector" && <PlaceholderPanel title="Sector News" />}
      {activePanel === "stock" && <PlaceholderPanel title="Stock News" />}
      {activePanel === "comparison" && <PlaceholderPanel title="Stock Screener" />}
      {activePanel === "impact" && <PlaceholderPanel title="Impact Analysis" />}
    </>
  );
}
