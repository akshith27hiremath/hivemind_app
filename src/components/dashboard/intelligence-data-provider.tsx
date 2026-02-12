"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import type {
  DashboardResponse,
  SignalAggregationResponse,
  DataStatus,
} from "@/lib/intelligence/types";
import type { Portfolio } from "@/lib/db/schema";

const POLLING_INTERVAL = 300_000; // 5 min
const STALE_THRESHOLD = 600_000; // 10 min

interface IntelligenceContextValue {
  // Data
  dashboard: DashboardResponse | null;
  signals: SignalAggregationResponse | null;

  // Status
  status: DataStatus;
  error: string | null;
  lastFetchedAt: number | null;
  isStale: boolean;

  // Portfolio selection
  portfolios: Portfolio[];
  selectedPortfolioId: string | null;
  setSelectedPortfolioId: (id: string | null) => void;

  // Actions
  refresh: () => Promise<void>;
}

const IntelligenceContext = createContext<IntelligenceContextValue | undefined>(
  undefined
);

export function IntelligenceDataProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [signals, setSignals] = useState<SignalAggregationResponse | null>(
    null
  );
  const [status, setStatus] = useState<DataStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(
    null
  );

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dashboardRef = useRef(dashboard);
  dashboardRef.current = dashboard;

  const isStale =
    status === "stale" ||
    (lastFetchedAt !== null && Date.now() - lastFetchedAt > STALE_THRESHOLD);

  // Fetch portfolios on mount
  useEffect(() => {
    async function loadPortfolios() {
      try {
        const res = await fetch("/api/portfolios");
        if (!res.ok) return;
        const data = await res.json();
        const list: Portfolio[] = data.portfolios ?? [];
        setPortfolios(list);

        // Auto-select first active or first portfolio
        if (list.length > 0 && !selectedPortfolioId) {
          const active = list.find((p) => p.isActive) ?? list[0]!;
          setSelectedPortfolioId(active.id);
        }
      } catch {
        // Portfolios fetch failed — non-critical, user can still see mock data
      }
    }
    loadPortfolios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Main data fetch — uses dashboardRef to avoid re-creating on every fetch
  const fetchData = useCallback(async () => {
    if (!selectedPortfolioId) {
      setStatus("idle");
      return;
    }

    // Don't reset to loading if we have existing data (soft refresh)
    if (!dashboardRef.current) {
      setStatus("loading");
    }

    try {
      const [dashboardRes, signalsRes] = await Promise.all([
        fetch(
          `/api/intelligence/dashboard?portfolioId=${selectedPortfolioId}`
        ),
        fetch(
          `/api/intelligence/signals/aggregate?portfolioId=${selectedPortfolioId}&days=7`
        ),
      ]);

      const isStaleHeader =
        dashboardRes.headers.get("X-Data-Stale") === "true" ||
        signalsRes.headers.get("X-Data-Stale") === "true";

      if (!dashboardRes.ok || !signalsRes.ok) {
        throw new Error("Failed to fetch intelligence data");
      }

      const dashboardData = await dashboardRes.json();
      const signalsData = await signalsRes.json();

      setDashboard(dashboardData);
      setSignals(signalsData);
      setError(null);
      setLastFetchedAt(Date.now());
      setStatus(isStaleHeader ? "stale" : "success");
    } catch (err) {
      console.error("Intelligence data fetch error:", err);

      // If we have previous data, mark as stale instead of error
      if (dashboardRef.current) {
        setStatus("stale");
        setError("Failed to refresh — showing cached data");
      } else {
        setStatus("error");
        setError(
          err instanceof Error ? err.message : "Failed to fetch data"
        );
      }
    }
  }, [selectedPortfolioId]);

  // Fetch on portfolio change
  useEffect(() => {
    if (selectedPortfolioId) {
      fetchData();
    }
  }, [selectedPortfolioId, fetchData]);

  // Polling
  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    pollingRef.current = setInterval(fetchData, POLLING_INTERVAL);
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchData]);

  // Visibility-based refresh
  useEffect(() => {
    function handleVisibility() {
      if (
        document.visibilityState === "visible" &&
        lastFetchedAt &&
        Date.now() - lastFetchedAt > STALE_THRESHOLD
      ) {
        fetchData();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchData, lastFetchedAt]);

  const value = useMemo(
    () => ({
      dashboard,
      signals,
      status,
      error,
      lastFetchedAt,
      isStale,
      portfolios,
      selectedPortfolioId,
      setSelectedPortfolioId,
      refresh: fetchData,
    }),
    [
      dashboard,
      signals,
      status,
      error,
      lastFetchedAt,
      isStale,
      portfolios,
      selectedPortfolioId,
      fetchData,
    ]
  );

  return (
    <IntelligenceContext.Provider value={value}>
      {children}
    </IntelligenceContext.Provider>
  );
}

export function useIntelligenceData() {
  const context = useContext(IntelligenceContext);
  if (context === undefined) {
    throw new Error(
      "useIntelligenceData must be used within an IntelligenceDataProvider"
    );
  }
  return context;
}
