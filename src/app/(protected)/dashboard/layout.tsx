"use client";

import { Sidebar, DashboardHeader, DashboardProvider } from "@/components/dashboard";
import { IntelligenceDataProvider } from "@/components/dashboard/intelligence-data-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <IntelligenceDataProvider>
    <DashboardProvider>
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        {/* Background */}
        <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950" />

        {/* Subtle animated gradient */}
        <div className="fixed top-0 right-0 w-1/2 h-1/2 bg-white/[0.02] rounded-full blur-3xl pointer-events-none animate-[pulse-bg_8s_ease-in-out_infinite]" />

        <div className="relative z-10 flex h-screen">
          {/* Sidebar */}
          <Sidebar />

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <DashboardHeader />

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <div className="p-6">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardProvider>
    </IntelligenceDataProvider>
  );
}
