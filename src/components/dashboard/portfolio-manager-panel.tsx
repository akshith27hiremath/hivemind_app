"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Briefcase,
  Plus,
  ChevronRight,
  ChevronLeft,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";

// Types matching the database schema
interface Holding {
  id: string;
  symbol: string;
  exchange: string | null;
  quantity: string;
  averagePrice: string;
  currentPrice: string | null;
  currency: string | null;
  instrumentType: string;
}

interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean | null;
  source: string;
  createdAt: string;
  holdings?: Holding[];
}

const AVAILABLE_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
];

// Utility functions
function formatCurrency(value: string | null, currency: string | null = "USD") {
  if (!value) return "-";
  const num = parseFloat(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(num);
}

function formatQuantity(value: string) {
  const num = parseFloat(value);
  return num.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function calculateTotalValue(holdings: Holding[]): number {
  return holdings.reduce((sum, h) => {
    const price = h.currentPrice || h.averagePrice;
    return sum + parseFloat(h.quantity) * parseFloat(price);
  }, 0);
}

function calculateTotalGainLoss(holdings: Holding[]): number {
  return holdings.reduce((sum, h) => {
    if (!h.currentPrice) return sum;
    const current = parseFloat(h.currentPrice);
    const avg = parseFloat(h.averagePrice);
    const qty = parseFloat(h.quantity);
    return sum + (current - avg) * qty;
  }, 0);
}

// Portfolio List View
function PortfolioListView({
  portfolios,
  isLoading,
  onSelect,
  onCreateNew,
  onDelete,
  deletingId,
}: {
  portfolios: Portfolio[];
  isLoading: boolean;
  onSelect: (portfolio: Portfolio) => void;
  onCreateNew: () => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create New Portfolio Button */}
      <motion.button
        onClick={onCreateNew}
        className="w-full p-4 rounded-2xl backdrop-blur-xl bg-white/5 border border-dashed border-white/20 hover:bg-white/10 hover:border-white/30 transition-all flex items-center justify-center gap-2 text-gray-400 hover:text-white"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Plus className="w-5 h-5" />
        <span>Create New Portfolio</span>
      </motion.button>

      {portfolios.length === 0 ? (
        <motion.div
          className="p-8 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400">No portfolios yet. Create your first one!</p>
        </motion.div>
      ) : (
        portfolios.map((portfolio, index) => (
          <motion.div
            key={portfolio.id}
            className="p-5 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.01 }}
            onClick={() => onSelect(portfolio)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="text-lg font-medium">{portfolio.name}</h4>
                  {portfolio.isActive === false && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">
                      Inactive
                    </span>
                  )}
                </div>
                {portfolio.description && (
                  <p className="text-sm text-gray-400 mb-2">{portfolio.description}</p>
                )}
                <p className="text-xs text-gray-500">
                  {portfolio.holdings?.length || 0} holding
                  {(portfolio.holdings?.length || 0) !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(portfolio.id);
                  }}
                  disabled={deletingId === portfolio.id}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 transition-all text-gray-400 hover:text-red-400"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {deletingId === portfolio.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </motion.button>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </div>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}

// Create Portfolio Form
function CreatePortfolioForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create portfolio");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium">Create New Portfolio</h3>
        <motion.button
          onClick={onCancel}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm text-gray-400 mb-2">Portfolio Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Portfolio"
            required
            maxLength={255}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none text-white placeholder-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none text-white placeholder-gray-500 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <motion.button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? "Creating..." : "Create Portfolio"}
          </motion.button>
          <motion.button
            type="button"
            onClick={onCancel}
            className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}

// Portfolio Detail View
function PortfolioDetailView({
  portfolio,
  holdings,
  isLoading,
  onBack,
  onAddHolding,
  onDeleteHolding,
  deletingHoldingId,
}: {
  portfolio: Portfolio;
  holdings: Holding[];
  isLoading: boolean;
  onBack: () => void;
  onAddHolding: () => void;
  onDeleteHolding: (holdingId: string) => void;
  deletingHoldingId: string | null;
}) {
  const totalValue = calculateTotalValue(holdings);
  const totalGainLoss = calculateTotalGainLoss(holdings);
  const isPositive = totalGainLoss >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center gap-4"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <motion.button
          onClick={onBack}
          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h3 className="text-xl font-medium">{portfolio.name}</h3>
          {portfolio.description && (
            <p className="text-sm text-gray-400">{portfolio.description}</p>
          )}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          className="p-4 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-sm text-gray-400 mb-1">Total Value</p>
          <p className="text-2xl font-medium">{formatCurrency(totalValue.toString())}</p>
        </motion.div>

        <motion.div
          className="p-4 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <p className="text-sm text-gray-400 mb-1">Total Gain/Loss</p>
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="w-5 h-5 text-hm-candle-green" />
            ) : (
              <TrendingDown className="w-5 h-5 text-hm-candle-red" />
            )}
            <p className={`text-2xl font-medium ${isPositive ? "text-hm-candle-green" : "text-hm-candle-red"}`}>
              {isPositive ? "+" : ""}
              {formatCurrency(totalGainLoss.toString())}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Holdings Section */}
      <motion.div
        className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium">Holdings</h4>
          <motion.button
            onClick={onAddHolding}
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-all text-sm flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-4 h-4" />
            Add Holding
          </motion.button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-white/50" />
          </div>
        ) : holdings.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-gray-400">No holdings yet. Add your first stock!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {holdings.map((holding, index) => {
              const value = parseFloat(holding.quantity) * parseFloat(holding.currentPrice || holding.averagePrice);
              const gainLoss = holding.currentPrice
                ? (parseFloat(holding.currentPrice) - parseFloat(holding.averagePrice)) * parseFloat(holding.quantity)
                : null;
              const holdingPositive = gainLoss !== null && gainLoss >= 0;

              return (
                <motion.div
                  key={holding.id}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.25 + index * 0.05 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-lg font-medium">{holding.symbol}</span>
                        {holding.exchange && (
                          <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-400">
                            {holding.exchange}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>{formatQuantity(holding.quantity)} shares</span>
                        <span>Avg: {formatCurrency(holding.averagePrice, holding.currency)}</span>
                      </div>
                    </div>

                    <div className="text-right mr-4">
                      <p className="text-lg font-medium">{formatCurrency(value.toString(), holding.currency)}</p>
                      {gainLoss !== null && (
                        <p className={`text-sm ${holdingPositive ? "text-hm-candle-green" : "text-hm-candle-red"}`}>
                          {holdingPositive ? "+" : ""}
                          {formatCurrency(gainLoss.toString(), holding.currency)}
                        </p>
                      )}
                    </div>

                    <motion.button
                      onClick={() => onDeleteHolding(holding.id)}
                      disabled={deletingHoldingId === holding.id}
                      className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 transition-all text-gray-400 hover:text-red-400"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {deletingHoldingId === holding.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Add Holding Form
function AddHoldingForm({
  portfolioId,
  onSuccess,
  onCancel,
}: {
  portfolioId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [averagePrice, setAveragePrice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/portfolios/${portfolioId}/holdings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          quantity: parseFloat(quantity),
          averagePrice: parseFloat(averagePrice),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add holding");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium">Add Holding</h3>
        <motion.button
          onClick={onCancel}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm text-gray-400 mb-2">Stock Symbol *</label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none text-white"
          >
            <option value="" className="bg-gray-900">Select a stock...</option>
            {AVAILABLE_STOCKS.map((stock) => (
              <option key={stock.symbol} value={stock.symbol} className="bg-gray-900">
                {stock.symbol} - {stock.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Quantity *</label>
            <input
              type="number"
              step="0.000001"
              min="0.000001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="10"
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none text-white placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Avg Price ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={averagePrice}
              onChange={(e) => setAveragePrice(e.target.value)}
              placeholder="150.00"
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none text-white placeholder-gray-500"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <motion.button
            type="submit"
            disabled={isLoading || !symbol || !quantity || !averagePrice}
            className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? "Adding..." : "Add Holding"}
          </motion.button>
          <motion.button
            type="button"
            onClick={onCancel}
            className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}

// Main Portfolio Manager Panel
export function PortfolioManagerPanel() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoadingPortfolios, setIsLoadingPortfolios] = useState(true);
  const [isLoadingHoldings, setIsLoadingHoldings] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddHoldingForm, setShowAddHoldingForm] = useState(false);
  const [deletingPortfolioId, setDeletingPortfolioId] = useState<string | null>(null);
  const [deletingHoldingId, setDeletingHoldingId] = useState<string | null>(null);

  // Fetch portfolios
  const fetchPortfolios = useCallback(async () => {
    setIsLoadingPortfolios(true);
    try {
      const response = await fetch("/api/portfolios");
      const data = await response.json();
      if (response.ok) {
        setPortfolios(data.portfolios || []);
      }
    } catch (error) {
      console.error("Failed to fetch portfolios:", error);
    } finally {
      setIsLoadingPortfolios(false);
    }
  }, []);

  // Fetch holdings for selected portfolio
  const fetchHoldings = useCallback(async (portfolioId: string) => {
    setIsLoadingHoldings(true);
    try {
      const response = await fetch(`/api/portfolios/${portfolioId}/holdings`);
      const data = await response.json();
      if (response.ok) {
        setHoldings(data.holdings || []);
      }
    } catch (error) {
      console.error("Failed to fetch holdings:", error);
    } finally {
      setIsLoadingHoldings(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  useEffect(() => {
    if (selectedPortfolio) {
      fetchHoldings(selectedPortfolio.id);
    }
  }, [selectedPortfolio, fetchHoldings]);

  // Handle portfolio selection
  const handleSelectPortfolio = (portfolio: Portfolio) => {
    setSelectedPortfolio(portfolio);
    setShowAddHoldingForm(false);
  };

  // Handle back to list
  const handleBackToList = () => {
    setSelectedPortfolio(null);
    setHoldings([]);
    setShowAddHoldingForm(false);
  };

  // Handle portfolio creation success
  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    fetchPortfolios();
  };

  // Handle add holding success
  const handleAddHoldingSuccess = () => {
    setShowAddHoldingForm(false);
    if (selectedPortfolio) {
      fetchHoldings(selectedPortfolio.id);
    }
  };

  // Handle delete portfolio
  const handleDeletePortfolio = async (id: string) => {
    if (!confirm("Are you sure you want to delete this portfolio? All holdings will be removed.")) {
      return;
    }

    setDeletingPortfolioId(id);
    try {
      const response = await fetch(`/api/portfolios/${id}`, { method: "DELETE" });
      if (response.ok) {
        fetchPortfolios();
      }
    } catch (error) {
      console.error("Failed to delete portfolio:", error);
    } finally {
      setDeletingPortfolioId(null);
    }
  };

  // Handle delete holding
  const handleDeleteHolding = async (holdingId: string) => {
    if (!selectedPortfolio) return;

    setDeletingHoldingId(holdingId);
    try {
      const response = await fetch(
        `/api/portfolios/${selectedPortfolio.id}/holdings/${holdingId}`,
        { method: "DELETE" }
      );
      if (response.ok) {
        fetchHoldings(selectedPortfolio.id);
      }
    } catch (error) {
      console.error("Failed to delete holding:", error);
    } finally {
      setDeletingHoldingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Briefcase className="w-5 h-5 text-white/80" />
          <h3 className="text-lg font-medium">Portfolio Manager</h3>
        </div>
        <p className="text-sm text-gray-400">
          Manage your investment portfolios and track your holdings
        </p>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {showCreateForm ? (
          <CreatePortfolioForm
            key="create-form"
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateForm(false)}
          />
        ) : showAddHoldingForm && selectedPortfolio ? (
          <AddHoldingForm
            key="add-holding-form"
            portfolioId={selectedPortfolio.id}
            onSuccess={handleAddHoldingSuccess}
            onCancel={() => setShowAddHoldingForm(false)}
          />
        ) : selectedPortfolio ? (
          <PortfolioDetailView
            key="portfolio-detail"
            portfolio={selectedPortfolio}
            holdings={holdings}
            isLoading={isLoadingHoldings}
            onBack={handleBackToList}
            onAddHolding={() => setShowAddHoldingForm(true)}
            onDeleteHolding={handleDeleteHolding}
            deletingHoldingId={deletingHoldingId}
          />
        ) : (
          <PortfolioListView
            key="portfolio-list"
            portfolios={portfolios}
            isLoading={isLoadingPortfolios}
            onSelect={handleSelectPortfolio}
            onCreateNew={() => setShowCreateForm(true)}
            onDelete={handleDeletePortfolio}
            deletingId={deletingPortfolioId}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
