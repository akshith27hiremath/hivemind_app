import { motion, AnimatePresence } from "motion/react";
import { Clock, ExternalLink, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

type SortOption = "time" | "impact" | "sentiment";
type SentimentFilter = "all" | "positive" | "negative" | "neutral";

export function StockNewsPanel() {
  const [sortBy, setSortBy] = useState<SortOption>("time");
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
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

  const stockNews = [
    {
      id: 1,
      stock: "NVDA",
      title: "NVIDIA unveils next-generation AI accelerator at tech summit",
      source: "TechCrunch",
      summary:
        "The company's new Blackwell Ultra architecture promises 2.5x performance improvements over current generation, with major cloud providers already committing to large-scale deployments.",
      time: "12 min ago",
      timestamp: Date.now() - 12 * 60 * 1000,
      sentiment: "positive" as const,
      priceImpact: "+3.2%",
      impactValue: 3.2,
    },
    {
      id: 2,
      stock: "NVDA",
      title: "Analysts raise price targets following product announcement",
      source: "Bloomberg",
      summary:
        "Multiple Wall Street firms increase NVIDIA price targets, citing strong demand visibility and competitive moat in AI infrastructure.",
      time: "1 hour ago",
      timestamp: Date.now() - 60 * 60 * 1000,
      sentiment: "positive" as const,
      priceImpact: "+1.1%",
      impactValue: 1.1,
    },
    {
      id: 3,
      stock: "AAPL",
      title: "Apple diversifies supply chain with new Asian partnerships",
      source: "Reuters",
      summary:
        "Strategic supplier agreements in Vietnam and India aim to reduce manufacturing concentration risks and improve cost structure.",
      time: "2 hours ago",
      timestamp: Date.now() - 2 * 60 * 60 * 1000,
      sentiment: "neutral" as const,
      priceImpact: "+0.1%",
      impactValue: 0.1,
    },
    {
      id: 4,
      stock: "TSLA",
      title: "European Q4 delivery numbers miss analyst consensus",
      source: "Financial Times",
      summary:
        "Tesla reports 12% shortfall in European deliveries versus expectations, citing production ramp challenges and increased competition.",
      time: "3 hours ago",
      timestamp: Date.now() - 3 * 60 * 60 * 1000,
      sentiment: "negative" as const,
      priceImpact: "-1.8%",
      impactValue: -1.8,
    },
    {
      id: 5,
      stock: "MSFT",
      title: "Azure revenue growth exceeds projections in cloud earnings",
      source: "CNBC",
      summary:
        "Microsoft's cloud division posts 31% year-over-year growth, driven by enterprise AI adoption and infrastructure expansion.",
      time: "4 hours ago",
      timestamp: Date.now() - 4 * 60 * 60 * 1000,
      sentiment: "positive" as const,
      priceImpact: "+2.1%",
      impactValue: 2.1,
    },
  ];

  // Filter and sort news
  const filteredAndSortedNews = stockNews
    .filter((item) => stockFilter === "all" || item.stock === stockFilter)
    .filter((item) => sentimentFilter === "all" || item.sentiment === sentimentFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case "time":
          return b.timestamp - a.timestamp;
        case "impact":
          return Math.abs(b.impactValue) - Math.abs(a.impactValue);
        case "sentiment":
          const sentimentOrder = { positive: 0, neutral: 1, negative: 2 };
          return sentimentOrder[a.sentiment] - sentimentOrder[b.sentiment];
        default:
          return 0;
      }
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg mb-1">Stock-Specific News</h3>
          <p className="text-sm text-gray-400">
            Latest news affecting your individual holdings
          </p>
        </div>
        
        {/* Single Sort & Filter Button */}
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
                  {/* Stock Filter */}
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Stock</label>
                    <select
                      className="w-full px-3 py-2 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none text-sm"
                      value={stockFilter}
                      onChange={(e) => setStockFilter(e.target.value)}
                    >
                      <option value="all">All Stocks</option>
                      <option value="NVDA">NVDA</option>
                      <option value="AAPL">AAPL</option>
                      <option value="TSLA">TSLA</option>
                      <option value="MSFT">MSFT</option>
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
                      <option value="sentiment">Sentiment</option>
                    </select>
                  </div>

                  {/* Sentiment Filter */}
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Sentiment</label>
                    <select
                      className="w-full px-3 py-2 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none text-sm"
                      value={sentimentFilter}
                      onChange={(e) => setSentimentFilter(e.target.value as SentimentFilter)}
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

      <AnimatePresence>
        {filteredAndSortedNews.map((item, index) => (
          <motion.div
            key={item.id}
            className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-start gap-4">
              {/* Stock Badge */}
              <div className="px-3 py-2 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 flex-shrink-0">
                <div className="text-sm">{item.stock}</div>
              </div>

              <div className="flex-1">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h4 className="mb-1">{item.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{item.source}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.time}
                      </div>
                    </div>
                  </div>

                  <motion.button
                    className="p-2 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* Summary */}
                <p className="text-sm text-gray-300 leading-relaxed mb-4">{item.summary}</p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Sentiment: </span>
                      <span className="capitalize text-white/80">{item.sentiment}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Price Impact: </span>
                      <span className="text-white/80">{item.priceImpact}</span>
                    </div>
                  </div>

                  <motion.button
                    className="px-4 py-2 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Analyze Impact
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}