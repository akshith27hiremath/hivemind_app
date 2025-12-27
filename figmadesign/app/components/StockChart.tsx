import { motion, AnimatePresence } from "motion/react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
  Area,
} from "recharts";
import { NewsItem } from "./NewsSelector";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface StockChartProps {
  selectedNews?: NewsItem[];
}

type Timeframe = "15m" | "30m" | "1h" | "8h" | "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

const timeframeLabels: Record<Timeframe, string> = {
  "15m": "15 Minutes",
  "30m": "30 Minutes",
  "1h": "1 Hour",
  "8h": "8 Hours",
  "1D": "1 Day",
  "1W": "1 Week",
  "1M": "1 Month",
  "3M": "3 Months",
  "1Y": "1 Year",
  "ALL": "All Time",
};

// Generate data for different timeframes
const generateChartData = (timeframe: Timeframe) => {
  switch (timeframe) {
    case "15m":
      return [
        { time: "09:30", price: 485.2, volume: 0.5 },
        { time: "09:45", price: 485.8, volume: 0.4 },
        { time: "10:00", price: 486.5, volume: 0.6 },
        { time: "10:15", price: 485.9, volume: 0.5 },
        { time: "10:30", price: 484.8, volume: 0.7 },
        { time: "10:45", price: 485.4, volume: 0.4 },
        { time: "11:00", price: 486.1, volume: 0.6 },
        { time: "11:15", price: 487.3, volume: 0.8 },
        { time: "11:30", price: 488.2, volume: 0.5 },
        { time: "11:45", price: 487.8, volume: 0.4 },
        { time: "12:00", price: 488.5, volume: 0.3 },
        { time: "12:15", price: 489.2, volume: 0.5 },
        { time: "12:30", price: 489.8, volume: 0.6 },
        { time: "12:45", price: 490.3, volume: 0.4 },
        { time: "13:00", price: 491.1, volume: 0.7 },
      ];
    case "30m":
      return [
        { time: "09:30", price: 485.2, volume: 1.1 },
        { time: "10:00", price: 486.5, volume: 0.9 },
        { time: "10:30", price: 484.8, volume: 1.2 },
        { time: "11:00", price: 488.3, volume: 1.6 },
        { time: "11:30", price: 490.1, volume: 1.3 },
        { time: "12:00", price: 489.5, volume: 0.8 },
        { time: "12:30", price: 491.2, volume: 1.0 },
        { time: "13:00", price: 493.8, volume: 1.4 },
        { time: "13:30", price: 496.5, volume: 2.1 },
        { time: "14:00", price: 495.2, volume: 1.2 },
        { time: "14:30", price: 497.8, volume: 1.5 },
        { time: "15:00", price: 498.9, volume: 1.1 },
        { time: "15:30", price: 496.7, volume: 1.8 },
        { time: "16:00", price: 494.3, volume: 2.6 },
      ];
    case "1h":
      return [
        { time: "09:30", price: 485.2, volume: 2.1 },
        { time: "10:30", price: 484.8, volume: 2.3 },
        { time: "11:30", price: 490.1, volume: 2.7 },
        { time: "12:30", price: 491.2, volume: 1.9 },
        { time: "13:30", price: 496.5, volume: 4.1 },
        { time: "14:30", price: 497.8, volume: 2.9 },
        { time: "15:30", price: 496.7, volume: 3.5 },
        { time: "16:00", price: 494.3, volume: 5.2 },
      ];
    case "8h":
      return [
        { time: "Mon AM", price: 478.5, volume: 15.2 },
        { time: "Mon PM", price: 481.2, volume: 16.8 },
        { time: "Tue AM", price: 482.3, volume: 14.7 },
        { time: "Tue PM", price: 483.9, volume: 18.3 },
        { time: "Wed AM", price: 485.9, volume: 17.5 },
        { time: "Wed PM", price: 487.4, volume: 19.2 },
        { time: "Thu AM", price: 489.2, volume: 16.8 },
        { time: "Thu PM", price: 491.8, volume: 20.1 },
        { time: "Fri AM", price: 493.5, volume: 18.9 },
        { time: "Fri PM", price: 494.3, volume: 21.4 },
      ];
    case "1D":
      return [
        { time: "09:30", price: 485.2, volume: 2.1 },
        { time: "10:00", price: 486.5, volume: 1.8 },
        { time: "10:30", price: 484.8, volume: 2.3 },
        { time: "11:00", price: 488.3, volume: 3.2 },
        { time: "11:30", price: 490.1, volume: 2.7 },
        { time: "12:00", price: 489.5, volume: 1.5 },
        { time: "12:30", price: 491.2, volume: 1.9 },
        { time: "13:00", price: 493.8, volume: 2.8 },
        { time: "13:30", price: 496.5, volume: 4.1 },
        { time: "14:00", price: 495.2, volume: 2.3 },
        { time: "14:30", price: 497.8, volume: 2.9 },
        { time: "15:00", price: 498.9, volume: 2.1 },
        { time: "15:30", price: 496.7, volume: 3.5 },
        { time: "16:00", price: 494.3, volume: 5.2 },
      ];
    case "1W":
      return [
        { time: "Mon", price: 478.5, volume: 45.2 },
        { time: "Tue", price: 482.3, volume: 48.7 },
        { time: "Wed", price: 485.9, volume: 52.3 },
        { time: "Thu", price: 489.2, volume: 49.8 },
        { time: "Fri", price: 494.3, volume: 55.4 },
      ];
    case "1M":
      return [
        { time: "Nov 23", price: 445.2, volume: 320.5 },
        { time: "Nov 26", price: 448.7, volume: 298.3 },
        { time: "Nov 29", price: 452.1, volume: 315.7 },
        { time: "Dec 2", price: 458.5, volume: 342.8 },
        { time: "Dec 5", price: 462.9, volume: 328.4 },
        { time: "Dec 8", price: 468.3, volume: 351.2 },
        { time: "Dec 11", price: 472.8, volume: 336.9 },
        { time: "Dec 14", price: 478.4, volume: 345.6 },
        { time: "Dec 17", price: 485.7, volume: 362.1 },
        { time: "Dec 20", price: 491.2, volume: 378.5 },
        { time: "Dec 23", price: 494.3, volume: 355.8 },
      ];
    case "3M":
      return [
        { time: "Sep 23", price: 412.5, volume: 1250.3 },
        { time: "Oct 7", price: 418.9, volume: 1198.7 },
        { time: "Oct 21", price: 425.3, volume: 1302.4 },
        { time: "Nov 4", price: 438.7, volume: 1456.8 },
        { time: "Nov 18", price: 447.2, volume: 1389.2 },
        { time: "Dec 2", price: 458.5, volume: 1512.6 },
        { time: "Dec 16", price: 478.9, volume: 1687.3 },
        { time: "Dec 23", price: 494.3, volume: 1598.4 },
      ];
    case "1Y":
      return [
        { time: "Jan '24", price: 285.4, volume: 5240.2 },
        { time: "Feb '24", price: 312.7, volume: 5687.8 },
        { time: "Mar '24", price: 342.5, volume: 6123.5 },
        { time: "Apr '24", price: 365.8, volume: 5945.3 },
        { time: "May '24", price: 388.2, volume: 6234.7 },
        { time: "Jun '24", price: 402.9, volume: 6012.8 },
        { time: "Jul '24", price: 418.6, volume: 6456.2 },
        { time: "Aug '24", price: 395.7, volume: 6789.4 },
        { time: "Sep '24", price: 412.5, volume: 6523.1 },
        { time: "Oct '24", price: 425.3, volume: 6891.6 },
        { time: "Nov '24", price: 447.2, volume: 7234.8 },
        { time: "Dec '24", price: 494.3, volume: 7689.3 },
      ];
    case "ALL":
      return [
        { time: "2020", price: 42.8, volume: 18520.4 },
        { time: "2021", price: 98.5, volume: 25687.2 },
        { time: "2022", price: 146.3, volume: 32145.8 },
        { time: "2023", price: 242.7, volume: 41236.5 },
        { time: "2024", price: 494.3, volume: 58942.3 },
      ];
  }
};

