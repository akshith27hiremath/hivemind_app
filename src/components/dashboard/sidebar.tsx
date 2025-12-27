"use client";

import { motion } from "motion/react";
import {
  FileText,
  Briefcase,
  TrendingUp,
  BarChart3,
  GitCompare,
  Brain,
  Settings,
  LogOut,
} from "lucide-react";
import { GlassButton } from "./glass-button";
import { useUser, useClerk } from "@clerk/nextjs";
import { useDashboard, type PanelType } from "./dashboard-context";

const navigationItems: { icon: typeof FileText; label: string; panel: PanelType }[] = [
  { icon: FileText, label: "Today's Summary", panel: "summary" },
  { icon: Briefcase, label: "Portfolio Manager", panel: "portfolio" },
  { icon: TrendingUp, label: "Sector News", panel: "sector" },
  { icon: BarChart3, label: "Stock News", panel: "stock" },
  { icon: GitCompare, label: "Stock Screener", panel: "comparison" },
  { icon: Brain, label: "Impact Analysis", panel: "impact" },
];

export function Sidebar() {
  const { activePanel, setActivePanel } = useDashboard();
  const { user } = useUser();
  const { signOut } = useClerk();

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.firstName?.[0] || "U";

  return (
    <motion.div
      className="w-64 p-6 border-r border-white/10 flex flex-col bg-hm-sidebar/50 backdrop-blur-xl"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 mb-12">
        <span className="text-xl font-semibold tracking-tight text-white">
          Hivemind
        </span>
      </div>

      {/* Navigation */}
      <div className="space-y-3 flex-1">
        {navigationItems.map((item) => (
          <GlassButton
            key={item.panel}
            icon={item.icon}
            label={item.label}
            onClick={() => setActivePanel(item.panel)}
            isActive={activePanel === item.panel}
          />
        ))}
      </div>

      {/* User Profile */}
      <motion.div
        className="mt-auto p-4 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center text-white font-medium">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white truncate">
              {user?.firstName || "User"}
            </div>
            <div className="text-xs text-gray-400">Pro Plan</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
          <button
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs text-gray-400 hover:text-white"
            onClick={() => window.location.href = "/settings"}
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs text-gray-400 hover:text-white"
            onClick={() => signOut()}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
