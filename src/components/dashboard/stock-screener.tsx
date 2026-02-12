"use client";

import { motion, AnimatePresence } from "motion/react";
import {
  createChart,
  ColorType,
  LineSeries,
  type IChartApi,
  type Time,
  createSeriesMarkers,
  type SeriesMarker,
  type ISeriesApi,
} from "lightweight-charts";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { ChevronDown, Plus, X, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useIntelligenceData } from "./intelligence-data-provider";
import { mapSentiment, toRelativeTime } from "@/lib/intelligence/mappers";
import type { Article, Sentiment } from "@/lib/intelligence/types";

// ============================================
// Types
// ============================================

interface PriceData {
  time: string; // "YYYY-MM-DD"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type Timeframe = "1M" | "3M" | "6M" | "1Y" | "5Y" | "MAX";

const TIME_RANGE_DAYS: Record<Timeframe, number | null> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  "5Y": 1825,
  "MAX": null,
};

const timeframeLabels: Record<Timeframe, string> = {
  "1M": "1 Month",
  "3M": "3 Months",
  "6M": "6 Months",
  "1Y": "1 Year",
  "5Y": "5 Years",
  "MAX": "Max",
};

interface ChartNewsItem {
  id: string;
  time: string; // "YYYY-MM-DD" or ""
  title: string;
  description: string;
  sentiment: Sentiment;
  impact: "high" | "medium" | "low";
  stock?: string;
}

// ============================================
// Stock list — all 27 supported tickers
// ============================================

const STOCK_COLORS = [
  "rgba(255, 255, 255, 0.9)",   // white
  "rgba(234, 179, 8, 0.9)",     // gold
  "rgba(59, 130, 246, 0.85)",   // blue
  "rgba(168, 85, 247, 0.85)",   // purple
  "rgba(236, 72, 153, 0.85)",   // pink
  "rgba(34, 197, 94, 0.85)",    // green
  "rgba(249, 115, 22, 0.85)",   // orange
  "rgba(20, 184, 166, 0.85)",   // teal
  "rgba(239, 68, 68, 0.85)",    // red
  "rgba(99, 102, 241, 0.85)",   // indigo
];

const availableStocks = [
  // Portfolio Holdings (10)
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "TSM", name: "Taiwan Semiconductor" },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "XOM", name: "Exxon Mobil Corporation" },
  // Supply Chain Neighbors (10)
  { symbol: "ASML", name: "ASML Holding" },
  { symbol: "LRCX", name: "Lam Research" },
  { symbol: "AMAT", name: "Applied Materials" },
  { symbol: "MU", name: "Micron Technology" },
  { symbol: "QCOM", name: "Qualcomm Inc." },
  { symbol: "AVGO", name: "Broadcom Inc." },
  { symbol: "TXN", name: "Texas Instruments" },
  { symbol: "INTC", name: "Intel Corporation" },
  { symbol: "AMD", name: "Advanced Micro Devices" },
  { symbol: "CRM", name: "Salesforce Inc." },
  // Competitors / 2nd-Hop (7)
  { symbol: "GS", name: "Goldman Sachs Group" },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "MA", name: "Mastercard Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "NFLX", name: "Netflix Inc." },
  { symbol: "DIS", name: "Walt Disney Co." },
  { symbol: "BA", name: "Boeing Co." },
];

function getStockColor(symbol: string): string {
  const idx = availableStocks.findIndex((s) => s.symbol === symbol);
  return STOCK_COLORS[idx % STOCK_COLORS.length] ?? STOCK_COLORS[0]!;
}

// ============================================
// Helpers
// ============================================

function mapArticleToChartNews(article: Article): ChartNewsItem {
  const signal = article.enrichment?.signals?.[0];
  const publishedDate = article.published_at
    ? article.published_at.split("T")[0] ?? ""
    : "";
  return {
    id: `article-${article.id}`,
    time: publishedDate,
    title: article.title,
    description: article.summary?.slice(0, 120) || "",
    sentiment: signal ? mapSentiment(signal.direction) : "neutral",
    impact:
      signal?.magnitude_category === "major"
        ? "high"
        : signal?.magnitude_category === "moderate"
          ? "medium"
          : "low",
    stock: article.tickers[0],
  };
}