export function StockChart({ selectedNews = [] }: StockChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const data = generateChartData(timeframe);

  // Map selected news to data points
  const newsOnChart = selectedNews.map((news) => {
    const dataPoint = data.find((d) => d.time === news.time);
    return {
      ...news,
      price: dataPoint?.price || news.price,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const newsAtPoint = newsOnChart.find((n) => n.time === dataPoint.time);
      
      return (
        <div className="p-4 rounded-xl backdrop-blur-xl bg-black/80 border border-white/20">
          <p className="text-sm text-gray-400 mb-1">{dataPoint.time}</p>
          <p className="text-lg mb-1">${dataPoint.price.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Vol: {dataPoint.volume}M</p>
          {newsAtPoint && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <p className="text-xs text-white/80 mb-1">{newsAtPoint.title}</p>
              <p className="text-xs text-gray-400">{newsAtPoint.description}</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg mb-1">NVDA - NVIDIA Corporation</h3>
          <p className="text-sm text-gray-400">Real-time price with news overlay</p>
        </div>
        <div className="text-right">
          <div className="text-2xl mb-1">$494.30</div>
          <div className="text-sm text-white/80">+9.10 (+1.87%)</div>
        </div>
      </div>

      {/* Timeframe Dropdown */}
      <div className="relative mb-6">
        <motion.button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="px-4 py-2 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 text-sm flex items-center gap-2 min-w-[160px] justify-between"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span>{timeframeLabels[timeframe]}</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-300 ${
              isDropdownOpen ? "rotate-180" : ""
            }`}
          />
        </motion.button>

        <AnimatePresence>
          {isDropdownOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                className="fixed inset-0 z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDropdownOpen(false)}
              />

              {/* Dropdown Menu */}
              <motion.div
                className="absolute top-full left-0 mt-2 w-48 rounded-xl backdrop-blur-xl bg-black/90 border border-white/10 shadow-2xl z-20 overflow-hidden"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {(Object.keys(timeframeLabels) as Timeframe[]).map((tf) => (
                  <motion.button
                    key={tf}
                    onClick={() => {
                      setTimeframe(tf);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm transition-all duration-200 ${
                      timeframe === tf
                        ? "bg-white/20 text-white"
                        : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                    whileHover={{ x: 4 }}
                  >
                    {timeframeLabels[tf]}
                  </motion.button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <div className="h-80 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgba(255, 255, 255, 0.1)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="rgba(255, 255, 255, 0.1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis
              dataKey="time"
              stroke="rgba(255, 255, 255, 0.3)"
              style={{ fontSize: "12px" }}
              tick={{ fill: "rgba(255, 255, 255, 0.5)" }}
            />
            <YAxis
              domain={["dataMin - 2", "dataMax + 2"]}
              stroke="rgba(255, 255, 255, 0.3)"
              style={{ fontSize: "12px" }}
              tick={{ fill: "rgba(255, 255, 255, 0.5)" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke="none"
              fill="url(#priceGradient)"
              fillOpacity={1}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="rgba(255, 255, 255, 0.8)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: "rgba(255, 255, 255, 0.9)" }}
            />
            {/* News event markers */}
            {newsOnChart.map((d, i) => (
                <ReferenceDot
                  key={i}
                  x={d.time}
                  y={d.price}
                  r={8}
                  fill="rgba(255, 255, 255, 0.3)"
                  stroke="rgba(255, 255, 255, 0.8)"
                  strokeWidth={2}
                />
              ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* News markers legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-white/80 bg-white/30" />
          <span>News Event</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-white/80" />
          <span>Price Movement</span>
        </div>
      </div>
    </div>
  );
}