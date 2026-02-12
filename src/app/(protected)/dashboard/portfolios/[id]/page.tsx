"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Plus, Trash2, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

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
  { symbol: "AAPL", name: "Apple Inc.", color: "from-gray-600 to-gray-800" },
  { symbol: "MSFT", name: "Microsoft", color: "from-blue-500 to-blue-700" },
  { symbol: "NVDA", name: "NVIDIA", color: "from-green-500 to-green-700" },
  { symbol: "GOOGL", name: "Alphabet", color: "from-red-500 to-red-700" },
  { symbol: "AMZN", name: "Amazon", color: "from-orange-500 to-orange-700" },
  { symbol: "META", name: "Meta", color: "from-blue-400 to-blue-600" },
  { symbol: "TSM", name: "TSMC", color: "from-purple-500 to-purple-700" },
  { symbol: "JPM", name: "JPMorgan", color: "from-blue-700 to-blue-900" },
  { symbol: "JNJ", name: "J&J", color: "from-red-600 to-red-800" },
  { symbol: "XOM", name: "ExxonMobil", color: "from-red-500 to-red-700" },
  { symbol: "ASML", name: "ASML", color: "from-blue-600 to-blue-800" },
  { symbol: "LRCX", name: "Lam Research", color: "from-teal-500 to-teal-700" },
  { symbol: "AMAT", name: "Applied Materials", color: "from-emerald-500 to-emerald-700" },
  { symbol: "MU", name: "Micron", color: "from-sky-500 to-sky-700" },
  { symbol: "QCOM", name: "Qualcomm", color: "from-blue-500 to-blue-700" },
  { symbol: "AVGO", name: "Broadcom", color: "from-red-400 to-red-600" },
  { symbol: "TXN", name: "Texas Instruments", color: "from-gray-500 to-gray-700" },
  { symbol: "INTC", name: "Intel", color: "from-blue-400 to-blue-600" },
  { symbol: "AMD", name: "AMD", color: "from-green-400 to-green-600" },
  { symbol: "CRM", name: "Salesforce", color: "from-cyan-500 to-cyan-700" },
  { symbol: "GS", name: "Goldman Sachs", color: "from-blue-800 to-blue-950" },
  { symbol: "V", name: "Visa", color: "from-indigo-500 to-indigo-700" },
  { symbol: "MA", name: "Mastercard", color: "from-orange-400 to-orange-600" },
  { symbol: "TSLA", name: "Tesla", color: "from-red-500 to-red-700" },
  { symbol: "NFLX", name: "Netflix", color: "from-red-600 to-red-800" },
  { symbol: "DIS", name: "Disney", color: "from-blue-500 to-blue-700" },
  { symbol: "BA", name: "Boeing", color: "from-blue-600 to-blue-800" },
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
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-500" />
          <span className="text-sm text-gray-400">Loading portfolio...</span>
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
      <motion.nav
        className="mb-6"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href="/dashboard/portfolios"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Portfolios
        </Link>
      </motion.nav>

      {/* Header */}
      <motion.div
        className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {portfolio.name}
          </h1>
          {portfolio.description && (
            <p className="mt-2 text-gray-400 max-w-xl">{portfolio.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 p-4 rounded-xl bg-white/5 border border-white/10">
          <span className="text-sm text-gray-400">Total Value</span>
          <span className="text-3xl font-bold tracking-tight text-white tabular-nums">
            {formatCurrency(totalValue.toString())}
          </span>
        </div>
      </motion.div>

      {/* Add Holding Button / Form */}
      {!showAddForm ? (
        <motion.div
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Holding
          </Button>
        </motion.div>
      ) : (
        <motion.div
          className="mb-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 overflow-hidden"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="border-b border-white/10 bg-white/5 px-6 py-4">
            <h2 className="font-semibold text-white">Add New Holding</h2>
          </div>
          <form onSubmit={handleAddHolding} className="p-6">
            {error && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Stock
                </label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                >
                  <option value="" className="bg-gray-900">Select stock...</option>
                  {AVAILABLE_STOCKS.map((stock) => (
                    <option key={stock.symbol} value={stock.symbol} className="bg-gray-900">
                      {stock.symbol} — {stock.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
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
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all tabular-nums"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
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
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all tabular-nums"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button
                type="submit"
                disabled={isAdding || !symbol || !quantity || !averagePrice}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0"
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
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Holdings Table */}
      {portfolio.holdings.length === 0 ? (
        <motion.div
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/5 py-16 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="rounded-full bg-white/10 p-4 mb-4">
            <BarChart3 className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">No holdings yet</h3>
          <p className="text-gray-400 text-center mb-6 max-w-sm">
            Add your first stock to start tracking your portfolio performance
          </p>
        </motion.div>
      ) : (
        <motion.div
          className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 overflow-hidden"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Stock
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Shares
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Avg Cost
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Current
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Market Value
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Gain/Loss
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {portfolio.holdings.map((holding, index) => {
                  const stockInfo = getStockInfo(holding.symbol);
                  const value = parseFloat(holding.quantity) * parseFloat(holding.currentPrice || holding.averagePrice);
                  const gainLoss = calculateGainLoss(holding);
                  const isPositive = gainLoss !== null && gainLoss >= 0;

                  return (
                    <motion.tr
                      key={holding.id}
                      className="group hover:bg-white/5 transition-colors"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${stockInfo?.color || "from-gray-600 to-gray-800"} flex items-center justify-center text-white font-bold text-xs shadow-lg`}>
                            {holding.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{holding.symbol}</div>
                            <div className="text-sm text-gray-500">{stockInfo?.name || holding.exchange}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-white">
                        {formatNumber(holding.quantity)}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-gray-300">
                        {formatCurrency(holding.averagePrice)}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-white">
                        {formatCurrency(holding.currentPrice)}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums font-semibold text-white">
                        {formatCurrency(value.toString())}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums">
                        {gainLoss !== null ? (
                          <span className={`inline-flex items-center gap-1.5 font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {isPositive ? "+" : ""}
                            {formatCurrency(gainLoss.toString())}
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteHolding(holding.id)}
                          disabled={deletingId === holding.id}
                          className="opacity-0 group-hover:opacity-100 rounded-lg p-2 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
