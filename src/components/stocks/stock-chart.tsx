"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  AreaSeries,
  CandlestickSeries,
  LineSeries,
  Time,
  createSeriesMarkers,
  ISeriesApi,
  SeriesMarker,
} from "lightweight-charts";
import { Newspaper, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import {
  historicalStockNews,
  type HistoricalNewsEvent,
} from "@/lib/mock-data/news";

interface PriceData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockChartProps {
  data: PriceData[];
  symbol: string;
}

type ChartType = "area" | "candlestick" | "line";
type TimeRange = "1M" | "3M" | "6M" | "1Y" | "5Y" | "MAX";

const TIME_RANGE_DAYS: Record<TimeRange, number | null> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  "5Y": 365 * 5,
  "MAX": null, // Show all data
};

export function StockChart({ data, symbol }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area" | "Candlestick" | "Line"> | null>(null);
  const [chartType, setChartType] = useState<ChartType>("area");
  const [timeRange, setTimeRange] = useState<TimeRange>("1Y");
  const [showNewsMarkers, setShowNewsMarkers] = useState(true);
  const [hoveredNews, setHoveredNews] = useState<HistoricalNewsEvent | null>(null);

  // Get news events for this stock
  const newsEvents = useMemo(() => {
    return historicalStockNews[symbol] || [];
  }, [symbol]);

  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (data.length === 0) return [];

    const days = TIME_RANGE_DAYS[timeRange];
    if (days === null) return data; // MAX - show all

    return data.slice(-days);
  }, [data, timeRange]);

  // Filter news events based on visible date range
  const visibleNewsEvents = useMemo(() => {
    if (filteredData.length === 0 || newsEvents.length === 0) return [];

    const startDate = filteredData[0]?.time;
    const endDate = filteredData[filteredData.length - 1]?.time;

    if (!startDate || !endDate) return [];

    return newsEvents.filter((event) => {
      return event.date >= startDate && event.date <= endDate;
    });
  }, [filteredData, newsEvents]);

  // Calculate performance metrics
  const { isPositive, changePercent } = useMemo(() => {
    if (filteredData.length < 2) {
      return { isPositive: true, changePercent: 0 };
    }

    const firstPrice = filteredData[0]?.close || 0;
    const lastPrice = filteredData[filteredData.length - 1]?.close || 0;
    const change = lastPrice - firstPrice;
    const percent = firstPrice > 0 ? (change / firstPrice) * 100 : 0;

    return {
      isPositive: change >= 0,
      changePercent: percent,
    };
  }, [filteredData]);

  useEffect(() => {
    if (!chartContainerRef.current || filteredData.length === 0) return;

    // Colors based on performance
    const upColor = "#10b981"; // emerald-500
    const downColor = "#ef4444"; // red-500
    const mainColor = isPositive ? upColor : downColor;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f172a" }, // slate-900
        textColor: "#94a3b8", // slate-400
      },
      grid: {
        vertLines: { color: "#1e293b" }, // slate-800
        horzLines: { color: "#1e293b" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: "#334155", // slate-700
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      rightPriceScale: {
        borderColor: "#334155",
        scaleMargins: {
          top: 0.15, // More space for markers
          bottom: 0.1,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#475569", // slate-600
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

    // Add series based on chart type
    let series: ISeriesApi<"Area" | "Candlestick" | "Line">;

    if (chartType === "area") {
      series = chart.addSeries(AreaSeries, {
        lineColor: mainColor,
        topColor: isPositive ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)",
        bottomColor: isPositive ? "rgba(16, 185, 129, 0.0)" : "rgba(239, 68, 68, 0.0)",
        lineWidth: 2,
        priceFormat: {
          type: "price",
          precision: 2,
          minMove: 0.01,
        },
      });

      series.setData(
        filteredData.map((d) => ({
          time: d.time as Time,
          value: d.close,
        }))
      );
    } else if (chartType === "candlestick") {
      series = chart.addSeries(CandlestickSeries, {
        upColor: upColor,
        downColor: downColor,
        borderDownColor: downColor,
        borderUpColor: upColor,
        wickDownColor: downColor,
        wickUpColor: upColor,
      });

      series.setData(
        filteredData.map((d) => ({
          time: d.time as Time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }))
      );
    } else {
      series = chart.addSeries(LineSeries, {
        color: mainColor,
        lineWidth: 2,
        priceFormat: {
          type: "price",
          precision: 2,
          minMove: 0.01,
        },
      });

      series.setData(
        filteredData.map((d) => ({
          time: d.time as Time,
          value: d.close,
        }))
      );
    }

    seriesRef.current = series;

    // Add news markers if enabled
    if (showNewsMarkers && visibleNewsEvents.length > 0) {
      const markers: SeriesMarker<Time>[] = visibleNewsEvents.map((event) => {
        const isPositiveSentiment = event.sentiment === "positive";
        const isNegativeSentiment = event.sentiment === "negative";

        return {
          time: event.date as Time,
          position: isNegativeSentiment ? "belowBar" : "aboveBar",
          color: isPositiveSentiment
            ? "#22c55e" // green-500
            : isNegativeSentiment
            ? "#ef4444" // red-500
            : "#eab308", // yellow-500 for neutral
          shape: isPositiveSentiment
            ? "arrowUp"
            : isNegativeSentiment
            ? "arrowDown"
            : "circle",
          text: event.title.length > 25 ? event.title.slice(0, 25) + "..." : event.title,
          size: event.impact === "high" ? 2 : 1,
        } as SeriesMarker<Time>;
      });

      createSeriesMarkers(series, markers);
    }

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [filteredData, chartType, isPositive, showNewsMarkers, visibleNewsEvents]);

  if (data.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl bg-slate-900 text-slate-400">
        <div className="text-center">
          <p className="mb-2">No price data available for {symbol}</p>
          <p className="text-sm text-slate-500">
            Run sync to fetch historical data
          </p>
        </div>
      </div>
    );
  }

  // Determine which time ranges are available based on data
  const availableRanges = useMemo(() => {
    const totalDays = data.length;
    return (Object.keys(TIME_RANGE_DAYS) as TimeRange[]).map((range) => {
      const days = TIME_RANGE_DAYS[range];
      return {
        range,
        available: days === null || totalDays >= days,
        label: range,
      };
    });
  }, [data.length]);

  return (
    <div className="rounded-xl bg-slate-900 p-4">
      {/* Chart Controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        {/* Left side: Chart type + Performance + News Toggle */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Chart Type Selector */}
          <div className="flex gap-1 rounded-lg bg-slate-800 p-1">
            {(["area", "candlestick", "line"] as ChartType[]).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  chartType === type
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Performance Badge */}
          <div
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              isPositive
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {isPositive ? "+" : ""}
            {changePercent.toFixed(2)}% ({timeRange})
          </div>

          {/* News Markers Toggle */}
          {newsEvents.length > 0 && (
            <button
              onClick={() => setShowNewsMarkers(!showNewsMarkers)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                showNewsMarkers
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <Newspaper className="w-3.5 h-3.5" />
              News ({visibleNewsEvents.length})
            </button>
          )}
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-1 rounded-lg bg-slate-800 p-1">
          {availableRanges.map(({ range, available }) => (
            <button
              key={range}
              onClick={() => available && setTimeRange(range)}
              disabled={!available}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                timeRange === range
                  ? "bg-emerald-600 text-white"
                  : available
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 cursor-not-allowed"
              }`}
              title={!available ? `Not enough data for ${range}` : undefined}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div ref={chartContainerRef} className="w-full" />

      {/* News Events Legend */}
      {showNewsMarkers && visibleNewsEvents.length > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Newspaper className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">News Events in View</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {visibleNewsEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                onMouseEnter={() => setHoveredNews(event)}
                onMouseLeave={() => setHoveredNews(null)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {event.sentiment === "positive" ? (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  ) : event.sentiment === "negative" ? (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{event.date}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        event.impact === "high"
                          ? "bg-red-500/20 text-red-400"
                          : event.impact === "medium"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-slate-600/50 text-slate-400"
                      }`}
                    >
                      {event.impact}
                    </span>
                  </div>
                  <p className="text-sm text-white truncate">{event.title}</p>
                  <p className="text-xs text-slate-400 truncate">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span>Data from Yahoo Finance</span>
          <span className="text-slate-600">|</span>
          <span>
            {filteredData.length.toLocaleString()} data points
            {data.length !== filteredData.length && (
              <span className="text-slate-600">
                {" "}
                (of {data.length.toLocaleString()} total)
              </span>
            )}
          </span>
          {showNewsMarkers && visibleNewsEvents.length > 0 && (
            <>
              <span className="text-slate-600">|</span>
              <span className="text-blue-400">
                {visibleNewsEvents.length} news marker{visibleNewsEvents.length !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
        <span>Scroll to zoom, drag to pan</span>
      </div>
    </div>
  );
}