/** Snap a date string to the nearest trading day <= that date in a sorted array */
function findNearestTradingDay(dateStr: string, sortedDates: string[]): string | null {
  if (sortedDates.length === 0) return null;
  // Binary-search for the last date <= dateStr
  let lo = 0;
  let hi = sortedDates.length - 1;
  let best: string | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const d = sortedDates[mid]!;
    if (d <= dateStr) {
      best = d;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

function filterByTimeRange(data: PriceData[], timeframe: Timeframe): PriceData[] {
  const days = TIME_RANGE_DAYS[timeframe];
  if (days === null || data.length <= days) return data;
  return data.slice(-days);
}

function normalizeToPercent(
  data: PriceData[]
): { time: string; value: number }[] {
  if (data.length === 0) return [];
  const firstClose = data[0]!.close;
  if (firstClose === 0) return [];
  return data.map((d) => ({
    time: d.time,
    value: ((d.close - firstClose) / firstClose) * 100,
  }));
}

// ============================================
// Main component
// ============================================

export function StockScreener() {
  const { dashboard } = useIntelligenceData();

  // Stock & timeframe selection
  const [selectedStocks, setSelectedStocks] = useState<string[]>(["NVDA", "TSLA"]);
  const [timeframe, setTimeframe] = useState<Timeframe>("1Y");
  const [isStockDropdownOpen, setIsStockDropdownOpen] = useState<number | null>(null);
  const [isTimeframeDropdownOpen, setIsTimeframeDropdownOpen] = useState(false);

  // Chart data
  const [stockData, setStockData] = useState<Record<string, PriceData[]>>({});
  const [loadingChart, setLoadingChart] = useState(false);

  // News
  const [stockArticles, setStockArticles] = useState<Article[]>([]);
  const [selectedNewsIds, setSelectedNewsIds] = useState<string[]>([]);
  const [newsRange, setNewsRange] = useState<"1D" | "1W" | "1M" | "3M" | "ALL">("1W");

  // Refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const timeframeRef = useRef<HTMLDivElement>(null);
  const stockRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];

  // ---- Fetch historical data for both stocks ----
  useEffect(() => {
    let cancelled = false;
    async function fetchBoth() {
      setLoadingChart(true);
      const results: Record<string, PriceData[]> = {};
      for (const symbol of selectedStocks.filter(Boolean)) {
        try {
          const res = await fetch(`/api/stocks/${symbol}`);
          if (res.ok) {
            const json = await res.json();
            results[symbol] = json.historicalData ?? [];
          }
        } catch {
          // Non-critical — chart will show whatever we got
        }
      }
      if (!cancelled) {
        setStockData(results);
        setLoadingChart(false);
      }
    }
    fetchBoth();
    return () => { cancelled = true; };
  }, [selectedStocks]);

  // ---- Fetch articles for selected stocks ----
  const fetchStockArticles = useCallback(async () => {
    const tickers = selectedStocks.filter(Boolean);
    if (tickers.length === 0) return;
    const results: Article[] = [];
    for (const ticker of tickers) {
      try {
        const res = await fetch(`/api/intelligence/articles?ticker=${ticker}&limit=30`);
        if (res.ok) {
          const data = await res.json();
          results.push(...(data.data ?? []));
        }
      } catch {
        // Non-critical
      }
    }
    setStockArticles(results);
  }, [selectedStocks]);

  useEffect(() => {
    fetchStockArticles();
  }, [fetchStockArticles]);

  // ---- Close dropdowns on outside click ----
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

  // ---- Build news items ----
  const digestNews = dashboard?.data?.digest?.sections?.direct_news ?? [];

  const uniqueNews = useMemo(() => {
    const allChartNews: ChartNewsItem[] = [
      ...stockArticles.map(mapArticleToChartNews),
      ...digestNews
        .filter((d) =>
          d.affected_holdings.some((h) => selectedStocks.includes(h))
        )
        .map((d) => ({
          id: `digest-${d.article_id}`,
          time: d.published_at ? (d.published_at.split("T")[0] ?? "") : "",
          title: d.headline,
          description: d.summary?.slice(0, 120) || "",
          sentiment: mapSentiment(d.sentiment ?? "NEUTRAL"),
          impact: (
            d.magnitude === "major"
              ? "high"
              : d.magnitude === "moderate"
                ? "medium"
                : "low"
          ) as "high" | "medium" | "low",
          stock: d.affected_holdings[0],
        })),
    ];

    const seenTitles = new Set<string>();
    return allChartNews.filter((n) => {
      if (seenTitles.has(n.title)) return false;
      seenTitles.add(n.title);
      return true;
    });
  }, [stockArticles, digestNews, selectedStocks]);

  const NEWS_RANGE_DAYS: Record<typeof newsRange, number | null> = {
    "1D": 1, "1W": 7, "1M": 30, "3M": 90, "ALL": null,
  };

  const filteredNews = useMemo(() => {
    const days = NEWS_RANGE_DAYS[newsRange];
    if (days === null) return uniqueNews;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0]!;
    return uniqueNews.filter((n) => n.time >= cutoffStr);
  }, [uniqueNews, newsRange]);

  const selectedNews = useMemo(
    () => filteredNews.filter((news) => selectedNewsIds.includes(news.id)),
    [filteredNews, selectedNewsIds]
  );

  // ---- Create lightweight-charts ----
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const stock1 = selectedStocks[0];
    const stock2 = selectedStocks[1];
    const data1 = stock1 ? filterByTimeRange(stockData[stock1] ?? [], timeframe) : [];
    const data2 = stock2 ? filterByTimeRange(stockData[stock2] ?? [], timeframe) : [];

    // If still loading or no data yet, don't create chart
    if (data1.length === 0 && data2.length === 0) return;

    const norm1 = normalizeToPercent(data1);
    const norm2 = normalizeToPercent(data2);

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f172a" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 380,
      timeScale: {
        borderColor: "#334155",
        timeVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      rightPriceScale: {
        borderColor: "#334155",
        scaleMargins: { top: 0.15, bottom: 0.1 },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#475569",
          width: 1,
          style: 2,
          labelBackgroundColor: "#334155",
        },
        horzLine: {
          color: "#475569",
          width: 1,
          style: 2,
          labelBackgroundColor: "#334155",
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
    });

    chartRef.current = chart;

    // Add series 1
    let series1: ISeriesApi<"Line"> | null = null;
    if (stock1 && norm1.length > 0) {
      series1 = chart.addSeries(LineSeries, {
        color: getStockColor(stock1),
        lineWidth: 2,
        priceFormat: {
          type: "custom",
          formatter: (v: number) => v.toFixed(2) + "%",
        },
      });
      series1.setData(
        norm1.map((d) => ({ time: d.time as Time, value: d.value }))
      );
    }

    // Add series 2
    let series2: ISeriesApi<"Line"> | null = null;
    if (stock2 && norm2.length > 0) {
      series2 = chart.addSeries(LineSeries, {
        color: getStockColor(stock2),
        lineWidth: 2,
        priceFormat: {
          type: "custom",
          formatter: (v: number) => v.toFixed(2) + "%",
        },
      });
      series2.setData(
        norm2.map((d) => ({ time: d.time as Time, value: d.value }))
      );
    }

    // News markers — snap each news date to nearest trading day
    if (selectedNews.length > 0) {
      const dates1 = norm1.map((d) => d.time);
      const dates2 = norm2.map((d) => d.time);

      const markers1: SeriesMarker<Time>[] = [];
      const markers2: SeriesMarker<Time>[] = [];

      for (const news of selectedNews) {
        if (!news.time) continue;

        const isPositiveSentiment = news.sentiment === "positive";
        const isNegativeSentiment = news.sentiment === "negative";

        // Decide which series this marker belongs to
        const usesSeries2 = news.stock === stock2 && series2;
        const targetDates = usesSeries2 ? dates2 : dates1;
        const snappedDate = findNearestTradingDay(news.time, targetDates);
        if (!snappedDate) continue;

        const marker: SeriesMarker<Time> = {
          time: snappedDate as Time,
          position: isNegativeSentiment ? "belowBar" : "aboveBar",
          color: isPositiveSentiment
            ? "#22c55e"
            : isNegativeSentiment
              ? "#ef4444"
              : "#eab308",
          shape: isPositiveSentiment
            ? "arrowUp"
            : isNegativeSentiment
              ? "arrowDown"
              : "circle",
          text:
            news.title.length > 25
              ? news.title.slice(0, 25) + "..."
              : news.title,
          size: news.impact === "high" ? 2 : 1,
        };

        if (usesSeries2) {
          markers2.push(marker);
        } else if (series1) {
          markers1.push(marker);
        }
      }

      if (series1 && markers1.length > 0) {
        markers1.sort((a, b) => (a.time as string).localeCompare(b.time as string));
        createSeriesMarkers(series1, markers1);
      }
      if (series2 && markers2.length > 0) {
        markers2.sort((a, b) => (a.time as string).localeCompare(b.time as string));
        createSeriesMarkers(series2, markers2);
      }
    }

    chart.timeScale().fitContent();

    // Resize handler
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [stockData, selectedStocks, timeframe, selectedNews]);

  // ---- Handlers ----
  const handleStockSelect = (index: number, symbol: string) => {
    const newStocks = [...selectedStocks];
    newStocks[index] = symbol;
    setSelectedStocks(newStocks);
    setIsStockDropdownOpen(null);
    setSelectedNewsIds([]);
  };

  const handleToggleNews = (id: string) => {
    setSelectedNewsIds((prev) =>
      prev.includes(id) ? prev.filter((newsId) => newsId !== id) : [...prev, id]
    );
  };

  // ---- Performance metrics ----
  const perfMetrics = useMemo(() => {
    return selectedStocks.map((symbol) => {
      const raw = stockData[symbol] ?? [];
      const filtered = filterByTimeRange(raw, timeframe);
      if (filtered.length < 2) return { symbol, change: 0, isPositive: true };
      const first = filtered[0]!.close;
      const last = filtered[filtered.length - 1]!.close;
      const pct = first > 0 ? ((last - first) / first) * 100 : 0;
      return { symbol, change: pct, isPositive: pct >= 0 };
    });
  }, [stockData, selectedStocks, timeframe]);

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Chart Card */}
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

          {/* Performance Badges */}
          <div className="flex items-center gap-2">
            {perfMetrics.map((m) => (
              <div
                key={m.symbol}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  m.isPositive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {m.symbol} {m.isPositive ? "+" : ""}
                {m.change.toFixed(2)}%
              </div>
            ))}
          </div>
        </div>

        {/* Stock Selectors + Timeframe */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {[0, 1].map((index) => (
            <div
              key={index}
              className="relative flex-1 min-w-[180px]"
              ref={stockRefs[index]}
            >
              <button
                onClick={() =>
                  setIsStockDropdownOpen(
                    isStockDropdownOpen === index ? null : index
                  )
                }
                className="w-full px-4 py-3 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-sm flex items-center justify-between"
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: getStockColor(selectedStocks[index] ?? "") }}
                    />
                    <span className="font-medium">{selectedStocks[index]}</span>
                  </div>
                  <div className="text-xs text-gray-400 ml-[18px]">
                    {availableStocks.find(
                      (s) => s.symbol === selectedStocks[index]
                    )?.name || "Select Stock"}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${isStockDropdownOpen === index ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {isStockDropdownOpen === index && (
                  <motion.div
                    className="absolute top-full left-0 mt-2 w-full rounded-xl backdrop-blur-xl bg-black/90 border border-white/10 shadow-2xl z-20 overflow-hidden max-h-64 overflow-y-auto"
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
                        <button
                          key={stock.symbol}
                          onClick={() =>
                            handleStockSelect(index, stock.symbol)
                          }
                          className={`w-full px-4 py-3 text-left text-sm transition-all duration-150 hover:translate-x-1 ${selectedStocks[index] === stock.symbol ? "bg-white/20 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}
                        >
                          <div className="font-medium">{stock.symbol}</div>
                          <div className="text-xs text-gray-400">
                            {stock.name}
                          </div>
                        </button>
                      ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {/* Timeframe Selector */}
          <div className="flex items-center rounded-xl bg-white/5 border border-white/10 p-0.5">
            {(Object.keys(TIME_RANGE_DAYS) as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  timeframe === tf
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:text-white/70"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="relative rounded-xl overflow-hidden">
          {loadingChart && Object.keys(stockData).length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0f172a] z-10">
              <Loader2 className="w-8 h-8 animate-spin text-white/50" />
            </div>
          )}
          <div ref={chartContainerRef} className="w-full" />
          {!loadingChart &&
            Object.keys(stockData).length === 0 && (
              <div className="flex h-[380px] items-center justify-center bg-[#0f172a] rounded-xl text-gray-400">
                <p className="text-sm">Select stocks to compare</p>
              </div>
            )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-6 text-xs text-gray-400">
          {selectedStocks.filter(Boolean).map((symbol) => (
            <div key={symbol} className="flex items-center gap-2">
              <div
                className="w-3 h-0.5 rounded"
                style={{ backgroundColor: getStockColor(symbol) }}
              />
              <span>{symbol}</span>
            </div>
          ))}
          <span className="text-gray-600">|</span>
          <span>Scroll to zoom, drag to pan</span>
          {selectedNews.length > 0 && (
            <>
              <span className="text-gray-600">|</span>
              <span className="text-blue-400">
                {selectedNews.length} news marker
                {selectedNews.length !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
      </motion.div>

      {/* News Events Panel */}
      <motion.div
        className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium mb-1">News Events</h3>
            <p className="text-sm text-gray-400">
              Toggle news events to display as markers on the chart
            </p>
          </div>
          <div className="flex items-center rounded-xl bg-white/5 border border-white/10 p-0.5">
            {(["1D", "1W", "1M", "3M", "ALL"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setNewsRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  newsRange === range
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:text-white/70"
                }`}
              >
                {range === "1D" ? "Today" : range === "1W" ? "Week" : range === "1M" ? "Month" : range === "3M" ? "3 Mo" : "All"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {selectedStocks.map((stockSymbol) => {
            const stockNews = filteredNews.filter(
              (n) => n.stock === stockSymbol || n.stock === undefined
            );

            return (
              <div key={stockSymbol} className="min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getStockColor(stockSymbol) }}
                  />
                  <span className="text-xs text-gray-500 uppercase tracking-wider">
                    {stockSymbol} News ({stockNews.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {stockNews.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">
                      No news in this range
                    </p>
                  ) : (
                    stockNews.map((news) => (
                      <NewsEventCard
                        key={news.id}
                        news={news}
                        isSelected={selectedNewsIds.includes(news.id)}
                        onToggle={() => handleToggleNews(news.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

// ============================================
// News Event Card
// ============================================

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
    <div className="p-4 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
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
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {news.time && (
              <span className="text-gray-500">
                {new Date(news.time + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
            {news.time && news.description && <span className="text-gray-600">-</span>}
            <span className="line-clamp-1">{news.description}</span>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={`p-2 rounded-lg backdrop-blur-xl border hover:scale-110 active:scale-90 transition-all duration-200 ${
            isSelected
              ? "bg-white/20 border-white/40"
              : "bg-white/5 border-white/10 hover:bg-white/10"
          }`}
        >
          {isSelected ? (
            <X className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
