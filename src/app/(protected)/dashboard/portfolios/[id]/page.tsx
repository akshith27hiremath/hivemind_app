"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Holding {
  id: string;
  symbol: string;
  exchange: string | null;
  quantity: string;
  averagePrice: string;
  currentPrice: string | null;
  currency: string | null;
}

interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean | null;
  createdAt: string;
  holdings: Holding[];
}

const AVAILABLE_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc.", color: "bg-gray-900" },
  { symbol: "MSFT", name: "Microsoft", color: "bg-blue-600" },
  { symbol: "GOOGL", name: "Alphabet", color: "bg-red-500" },
  { symbol: "AMZN", name: "Amazon", color: "bg-orange-500" },
  { symbol: "NVDA", name: "NVIDIA", color: "bg-green-600" },
  { symbol: "META", name: "Meta", color: "bg-blue-500" },
  { symbol: "TSLA", name: "Tesla", color: "bg-red-600" },
  { symbol: "JPM", name: "JPMorgan", color: "bg-blue-800" },
  { symbol: "V", name: "Visa", color: "bg-indigo-600" },
  { symbol: "JNJ", name: "Johnson & Johnson", color: "bg-red-700" },
];

export default function PortfolioDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [averagePrice, setAveragePrice] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = async () => {
    try {
      const res = await fetch(`/api/portfolios/${id}`);
      if (res.status === 404) {
        router.push("/dashboard/portfolios");
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setPortfolio(data.portfolio);
      }
    } catch (err) {
      console.error("Failed to fetch portfolio:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, [id]);

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setError(null);

    try {
      const res = await fetch(`/api/portfolios/${id}/holdings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          quantity: parseFloat(quantity),
          averagePrice: parseFloat(averagePrice),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add holding");
      }

      setSymbol("");
      setQuantity("");
      setAveragePrice("");
      setShowAddForm(false);
      fetchPortfolio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteHolding = async (holdingId: string) => {
    setDeletingId(holdingId);
    try {
      const res = await fetch(`/api/portfolios/${id}/holdings/${holdingId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchPortfolio();
      }
    } catch (err) {
      console.error("Failed to delete holding:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (value: string | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(value));
  };

  const formatNumber = (value: string) => {
    return parseFloat(value).toLocaleString("en-US", { maximumFractionDigits: 4 });
  };

  const calculateTotalValue = () => {
    if (!portfolio) return 0;
    return portfolio.holdings.reduce((sum, h) => {
      const price = h.currentPrice || h.averagePrice;
      return sum + parseFloat(h.quantity) * parseFloat(price);
    }, 0);
  };

  const calculateGainLoss = (holding: Holding) => {
    if (!holding.currentPrice) return null;
    const current = parseFloat(holding.currentPrice);
    const avg = parseFloat(holding.averagePrice);
    const qty = parseFloat(holding.quantity);
    return (current - avg) * qty;
  };

  const getStockInfo = (symbol: string) => {
    return AVAILABLE_STOCKS.find((s) => s.symbol === symbol);
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600" />
          <span className="text-sm text-gray-500">Loading portfolio...</span>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return null;
  }

  const totalValue = calculateTotalValue();

  return (
    <div className="min-h-[80vh]">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link href="/dashboard/portfolios" className="text-gray-500 hover:text-gray-700 transition-colors">
              Portfolios
            </Link>
          </li>
          <li className="text-gray-300">/</li>
          <li className="font-medium text-gray-900">{portfolio.name}</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {portfolio.name}
          </h1>
          {portfolio.description && (
            <p className="mt-2 text-gray-500 max-w-xl">{portfolio.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm text-gray-500">Total Value</span>
          <span className="text-3xl font-bold tracking-tight text-gray-900 tabular-nums">
            {formatCurrency(totalValue.toString())}
          </span>
        </div>
      </div>

      {/* Add Holding Button / Form */}
      {!showAddForm ? (
        <div className="mb-6">
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Holding
          </Button>
        </div>
      ) : (
        <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
            <h2 className="font-semibold text-gray-900">Add New Holding</h2>
          </div>
          <form onSubmit={handleAddHolding} className="p-6">
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
                {error}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Stock
                </label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                >
                  <option value="">Select stock...</option>
                  {AVAILABLE_STOCKS.map((stock) => (
                    <option key={stock.symbol} value={stock.symbol}>
                      {stock.symbol} — {stock.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="100"
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all tabular-nums"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Average Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={averagePrice}
                  onChange={(e) => setAveragePrice(e.target.value)}
                  placeholder="150.00"
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all tabular-nums"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button
                type="submit"
                disabled={isAdding || !symbol || !quantity || !averagePrice}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isAdding ? "Adding..." : "Add Holding"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Holdings Table */}
      {portfolio.holdings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-16 px-4">
          <div className="rounded-full bg-gray-100 p-4 mb-4">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No holdings yet</h3>
          <p className="text-gray-500 text-center mb-6 max-w-sm">
            Add your first stock to start tracking your portfolio performance
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Stock
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Shares
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Avg Cost
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Current
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Market Value
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Gain/Loss
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">

                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {portfolio.holdings.map((holding) => {
                  const stockInfo = getStockInfo(holding.symbol);
                  const value = parseFloat(holding.quantity) * parseFloat(holding.currentPrice || holding.averagePrice);
                  const gainLoss = calculateGainLoss(holding);

                  return (
                    <tr key={holding.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg ${stockInfo?.color || "bg-gray-600"} flex items-center justify-center text-white font-bold text-xs shadow-sm`}>
                            {holding.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{holding.symbol}</div>
                            <div className="text-sm text-gray-500">{stockInfo?.name || holding.exchange}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-gray-900">
                        {formatNumber(holding.quantity)}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-gray-900">
                        {formatCurrency(holding.averagePrice)}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-gray-900">
                        {formatCurrency(holding.currentPrice)}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums font-semibold text-gray-900">
                        {formatCurrency(value.toString())}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums">
                        {gainLoss !== null ? (
                          <span className={`font-semibold ${gainLoss >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {gainLoss >= 0 ? "+" : ""}
                            {formatCurrency(gainLoss.toString())}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteHolding(holding.id)}
                          disabled={deletingId === holding.id}
                          className="opacity-0 group-hover:opacity-100 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                        >
                          {deletingId === holding.id ? "..." : "Remove"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
