"use client";

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
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, X, TrendingUp, TrendingDown } from "lucide-react";
import { stockNewsData, sectorWideNews, type ChartNewsItem } from "@/lib/mock-data/news";

type Timeframe = "15m" | "30m" | "1h" | "1D" | "1W" | "1M";

const timeframeLabels: Record<Timeframe, string> = {
  "15m": "15 Minutes",
  "30m": "30 Minutes",
  "1h": "1 Hour",
  "1D": "1 Day",
  "1W": "1 Week",
  "1M": "1 Month",
};

const availableStocks = [
  { symbol: "NVDA", name: "NVIDIA Corporation", color: "rgba(255, 255, 255, 0.8)" },
  { symbol: "TSLA", name: "Tesla Inc.", color: "rgba(200, 180, 100, 0.85)" },
  { symbol: "AAPL", name: "Apple Inc.", color: "rgba(160, 200, 160, 0.8)" },
  { symbol: "MSFT", name: "Microsoft Corporation", color: "rgba(160, 160, 200, 0.8)" },
];

// Generate price data for different stocks and timeframes
const generateStockData = (symbol: string, timeframe: Timeframe) => {
  const baseData: Record<string, Record<string, { time: string; price: number }[]>> = {
    NVDA: {
      "1D": [
        { time: "09:30", price: 485.2 },
        { time: "10:00", price: 486.5 },
        { time: "10:30", price: 484.8 },
        { time: "11:00", price: 488.3 },
        { time: "11:30", price: 490.1 },
        { time: "12:00", price: 489.5 },
        { time: "12:30", price: 491.2 },
        { time: "13:00", price: 493.8 },
        { time: "13:30", price: 496.5 },
        { time: "14:00", price: 495.2 },
        { time: "14:30", price: 497.8 },
        { time: "15:00", price: 498.9 },
        { time: "15:30", price: 496.7 },
        { time: "16:00", price: 494.3 },
      ],
    },
    TSLA: {
      "1D": [
        { time: "09:30", price: 238.5 },
        { time: "10:00", price: 239.2 },
        { time: "10:30", price: 238.8 },
        { time: "11:00", price: 242.5 },
        { time: "11:30", price: 243.1 },
        { time: "12:00", price: 242.8 },
        { time: "12:30", price: 243.5 },
        { time: "13:00", price: 244.2 },
        { time: "13:30", price: 244.8 },
        { time: "14:00", price: 245.2 },
        { time: "14:30", price: 246.1 },
        { time: "15:00", price: 246.8 },
        { time: "15:30", price: 244.5 },
        { time: "16:00", price: 243.2 },
      ],
    },
    AAPL: {
      "1D": [
        { time: "09:30", price: 195.2 },
        { time: "10:00", price: 195.8 },
        { time: "10:30", price: 195.5 },
        { time: "11:00", price: 196.3 },
        { time: "11:30", price: 196.9 },
        { time: "12:00", price: 196.5 },
        { time: "12:30", price: 197.1 },
        { time: "13:00", price: 197.6 },
        { time: "13:30", price: 198.2 },
        { time: "14:00", price: 197.9 },
        { time: "14:30", price: 198.5 },
        { time: "15:00", price: 198.9 },
        { time: "15:30", price: 197.8 },
        { time: "16:00", price: 197.2 },
      ],
    },
    MSFT: {
      "1D": [
        { time: "09:30", price: 372.5 },
        { time: "10:00", price: 373.2 },
        { time: "10:30", price: 372.8 },
        { time: "11:00", price: 374.1 },
        { time: "11:30", price: 375.3 },
        { time: "12:00", price: 374.9 },
        { time: "12:30", price: 375.8 },
        { time: "13:00", price: 376.5 },
        { time: "13:30", price: 377.2 },
        { time: "14:00", price: 376.8 },
        { time: "14:30", price: 377.9 },
        { time: "15:00", price: 378.3 },
        { time: "15:30", price: 376.5 },
        { time: "16:00", price: 375.8 },
      ],
    },
  };

  return baseData[symbol]?.[timeframe] || baseData[symbol]?.["1D"] || [];
};

