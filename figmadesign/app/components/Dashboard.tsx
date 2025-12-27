import { motion } from "motion/react";
import { Brain, Briefcase, TrendingUp, BarChart3, FileText, Bell, GitCompare } from "lucide-react";
import { useState } from "react";
import { GlassButton } from "./GlassButton";
import { StockChart } from "./StockChart";
import { CriticalNews } from "./CriticalNews";
import { TodaySummary } from "./TodaySummary";
import { PortfolioPanel } from "./PortfolioPanel";
import { SectorNewsPanel } from "./SectorNewsPanel";
import { StockNewsPanel } from "./StockNewsPanel";
import { ImpactAnalysisPanel } from "./ImpactAnalysisPanel";
import { PortfolioImpactSummary } from "./PortfolioImpactSummary";
import { NewsSelector, NewsItem } from "./NewsSelector";
import { StockComparison } from "./StockComparison";

type PanelType = "summary" | "portfolio" | "sector" | "stock" | "comparison" | "impact";

// News data for the chart
const newsData: NewsItem[] = [
  {
    id: "1",
    time: "10:30",
    title: "Analyst Upgrade: NVDA to Overweight",
    impact: "high",
    sentiment: "positive",
    description: "Morgan Stanley upgrades NVIDIA citing strong AI chip demand.",
    price: 484.8,
  },
  {
    id: "2",
    time: "13:00",
    title: "New AI Chip Architecture Announced",
    impact: "high",
    sentiment: "positive",
    description: "NVIDIA unveils next-gen GPU architecture with 40% performance boost.",
    price: 493.8,
  },
  {
    id: "3",
    time: "15:30",
    title: "Broad Market Correction",
    impact: "medium",
    sentiment: "negative",
    description: "Tech sector pullback as Fed signals hawkish stance.",
    price: 496.7,
  },
  {
    id: "4",
    time: "11:00",
    title: "Major Cloud Provider Partnership",
    impact: "medium",
    sentiment: "positive",
    description: "AWS announces expanded NVIDIA GPU infrastructure deployment.",
    price: 488.3,
  },
  {
    id: "5",
    time: "14:30",
    title: "Q4 Earnings Preview Released",
    impact: "low",
    sentiment: "neutral",
    description: "Preliminary guidance suggests strong quarter ahead.",
    price: 497.8,
  },
];

