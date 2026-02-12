"use client";

import { motion } from "motion/react";
import { Bell } from "lucide-react";
import { useDashboard, type PanelType } from "./dashboard-context";
import { PortfolioSelector } from "./portfolio-selector";
import { useIntelligenceData } from "./intelligence-data-provider";
import { useMemo, useState, useEffect } from "react";

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
  const { dashboard } = useIntelligenceData();

  // Defer date to client-only to avoid server/client timezone hydration mismatch
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  // Count unread alerts based on localStorage last-seen timestamp
  const unreadCount = useMemo(() => {
    const alerts = dashboard?.data?.alert_history;
    if (!alerts || alerts.length === 0) return 0;

    const lastSeen = typeof window !== "undefined"
      ? localStorage.getItem("hivemind_lastSeenAlerts")
      : null;

    if (!lastSeen) return alerts.length;

    const lastSeenTime = new Date(lastSeen).getTime();
    return alerts.filter(
      (a) => new Date(a.triggered_at).getTime() > lastSeenTime
    ).length;
  }, [dashboard?.data?.alert_history]);

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

      <div className="flex items-center gap-3">
        <PortfolioSelector />

        <button
          className="p-3 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-200 relative"
          onClick={() => {
            if (typeof window !== "undefined") {
              localStorage.setItem(
                "hivemind_lastSeenAlerts",
                new Date().toISOString()
              );
            }
          }}
        >
          <Bell className="w-5 h-5 text-white" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </motion.div>
  );
}
