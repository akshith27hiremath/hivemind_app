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
import { useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { NewsItem } from "./NewsSelector";
import React from "react";

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

// Available stocks to compare
const availableStocks = [
  { symbol: "NVDA", name: "NVIDIA Corporation", color: "rgba(255, 255, 255, 0.8)" },
  { symbol: "TSLA", name: "Tesla Inc.", color: "rgba(200, 200, 200, 0.8)" },
  { symbol: "AMD", name: "Advanced Micro Devices", color: "rgba(160, 160, 160, 0.8)" },
  { symbol: "AAPL", name: "Apple Inc.", color: "rgba(140, 140, 140, 0.8)" },
  { symbol: "MSFT", name: "Microsoft Corporation", color: "rgba(180, 180, 180, 0.8)" },
  { symbol: "GOOGL", name: "Alphabet Inc.", color: "rgba(120, 120, 120, 0.8)" },
];

// Dummy news data for stocks
const stockNewsData: Record<string, NewsItem[]> = {
  NVDA: [
    {
      id: "nvda-1",
      time: "10:30",
      title: "NVIDIA AI Chip Demand Soars",
      impact: "high",
      sentiment: "positive",
      description: "Data center revenue up 200% YoY",
      price: 484.8,
    },
    {
      id: "nvda-2",
      time: "13:00",
      title: "New GPU Architecture Launch",
      impact: "high",
      sentiment: "positive",
      description: "Next-gen Blackwell chips announced",
      price: 493.8,
    },
  ],
  TSLA: [
    {
      id: "tsla-1",
      time: "11:00",
      title: "Q4 Deliveries Beat Estimates",
      impact: "high",
      sentiment: "positive",
      description: "Record deliveries reported",
      price: 242.5,
    },
    {
      id: "tsla-2",
      time: "14:00",
      title: "New Gigafactory Announcement",
      impact: "medium",
      sentiment: "positive",
      description: "Expansion into Southeast Asia",
      price: 245.2,
    },
  ],
  AMD: [
    {
      id: "amd-1",
      time: "10:00",
      title: "Server Chip Sales Surge",
      impact: "medium",
      sentiment: "positive",
      description: "Market share gains in data centers",
      price: 152.3,
    },
  ],
};

// Sector news that affects all stocks
const sectorNewsData: NewsItem[] = [
  {
    id: "sector-1",
    time: "15:30",
    title: "Tech Sector Pullback",
    impact: "high",
    sentiment: "negative",
    description: "Fed signals hawkish stance on rates",
    price: 0,
  },
  {
    id: "sector-2",
    time: "09:30",
    title: "Semiconductor Industry Outlook Positive",
    impact: "medium",
    sentiment: "positive",
    description: "Industry analysts raise forecasts",
    price: 0,
  },
];

// Generate price data for different stocks and timeframes
const generateStockData = (symbol: string, timeframe: Timeframe) => {
  const baseData: Record<string, any> = {
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
    AMD: {
      "1D": [
        { time: "09:30", price: 150.2 },
        { time: "10:00", price: 152.3 },
        { time: "10:30", price: 151.8 },
        { time: "11:00", price: 153.1 },
        { time: "11:30", price: 154.2 },
        { time: "12:00", price: 153.9 },
        { time: "12:30", price: 154.8 },
        { time: "13:00", price: 155.3 },
        { time: "13:30", price: 156.1 },
        { time: "14:00", price: 155.7 },
        { time: "14:30", price: 156.8 },
        { time: "15:00", price: 157.2 },
        { time: "15:30", price: 155.9 },
        { time: "16:00", price: 154.5 },
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
    GOOGL: {
      "1D": [
        { time: "09:30", price: 138.2 },
        { time: "10:00", price: 138.8 },
        { time: "10:30", price: 138.5 },
        { time: "11:00", price: 139.3 },
        { time: "11:30", price: 139.9 },
        { time: "12:00", price: 139.6 },
        { time: "12:30", price: 140.2 },
        { time: "13:00", price: 140.7 },
        { time: "13:30", price: 141.3 },
        { time: "14:00", price: 141.0 },
        { time: "14:30", price: 141.6 },
        { time: "15:00", price: 141.9 },
        { time: "15:30", price: 140.8 },
        { time: "16:00", price: 140.2 },
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
    const result: any = {
      time: item.time,
      [stocks[0]]: ((item.price - stock1Start) / stock1Start) * 100,
    };

    if (stocks[1] && stock2Data[index]) {
      result[stocks[1]] = ((stock2Data[index].price - stock2Start) / stock2Start) * 100;
    }

    return result;
  });
};

export function StockComparison() {
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [isTimeframeDropdownOpen, setIsTimeframeDropdownOpen] = useState(false);
  const [selectedStocks, setSelectedStocks] = useState<string[]>(["NVDA", "TSLA"]);
  const [isStockDropdownOpen, setIsStockDropdownOpen] = useState<number | null>(null);
  const [selectedNewsIds, setSelectedNewsIds] = useState<string[]>([]);

  const data = normalizeData(selectedStocks, timeframe);

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
  const allNews = [
    ...sectorNewsData,
    ...(selectedStocks[0] ? stockNewsData[selectedStocks[0]] || [] : []),
    ...(selectedStocks[1] ? stockNewsData[selectedStocks[1]] || [] : []),
  ];

  const selectedNews = allNews.filter((news) => selectedNewsIds.includes(news.id));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-4 rounded-xl backdrop-blur-xl bg-black/90 border border-white/20">
          <p className="text-sm text-gray-400 mb-2">{payload[0].payload.time}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 mb-1">
              <span className="text-xs text-gray-300">{entry.dataKey}:</span>
              <span className={`text-sm ${entry.value >= 0 ? 'text-white' : 'text-gray-400'}`}>
                {entry.value >= 0 ? '+' : ''}{entry.value.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Stock Comparison Chart */}
      <div className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg mb-1">Stock Screener</h3>
            <p className="text-sm text-gray-400">Normalized percentage change comparison</p>
          </div>
        </div>

        {/* Stock Selectors */}
        <div className="flex items-center gap-4 mb-6">
          {[0, 1].map((index) => (
            <div key={index} className="relative flex-1">
              <motion.button
                onClick={() => setIsStockDropdownOpen(isStockDropdownOpen === index ? null : index)}
                className="w-full px-4 py-3 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 text-sm flex items-center justify-between"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="text-left">
                  <div className="font-medium">{selectedStocks[index]}</div>
                  <div className="text-xs text-gray-400">
                    {availableStocks.find(s => s.symbol === selectedStocks[index])?.name || "Select Stock"}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${
                    isStockDropdownOpen === index ? "rotate-180" : ""
                  }`}
                />
              </motion.button>

              <AnimatePresence>
                {isStockDropdownOpen === index && (
                  <>
                    <motion.div
                      className="fixed inset-0 z-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsStockDropdownOpen(null)}
                    />

                    <motion.div
                      className="absolute top-full left-0 mt-2 w-full rounded-xl backdrop-blur-xl bg-black/90 border border-white/10 shadow-2xl z-20 overflow-hidden"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {availableStocks
                        .filter(stock => !selectedStocks.includes(stock.symbol) || stock.symbol === selectedStocks[index])
                        .map((stock) => (
                          <motion.button
                            key={stock.symbol}
                            onClick={() => handleStockSelect(index, stock.symbol)}
                            className={`w-full px-4 py-3 text-left text-sm transition-all duration-200 ${
                              selectedStocks[index] === stock.symbol
                                ? "bg-white/20 text-white"
                                : "text-gray-300 hover:bg-white/10 hover:text-white"
                            }`}
                            whileHover={{ x: 4 }}
                          >
                            <div className="font-medium">{stock.symbol}</div>
                            <div className="text-xs text-gray-400">{stock.name}</div>
                          </motion.button>
                        ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ))}

          {/* Timeframe Dropdown */}
          <div className="relative">
            <motion.button
              onClick={() => setIsTimeframeDropdownOpen(!isTimeframeDropdownOpen)}
              className="px-4 py-3 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 text-sm flex items-center gap-2 min-w-[160px] justify-between"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>{timeframeLabels[timeframe]}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ${
                  isTimeframeDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </motion.button>

            <AnimatePresence>
              {isTimeframeDropdownOpen && (
                <>
                  <motion.div
                    className="fixed inset-0 z-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsTimeframeDropdownOpen(false)}
                  />

                  <motion.div
                    className="absolute top-full right-0 mt-2 w-48 rounded-xl backdrop-blur-xl bg-black/90 border border-white/10 shadow-2xl z-20 overflow-hidden"
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
        </div>

        {/* Chart */}
        <div className="h-96 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <defs>
                <linearGradient id="stock1Gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgba(255, 255, 255, 0.1)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="rgba(255, 255, 255, 0.1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="stock2Gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgba(200, 180, 100, 0.15)" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="rgba(200, 180, 100, 0.15)" stopOpacity={0} />
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
                stroke="rgba(255, 255, 255, 0.3)"
                style={{ fontSize: "12px" }}
                tick={{ fill: "rgba(255, 255, 255, 0.5)" }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              
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
                    stroke="rgba(255, 255, 255, 0.8)"
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
                    stroke="rgba(200, 180, 100, 0.85)"
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

                // Determine which stock this news belongs to
                let stockSymbol = null;
                let markerColor = { fill: "rgba(255, 255, 255, 0.3)", stroke: "rgba(255, 255, 255, 0.8)" };

                // Check if it's a stock-specific news
                if (news.id.startsWith(selectedStocks[0]?.toLowerCase())) {
                  stockSymbol = selectedStocks[0];
                  markerColor = { fill: "rgba(255, 255, 255, 0.3)", stroke: "rgba(255, 255, 255, 0.8)" };
                } else if (selectedStocks[1] && news.id.startsWith(selectedStocks[1]?.toLowerCase())) {
                  stockSymbol = selectedStocks[1];
                  markerColor = { fill: "rgba(200, 200, 200, 0.3)", stroke: "rgba(200, 200, 200, 0.8)" };
                } else if (news.id.startsWith('sector-')) {
                  // Sector news - show on both lines
                  const markers = [];
                  if (selectedStocks[0] && dataPoint[selectedStocks[0]] !== undefined) {
                    markers.push(
                      <ReferenceDot
                        key={`${i}-stock1`}
                        x={news.time}
                        y={dataPoint[selectedStocks[0]]}
                        r={8}
                        fill="rgba(255, 255, 255, 0.3)"
                        stroke="rgba(255, 255, 255, 0.8)"
                        strokeWidth={2}
                      />
                    );
                  }
                  if (selectedStocks[1] && dataPoint[selectedStocks[1]] !== undefined) {
                    markers.push(
                      <ReferenceDot
                        key={`${i}-stock2`}
                        x={news.time}
                        y={dataPoint[selectedStocks[1]]}
                        r={8}
                        fill="rgba(200, 200, 200, 0.3)"
                        stroke="rgba(200, 200, 200, 0.8)"
                        strokeWidth={2}
                      />
                    );
                  }
                  return markers;
                }

                // Stock-specific news
                if (stockSymbol && dataPoint[stockSymbol] !== undefined) {
                  return (
                    <ReferenceDot
                      key={i}
                      x={news.time}
                      y={dataPoint[stockSymbol]}
                      r={8}
                      fill={markerColor.fill}
                      stroke={markerColor.stroke}
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
        <div className="mt-4 flex items-center gap-6 text-xs text-gray-400">
          {selectedStocks[0] && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-white/80" />
              <span>{selectedStocks[0]}</span>
            </div>
          )}
          {selectedStocks[1] && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5" style={{ backgroundColor: "rgba(200, 180, 100, 0.85)" }} />
              <span>{selectedStocks[1]}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-white/80 bg-white/30" />
            <span>News Event</span>
          </div>
        </div>
      </div>

      {/* News Selector */}
      <div className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10">
        <h3 className="text-lg mb-4">News Events</h3>
        <p className="text-sm text-gray-400 mb-6">
          Toggle news events to display on the comparison chart
        </p>

        <div className="space-y-3">
          {/* Sector News Section */}
          <div>
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Sector News</div>
            {sectorNewsData.map((news) => (
              <motion.div
                key={news.id}
                className="p-4 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 mb-2"
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
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          news.sentiment === "positive"
                            ? "bg-white/15 text-white"
                            : news.sentiment === "negative"
                            ? "bg-white/10 text-gray-400"
                            : "bg-white/5 text-gray-500"
                        }`}
                      >
                        {news.sentiment}
                      </span>
                    </div>
                    <div className="text-sm mb-1">{news.title}</div>
                    <div className="text-xs text-gray-400">{news.description}</div>
                  </div>
                  <motion.button
                    onClick={() => handleToggleNews(news.id)}
                    className={`p-2 rounded-lg backdrop-blur-xl border transition-all duration-300 ${
                      selectedNewsIds.includes(news.id)
                        ? "bg-white/20 border-white/40"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {selectedNewsIds.includes(news.id) ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Individual Stock News */}
          {selectedStocks.map((stockSymbol, index) => {
            const stockNews = stockNewsData[stockSymbol] || [];
            if (stockNews.length === 0) return null;

            return (
              <div key={stockSymbol}>
                <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider mt-4">
                  {stockSymbol} News
                </div>
                {stockNews.map((news) => (
                  <motion.div
                    key={news.id}
                    className="p-4 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 mb-2"
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
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              news.sentiment === "positive"
                                ? "bg-white/15 text-white"
                                : news.sentiment === "negative"
                                ? "bg-white/10 text-gray-400"
                                : "bg-white/5 text-gray-500"
                            }`}
                          >
                            {news.sentiment}
                          </span>
                        </div>
                        <div className="text-sm mb-1">{news.title}</div>
                        <div className="text-xs text-gray-400">{news.description}</div>
                      </div>
                      <motion.button
                        onClick={() => handleToggleNews(news.id)}
                        className={`p-2 rounded-lg backdrop-blur-xl border transition-all duration-300 ${
                          selectedNewsIds.includes(news.id)
                            ? "bg-white/20 border-white/40"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {selectedNewsIds.includes(news.id) ? (
                          <X className="w-4 h-4" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}