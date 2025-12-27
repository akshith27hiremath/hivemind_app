import { motion } from "motion/react";
import { AlertCircle } from "lucide-react";

export function CriticalNews() {
  const newsItems = [
    {
      id: 1,
      title: "Fed signals potential rate cuts in Q3 2025",
      time: "8 min ago",
      severity: "high",
    },
    {
      id: 2,
      title: "Tech sector sees 4.2% rally on AI infrastructure spending",
      time: "23 min ago",
      severity: "medium",
    },
    {
      id: 3,
      title: "Energy prices surge 6% amid supply concerns",
      time: "1 hour ago",
      severity: "high",
    },
  ];

  return (
    <div>
      <h3 className="text-lg mb-4">Critical News</h3>
      <div className="space-y-3">
        {newsItems.map((news) => (
          <div
            key={news.id}
            className="p-5 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="mb-2">{news.title}</h4>
                <p className="text-sm text-gray-400">
                  {news.severity === "high"
                    ? "High impact on portfolio"
                    : news.severity === "medium"
                    ? "Medium impact on portfolio"
                    : "Low impact on portfolio"}
                </p>
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">{news.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}