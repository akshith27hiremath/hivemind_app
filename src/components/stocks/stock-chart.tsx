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
} from "lightweight-charts";

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
  const [chartType, setChartType] = useState<ChartType>("area");
  const [timeRange, setTimeRange] = useState<TimeRange>("1Y");

  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (data.length === 0) return [];

    const days = TIME_RANGE_DAYS[timeRange];
    if (days === null) return data; // MAX - show all

    return data.slice(-days);
  }, [data, timeRange]);

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
          top: 0.1,
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
    if (chartType === "area") {
      const areaSeries = chart.addSeries(AreaSeries, {
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

      areaSeries.setData(
        filteredData.map((d) => ({
          time: d.time as Time,
          value: d.close,
        }))
      );
    } else if (chartType === "candlestick") {
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: upColor,
        downColor: downColor,
        borderDownColor: downColor,
        borderUpColor: upColor,
        wickDownColor: downColor,
        wickUpColor: upColor,
      });

      candlestickSeries.setData(
        filteredData.map((d) => ({
          time: d.time as Time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }))
      );
    } else {
      const lineSeries = chart.addSeries(LineSeries, {
        color: mainColor,
        lineWidth: 2,
        priceFormat: {
          type: "price",
          precision: 2,
          minMove: 0.01,
        },
      });

      lineSeries.setData(
        filteredData.map((d) => ({
          time: d.time as Time,
          value: d.close,
        }))
      );
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
  }, [filteredData, chartType, isPositive]);

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
        {/* Left side: Chart type + Performance */}
        <div className="flex items-center gap-4">
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
        </div>
        <span>Scroll to zoom, drag to pan</span>
      </div>
    </div>
  );
}
