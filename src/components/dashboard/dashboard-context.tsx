"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type PanelType =
  | "summary"
  | "portfolio"
  | "sector"
  | "stock"
  | "comparison"
  | "impact";

interface DashboardContextType {
  activePanel: PanelType;
  setActivePanel: (panel: PanelType) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [activePanel, setActivePanel] = useState<PanelType>("summary");

  return (
    <DashboardContext.Provider value={{ activePanel, setActivePanel }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
