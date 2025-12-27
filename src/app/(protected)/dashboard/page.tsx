"use client";

import { motion } from "motion/react";
import {
  useDashboard,
  PortfolioImpactSummary,
  PortfolioOverview,
  TodaysSummary,
  CriticalNews,
  SectorNewsPanel,
  StockNewsPanel,
} from "@/components/dashboard";

// Summary Panel - Today's Intelligence Summary
function SummaryPanel() {
  return (
    <div className="space-y-6">
      <PortfolioImpactSummary />
      <PortfolioOverview />
      <CriticalNews />
      <TodaysSummary />
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
      {activePanel === "sector" && <SectorNewsPanel />}
      {activePanel === "stock" && <StockNewsPanel />}
      {activePanel === "comparison" && <PlaceholderPanel title="Stock Screener" />}
      {activePanel === "impact" && <PlaceholderPanel title="Impact Analysis" />}
    </>
  );
}