// Normalize data to percentage change from start
const normalizeData = (stocks: string[], timeframe: Timeframe) => {
  if (stocks.length === 0) return [];

  const stock1Data = generateStockData(stocks[0], timeframe);
  const stock2Data = stocks[1] ? generateStockData(stocks[1], timeframe) : [];

  const stock1Start = stock1Data[0]?.price || 1;
  const stock2Start = stock2Data[0]?.price || 1;

  return stock1Data.map((item, index) => {
    const result: Record<string, string | number> = {
      time: item.time,
      [stocks[0]]: ((item.price - stock1Start) / stock1Start) * 100,
    };

    if (stocks[1] && stock2Data[index]) {
      result[stocks[1]] =
        ((stock2Data[index].price - stock2Start) / stock2Start) * 100;
    }

    return result;
  });
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    payload: Record<string, string | number>;
  }>;
  selectedNews: ChartNewsItem[];
}

function CustomTooltip({ active, payload, selectedNews }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    const newsAtPoint = selectedNews.find((n) => n.time === dataPoint.time);

    return (
      <div className="p-4 rounded-xl backdrop-blur-xl bg-black/90 border border-white/20">
        <p className="text-sm text-gray-400 mb-2">{dataPoint.time}</p>
        {payload.map((entry, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 mb-1"
          >
            <span className="text-xs text-gray-300">{entry.dataKey}:</span>
            <span
              className={`text-sm ${entry.value >= 0 ? "text-hm-candle-green" : "text-hm-candle-red"}`}
            >
              {entry.value >= 0 ? "+" : ""}
              {entry.value.toFixed(2)}%
            </span>
          </div>
        ))}
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
}

export function StockScreener() {
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [isTimeframeDropdownOpen, setIsTimeframeDropdownOpen] = useState(false);
  const [selectedStocks, setSelectedStocks] = useState<string[]>(["NVDA", "TSLA"]);
  const [isStockDropdownOpen, setIsStockDropdownOpen] = useState<number | null>(null);
  const [selectedNewsIds, setSelectedNewsIds] = useState<string[]>([]);

  const timeframeRef = useRef<HTMLDivElement>(null);
  const stockRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];

  const data = normalizeData(selectedStocks, timeframe);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        timeframeRef.current &&
        !timeframeRef.current.contains(event.target as Node)
      ) {
        setIsTimeframeDropdownOpen(false);
      }
      stockRefs.forEach((ref, index) => {
        if (ref.current && !ref.current.contains(event.target as Node)) {
          if (isStockDropdownOpen === index) {
            setIsStockDropdownOpen(null);
          }
        }
      });
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isStockDropdownOpen]);

  const handleStockSelect = (index: number, symbol: string) => {
    const newStocks = [...selectedStocks];
    newStocks[index] = symbol;
    setSelectedStocks(newStocks);
    setIsStockDropdownOpen(null);
  };

  const handleToggleNews = (id: string) => {
    setSelectedNewsIds((prev) =>
      prev.includes(id) ? prev.filter((newsId) => newsId !== id) : [...prev, id]
    );
  };

  // Combine all relevant news
  const allNews: ChartNewsItem[] = [
    ...sectorWideNews,
    ...(selectedStocks[0] && stockNewsData[selectedStocks[0]]
      ? stockNewsData[selectedStocks[0]]
      : []),
    ...(selectedStocks[1] && stockNewsData[selectedStocks[1]]
      ? stockNewsData[selectedStocks[1]]
      : []),
  ];

  const selectedNews = allNews.filter((news) =>
    selectedNewsIds.includes(news.id)
  );

  // Get stock color
  const getStockColor = (symbol: string) => {
    return availableStocks.find((s) => s.symbol === symbol)?.color || "rgba(255, 255, 255, 0.8)";
  };

  return (
    <div className="space-y-6">
      {/* Stock Comparison Chart */}
      <motion.div
        className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium mb-1">Stock Screener</h3>
            <p className="text-sm text-gray-400">
              Normalized percentage change comparison with news overlay
            </p>
          </div>
        </div>

        {/* Stock Selectors */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {[0, 1].map((index) => (
            <div key={index} className="relative flex-1 min-w-[180px]" ref={stockRefs[index]}>
              <motion.button
                onClick={() =>
                  setIsStockDropdownOpen(
                    isStockDropdownOpen === index ? null : index
                  )
                }
                className="w-full px-4 py-3 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm flex items-center justify-between"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="text-left">
                  <div className="font-medium">{selectedStocks[index]}</div>
                  <div className="text-xs text-gray-400">
                    {availableStocks.find(
                      (s) => s.symbol === selectedStocks[index]
                    )?.name || "Select Stock"}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${isStockDropdownOpen === index ? "rotate-180" : ""}`}
                />
              </motion.button>

              <AnimatePresence>
                {isStockDropdownOpen === index && (
                  <motion.div
                    className="absolute top-full left-0 mt-2 w-full rounded-xl backdrop-blur-xl bg-black/90 border border-white/10 shadow-2xl z-20 overflow-hidden"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {availableStocks
                      .filter(
                        (stock) =>
                          !selectedStocks.includes(stock.symbol) ||
                          stock.symbol === selectedStocks[index]
                      )
                      .map((stock) => (
                        <motion.button
                          key={stock.symbol}
                          onClick={() => handleStockSelect(index, stock.symbol)}
                          className={`w-full px-4 py-3 text-left text-sm transition-all ${selectedStocks[index] === stock.symbol ? "bg-white/20 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}
                          whileHover={{ x: 4 }}
                        >
                          <div className="font-medium">{stock.symbol}</div>
                          <div className="text-xs text-gray-400">
                            {stock.name}
                          </div>
                        </motion.button>
                      ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {/* Timeframe Dropdown */}
          <div className="relative" ref={timeframeRef}>
            <motion.button
              onClick={() => setIsTimeframeDropdownOpen(!isTimeframeDropdownOpen)}
              className="px-4 py-3 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm flex items-center gap-2 min-w-[140px] justify-between"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>{timeframeLabels[timeframe]}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${isTimeframeDropdownOpen ? "rotate-180" : ""}`}
              />
            </motion.button>

            <AnimatePresence>
              {isTimeframeDropdownOpen && (
                <motion.div
                  className="absolute top-full right-0 mt-2 w-40 rounded-xl backdrop-blur-xl bg-black/90 border border-white/10 shadow-2xl z-20 overflow-hidden"
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
                        setIsTimeframeDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-sm transition-all ${timeframe === tf ? "bg-white/20 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}
                      whileHover={{ x: 4 }}
                    >
                      {timeframeLabels[tf]}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <defs>
                <linearGradient id="stock1Gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="rgba(255, 255, 255, 0.1)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="rgba(255, 255, 255, 0.1)"
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient id="stock2Gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="rgba(200, 180, 100, 0.15)"
                    stopOpacity={0.6}
                  />
                  <stop
                    offset="95%"
                    stopColor="rgba(200, 180, 100, 0.15)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255, 255, 255, 0.05)"
              />
              <XAxis
                dataKey="time"
                stroke="rgba(255, 255, 255, 0.3)"
                style={{ fontSize: "12px" }}
                tick={{ fill: "rgba(255, 255, 255, 0.5)" }}
              />
              <YAxis
                stroke="rgba(255, 255, 255, 0.3)"
                style={{ fontSize: "12px" }}
                tick={{ fill: "rgba(255, 255, 255, 0.5)" }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                content={<CustomTooltip selectedNews={selectedNews} />}
              />

              {selectedStocks[0] && (
                <>
                  <Area
                    type="monotone"
                    dataKey={selectedStocks[0]}
                    stroke="none"
                    fill="url(#stock1Gradient)"
                    fillOpacity={1}
                  />
                  <Line
                    type="monotone"
                    dataKey={selectedStocks[0]}
                    stroke={getStockColor(selectedStocks[0])}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: "rgba(255, 255, 255, 0.9)" }}
                  />
                </>
              )}

              {selectedStocks[1] && (
                <>
                  <Area
                    type="monotone"
                    dataKey={selectedStocks[1]}
                    stroke="none"
                    fill="url(#stock2Gradient)"
                    fillOpacity={1}
                  />
                  <Line
                    type="monotone"
                    dataKey={selectedStocks[1]}
                    stroke={getStockColor(selectedStocks[1])}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: "rgba(200, 180, 100, 0.95)" }}
                  />
                </>
              )}

              {/* News event markers */}
              {selectedNews.map((news, i) => {
                const dataPoint = data.find((d) => d.time === news.time);
                if (!dataPoint) return null;

                // For sector news, show on both lines
                if (news.id.startsWith("sector-")) {
                  return selectedStocks.map((stock, stockIndex) => {
                    const yValue = dataPoint[stock];
                    if (yValue === undefined) return null;
                    return (
                      <ReferenceDot
                        key={`${news.id}-${stock}`}
                        x={news.time}
                        y={yValue as number}
                        r={8}
                        fill={
                          news.sentiment === "positive"
                            ? "rgba(34, 197, 94, 0.3)"
                            : news.sentiment === "negative"
                              ? "rgba(239, 68, 68, 0.3)"
                              : "rgba(255, 255, 255, 0.3)"
                        }
                        stroke={
                          news.sentiment === "positive"
                            ? "rgba(34, 197, 94, 0.8)"
                            : news.sentiment === "negative"
                              ? "rgba(239, 68, 68, 0.8)"
                              : "rgba(255, 255, 255, 0.8)"
                        }
                        strokeWidth={2}
                      />
                    );
                  });
                }

                // Stock-specific news
                const stockSymbol = selectedStocks.find((s) =>
                  news.id.toLowerCase().startsWith(s.toLowerCase())
                );
                if (stockSymbol && dataPoint[stockSymbol] !== undefined) {
                  return (
                    <ReferenceDot
                      key={news.id}
                      x={news.time}
                      y={dataPoint[stockSymbol] as number}
                      r={8}
                      fill={
                        news.sentiment === "positive"
                          ? "rgba(34, 197, 94, 0.3)"
                          : news.sentiment === "negative"
                            ? "rgba(239, 68, 68, 0.3)"
                            : "rgba(255, 255, 255, 0.3)"
                      }
                      stroke={
                        news.sentiment === "positive"
                          ? "rgba(34, 197, 94, 0.8)"
                          : news.sentiment === "negative"
                            ? "rgba(239, 68, 68, 0.8)"
                            : "rgba(255, 255, 255, 0.8)"
                      }
                      strokeWidth={2}
                    />
                  );
                }

                return null;
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-6 text-xs text-gray-400">
          {selectedStocks[0] && (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-0.5"
                style={{ backgroundColor: getStockColor(selectedStocks[0]) }}
              />
              <span>{selectedStocks[0]}</span>
            </div>
          )}
          {selectedStocks[1] && (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-0.5"
                style={{ backgroundColor: getStockColor(selectedStocks[1]) }}
              />
              <span>{selectedStocks[1]}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-hm-candle-green bg-hm-candle-green/30" />
            <span>Positive News</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-hm-candle-red bg-hm-candle-red/30" />
            <span>Negative News</span>
          </div>
        </div>
      </motion.div>

      {/* News Selector */}
      <motion.div
        className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h3 className="text-lg font-medium mb-2">News Events</h3>
        <p className="text-sm text-gray-400 mb-6">
          Toggle news events to display on the chart
        </p>

        <div className="space-y-4">
          {/* Sector News Section */}
          {sectorWideNews.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">
                Sector-Wide News
              </div>
              <div className="space-y-2">
                {sectorWideNews.map((news) => (
                  <NewsEventCard
                    key={news.id}
                    news={news}
                    isSelected={selectedNewsIds.includes(news.id)}
                    onToggle={() => handleToggleNews(news.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Individual Stock News */}
          {selectedStocks.map((stockSymbol) => {
            const stockNews = stockNewsData[stockSymbol] || [];
            if (stockNews.length === 0) return null;

            return (
              <div key={stockSymbol}>
                <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider mt-4">
                  {stockSymbol} News
                </div>
                <div className="space-y-2">
                  {stockNews.map((news) => (
                    <NewsEventCard
                      key={news.id}
                      news={news}
                      isSelected={selectedNewsIds.includes(news.id)}
                      onToggle={() => handleToggleNews(news.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

// News Event Card Component
function NewsEventCard({
  news,
  isSelected,
  onToggle,
}: {
  news: ChartNewsItem;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      className="p-4 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs text-gray-500">{news.time}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                news.impact === "high"
                  ? "bg-white/20 text-white"
                  : news.impact === "medium"
                    ? "bg-white/10 text-gray-300"
                    : "bg-white/5 text-gray-400"
              }`}
            >
              {news.impact}
            </span>
            <span className="flex items-center gap-1 text-xs">
              {news.sentiment === "positive" ? (
                <TrendingUp className="w-3 h-3 text-hm-candle-green" />
              ) : news.sentiment === "negative" ? (
                <TrendingDown className="w-3 h-3 text-hm-candle-red" />
              ) : null}
              <span
                className={`capitalize ${
                  news.sentiment === "positive"
                    ? "text-hm-candle-green"
                    : news.sentiment === "negative"
                      ? "text-hm-candle-red"
                      : "text-gray-400"
                }`}
              >
                {news.sentiment}
              </span>
            </span>
          </div>
          <div className="text-sm font-medium mb-1">{news.title}</div>
          <div className="text-xs text-gray-400">{news.description}</div>
        </div>
        <motion.button
          onClick={onToggle}
          className={`p-2 rounded-lg backdrop-blur-xl border transition-all ${
            isSelected
              ? "bg-white/20 border-white/40"
              : "bg-white/5 border-white/10 hover:bg-white/10"
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isSelected ? (
            <X className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
