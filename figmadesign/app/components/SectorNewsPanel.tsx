import { motion, AnimatePresence } from "motion/react";
import { Clock, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

type SortOption = "time" | "impact" | "relevance";
type ImpactFilter = "all" | "positive" | "negative" | "neutral";

export function SectorNewsPanel() {
  const [sortBy, setSortBy] = useState<SortOption>("time");
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const sectorNews = [
    {
      sector: "Technology",
      news: [
        {
          id: 1,
          title: "Major cloud providers announce infrastructure expansion",
          summary:
            "AWS, Azure, and Google Cloud reveal plans for new data centers across emerging markets, signaling strong demand.",
          time: "5 min ago",
          timestamp: Date.now() - 5 * 60 * 1000,
          impact: "positive" as const,
          relevance: 92,
        },
        {
          id: 2,
          title: "Semiconductor equipment orders surge in December",
          summary:
            "Industry data shows 28% increase in chip manufacturing equipment orders, indicating strong 2025 outlook.",
          time: "1 hour ago",
          timestamp: Date.now() - 60 * 60 * 1000,
          impact: "positive" as const,
          relevance: 88,
        },
        {
          id: 3,
          title: "Enterprise software spending growth decelerates",
          summary:
            "Gartner report suggests companies are becoming more selective with software budgets amid economic uncertainty.",
          time: "2 hours ago",
          timestamp: Date.now() - 2 * 60 * 60 * 1000,
          impact: "neutral" as const,
          relevance: 76,
        },
      ],
    },
    {
      sector: "Automotive",
      news: [
        {
          id: 4,
          title: "EV market share reaches new milestone in Europe",
          summary:
            "Electric vehicles now account for 24% of new car registrations, up from 18% year-over-year.",
          time: "30 min ago",
          timestamp: Date.now() - 30 * 60 * 1000,
          impact: "positive" as const,
          relevance: 85,
        },
        {
          id: 5,
          title: "Battery raw material prices show volatility",
          summary:
            "Lithium and cobalt prices fluctuate as supply chain adjustments continue globally.",
          time: "3 hours ago",
          timestamp: Date.now() - 3 * 60 * 60 * 1000,
          impact: "neutral" as const,
          relevance: 71,
        },
      ],
    },
  ];

  // Flatten news for filtering and sorting
  const allNews = sectorNews.flatMap((sector) =>
    sector.news.map((newsItem) => ({ ...newsItem, sector: sector.sector }))
  );

  const filteredAndSortedNews = allNews
    .filter((item) => sectorFilter === "all" || item.sector === sectorFilter)
    .filter((item) => impactFilter === "all" || item.impact === impactFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case "time":
          return b.timestamp - a.timestamp;
        case "impact":
          const impactOrder = { positive: 0, neutral: 1, negative: 2 };
          return impactOrder[a.impact] - impactOrder[b.impact];
        case "relevance":
          return b.relevance - a.relevance;
        default:
          return 0;
      }
    });

  // Group back by sector for display
  const groupedNews = filteredAndSortedNews.reduce((acc, item) => {
    if (!acc[item.sector]) {
      acc[item.sector] = [];
    }
    acc[item.sector].push(item);
    return acc;
  }, {} as Record<string, typeof filteredAndSortedNews>);

  return (
    <div className="space-y-8">
      {/* Single Sort & Filter Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg mb-1">Sector News Feed</h3>
          <p className="text-sm text-gray-400">
            Market-moving news across sectors
          </p>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="px-4 py-2 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors text-sm flex items-center gap-2"
          >
            <span>Sort & Filter</span>
            <ChevronDown className="w-3.5 h-3.5 text-white/60" />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                className="absolute right-0 mt-2 w-64 rounded-2xl backdrop-blur-xl bg-black/90 border border-white/10 shadow-2xl z-20 overflow-hidden"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.1 }}
                ref={dropdownRef}
              >
                <div className="p-4 space-y-4">
                  {/* Sector Filter */}
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Sector</label>
                    <select
                      className="w-full px-3 py-2 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none text-sm"
                      value={sectorFilter}
                      onChange={(e) => setSectorFilter(e.target.value)}
                    >
                      <option value="all">All Sectors</option>
                      <option value="Technology">Technology</option>
                      <option value="Automotive">Automotive</option>
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Sort By</label>
                    <select
                      className="w-full px-3 py-2 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none text-sm"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                    >
                      <option value="time">Time</option>
                      <option value="impact">Impact</option>
                      <option value="relevance">Relevance</option>
                    </select>
                  </div>

                  {/* Impact Filter */}
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Impact</label>
                    <select
                      className="w-full px-3 py-2 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none text-sm"
                      value={impactFilter}
                      onChange={(e) => setImpactFilter(e.target.value as ImpactFilter)}
                    >
                      <option value="all">All</option>
                      <option value="positive">Positive</option>
                      <option value="negative">Negative</option>
                      <option value="neutral">Neutral</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* News Cards */}
      <AnimatePresence>
        {Object.entries(groupedNews).map(([sector, news]) => (
          <motion.div
            key={sector}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <h3 className="text-lg mb-4">{sector}</h3>
            <div className="space-y-4">
              {news.map((item) => (
                <div
                  key={item.id}
                  className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h4 className="flex-1">{item.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {item.time}
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 mb-4 leading-relaxed">{item.summary}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-xs">
                        <span className="text-gray-400">Impact: </span>
                        <span className="capitalize text-white/80">{item.impact}</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-400">Relevance: </span>
                        <span className="text-white/80">{item.relevance}%</span>
                      </div>
                    </div>

                    <motion.button
                      className="px-4 py-2 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      View Details
                    </motion.button>
                  </div>

                  {/* Relevance bar */}
                  <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-white/20 to-white/40 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${item.relevance}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}