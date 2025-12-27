import { motion } from "motion/react";
import { Plus, X, TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface NewsItem {
  id: string;
  time: string;
  title: string;
  impact: "high" | "medium" | "low";
  sentiment: "positive" | "negative" | "neutral";
  description: string;
  price: number;
}

interface NewsSelectorProps {
  newsItems: NewsItem[];
  selectedNewsIds: string[];
  onToggleNews: (id: string) => void;
}

export function NewsSelector({ newsItems, selectedNewsIds, onToggleNews }: NewsSelectorProps) {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "text-white";
      case "medium":
        return "text-gray-300";
      case "low":
        return "text-gray-400";
      default:
        return "text-gray-400";
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <TrendingUp className="w-4 h-4 text-white/60" />;
      case "negative":
        return <TrendingDown className="w-4 h-4 text-white/60" />;
      default:
        return <Minus className="w-4 h-4 text-white/60" />;
    }
  };

  return (
    <div className="h-full flex flex-col p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10">
      <div className="mb-4">
        <h3 className="text-lg mb-1">News Timeline</h3>
        <p className="text-xs text-gray-400">
          Select events to display
        </p>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
        <div className="space-y-2.5">
          {newsItems.map((item) => {
            const isSelected = selectedNewsIds.includes(item.id);
            return (
              <motion.div
                key={item.id}
                className={`p-3 rounded-lg backdrop-blur-xl border transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? "bg-white/10 border-white/30"
                    : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]"
                }`}
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
                onClick={() => onToggleNews(item.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs text-gray-400 font-medium">{item.time}</span>
                      {getSentimentIcon(item.sentiment)}
                    </div>
                    <h4 className="text-sm mb-1 leading-snug">{item.title}</h4>
                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  <motion.div
                    className={`flex-shrink-0 w-6 h-6 rounded-md backdrop-blur-xl border transition-all duration-300 flex items-center justify-center ${
                      isSelected
                        ? "bg-white/20 border-white/40"
                        : "bg-white/5 border-white/20"
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isSelected ? (
                      <X className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