export function Dashboard() {
  const [activePanel, setActivePanel] = useState<PanelType>("summary");
  const [selectedNewsIds, setSelectedNewsIds] = useState<string[]>(["1", "2", "3"]);

  const handleToggleNews = (id: string) => {
    setSelectedNewsIds((prev) =>
      prev.includes(id) ? prev.filter((newsId) => newsId !== id) : [...prev, id]
    );
  };

  const selectedNews = newsData.filter((news) => selectedNewsIds.includes(news.id));

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950" />
      
      {/* Subtle animated gradient */}
      <motion.div
        className="fixed top-0 right-0 w-1/2 h-1/2 bg-white/[0.02] rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="relative z-10 flex h-screen">
        {/* Sidebar */}
        <motion.div
          className="w-64 p-6 border-r border-white/10 flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <span className="text-xl tracking-tight">Hivemind</span>
          </div>

          {/* Navigation */}
          <div className="space-y-3 flex-1">
            <GlassButton
              icon={FileText}
              label="Today's Summary"
              onClick={() => setActivePanel("summary")}
              isActive={activePanel === "summary"}
            />
            <GlassButton
              icon={Briefcase}
              label="Portfolio Manager"
              onClick={() => setActivePanel("portfolio")}
              isActive={activePanel === "portfolio"}
            />
            <GlassButton
              icon={TrendingUp}
              label="Sector News"
              onClick={() => setActivePanel("sector")}
              isActive={activePanel === "sector"}
            />
            <GlassButton
              icon={BarChart3}
              label="Stock News"
              onClick={() => setActivePanel("stock")}
              isActive={activePanel === "stock"}
            />
            <GlassButton
              icon={GitCompare}
              label="Stock Screener"
              onClick={() => setActivePanel("comparison")}
              isActive={activePanel === "comparison"}
            />
            <GlassButton
              icon={Brain}
              label="Impact Analysis"
              onClick={() => setActivePanel("impact")}
              isActive={activePanel === "impact"}
            />
          </div>

          {/* User Profile */}
          <motion.div
            className="mt-auto p-4 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center">
                <span>JD</span>
              </div>
              <div>
                <div className="text-sm">John Doe</div>
                <div className="text-xs text-gray-400">Pro Plan</div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <motion.div
            className="p-6 border-b border-white/10 flex items-center justify-between"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div>
              <h1 className="text-2xl mb-1">
                {activePanel === "summary" && "Today's Intelligence Summary"}
                {activePanel === "portfolio" && "Portfolio Manager"}
                {activePanel === "sector" && "Sector News Feed"}
                {activePanel === "stock" && "Stock News Feed"}
                {activePanel === "comparison" && "Stock Screener"}
                {activePanel === "impact" && "Impact Analysis"}
              </h1>
              <p className="text-sm text-gray-400">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <motion.button
              className="p-3 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all relative"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full" />
            </motion.button>
          </motion.div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Portfolio Impact Summary - First */}
              {activePanel === "summary" && (
                <div>
                  <PortfolioImpactSummary />
                </div>
              )}

              {/* Summary Page - Special Layout */}
              {activePanel === "summary" && (
                <>
                  {/* Portfolio Overview Summary */}
                  <div className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10">
                    <h3 className="text-lg mb-4">Total Portfolio Overview</h3>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-300 leading-relaxed">
                        Your portfolio is experiencing <span className="text-white font-medium">strong positive momentum</span> driven by significant developments in the technology sector. The neural intelligence engine has identified three critical catalysts affecting your holdings: NVIDIA's breakthrough AI chip architecture announcement, major cloud infrastructure partnerships, and broader semiconductor industry tailwinds.
                      </p>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        <span className="text-white font-medium">Critical News Analysis:</span> Morgan Stanley's upgrade of NVIDIA to Overweight with a raised price target of $550 reflects institutional confidence in sustained AI infrastructure demand. The new GPU architecture represents a 40% performance improvement over current generation, positioning NVIDIA to capture incremental market share in data center and enterprise AI applications. AWS's expanded deployment commitment signals strong near-term revenue visibility.
                      </p>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        However, the neural engine has detected a <span className="text-white font-medium">moderate risk factor</span> from the Fed's hawkish monetary policy stance, which triggered a 2.1% tech sector pullback. This macro headwind may create short-term volatility, though our correlation analysis suggests your portfolio's AI-focused positioning should outperform broader market indices over the medium term.
                      </p>
                      <div className="flex items-start gap-3 mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <Brain className="w-5 h-5 text-white/60 flex-shrink-0 mt-1" />
                        <div>
                          <div className="text-sm font-medium mb-1">Neural Engine Recommendation</div>
                          <p className="text-sm text-gray-400">
                            Maintain current positions with a slight overweight in semiconductor holdings. Monitor the 10:30 AM analyst upgrade momentum and consider taking partial profits if NVDA approaches the $520 resistance level. The knowledge graph indicates 78% probability of continued upside over the next 5 trading days.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chart and News in Two Columns */}
                  <div className="grid grid-cols-3 gap-6">
                    {/* Stock Chart - Takes up 2 columns */}
                    <div className="col-span-2">
                      <StockChart selectedNews={selectedNews} />
                    </div>

                    {/* News Selector - Takes up 1 column with matching height */}
                    <div className="col-span-1 h-[536px]">
                      <NewsSelector
                        newsItems={newsData}
                        selectedNewsIds={selectedNewsIds}
                        onToggleNews={handleToggleNews}
                      />
                    </div>
                  </div>

                  {/* Critical News Banner */}
                  <div>
                    <CriticalNews />
                  </div>

                  {/* Today's Summary */}
                  <div>
                    <TodaySummary />
                  </div>
                </>
              )}

              {/* Stock Chart - For Stock News page */}
              {activePanel === "stock" && (
                <div>
                  <StockChart selectedNews={selectedNews} />
                </div>
              )}

              {/* Main Panel Content - For other pages */}
              {activePanel !== "summary" && (
                <div>
                  {activePanel === "portfolio" && <PortfolioPanel />}
                  {activePanel === "sector" && <SectorNewsPanel />}
                  {activePanel === "stock" && <StockNewsPanel />}
                  {activePanel === "comparison" && <StockComparison />}
                  {activePanel === "impact" && <ImpactAnalysisPanel />}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}