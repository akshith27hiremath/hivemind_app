"use client";

import { motion } from "motion/react";
import { Bell } from "lucide-react";
import { useDashboard, type PanelType } from "./dashboard-context";

const panelTitles: Record<PanelType, string> = {
  summary: "Today's Intelligence Summary",
  portfolio: "Portfolio Manager",
  sector: "Sector News Feed",
  stock: "Stock News Feed",
  comparison: "Stock Screener",
  impact: "Impact Analysis",
};

export function DashboardHeader() {
  const { activePanel } = useDashboard();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <motion.div
      className="p-6 border-b border-white/10 flex items-center justify-between"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h1 className="text-2xl font-medium text-white mb-1">
          {panelTitles[activePanel]}
        </h1>
        <p className="text-sm text-gray-400">{today}</p>
      </div>

      <motion.button
        className="p-3 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all relative"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Bell className="w-5 h-5 text-white" />
        <span className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full" />
      </motion.button>
    </motion.div>
  );
}
