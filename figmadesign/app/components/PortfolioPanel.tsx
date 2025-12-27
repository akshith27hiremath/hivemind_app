import { motion } from "motion/react";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";

export function PortfolioPanel() {
  const [showAddForm, setShowAddForm] = useState(false);

  const portfolioHoldings = [
    {
      symbol: "NVDA",
      name: "NVIDIA Corporation",
      shares: 50,
      avgPrice: 420.5,
      currentPrice: 494.3,
      value: 24715,
      change: 17.55,
      sector: "Technology",
    },
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      shares: 100,
      avgPrice: 175.2,
      currentPrice: 182.8,
      value: 18280,
      change: 4.34,
      sector: "Technology",
    },
    {
      symbol: "TSLA",
      name: "Tesla Inc.",
      shares: 30,
      avgPrice: 245.8,
      currentPrice: 238.5,
      value: 7155,
      change: -2.97,
      sector: "Automotive",
    },
    {
      symbol: "MSFT",
      name: "Microsoft Corporation",
      shares: 40,
      avgPrice: 365.9,
      currentPrice: 402.1,
      value: 16084,
      change: 9.89,
      sector: "Technology",
    },
  ];

  const totalValue = portfolioHoldings.reduce((sum, holding) => sum + holding.value, 0);
  const totalChange =
    portfolioHoldings.reduce(
      (sum, holding) => sum + (holding.value * holding.change) / 100,
      0
    ) / totalValue * 100;

  return (
    <div>
      {/* Portfolio Summary */}
      <motion.div
        className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 mb-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg mb-1">Portfolio Value</h3>
            <div className="text-3xl mb-2">${totalValue.toLocaleString()}</div>
            <div className="flex items-center gap-2 text-sm">
              {totalChange >= 0 ? (
                <TrendingUp className="w-4 h-4 text-white/80" />
              ) : (
                <TrendingDown className="w-4 h-4 text-white/80" />
              )}
              <span className="text-white/80">
                {totalChange >= 0 ? "+" : ""}
                {totalChange.toFixed(2)}%
              </span>
              <span className="text-gray-400">today</span>
            </div>
          </div>

          <motion.button
            className="px-6 py-3 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 hover:bg-white/15 transition-all duration-300 flex items-center gap-2"
            onClick={() => setShowAddForm(!showAddForm)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Add Position</span>
          </motion.button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white/5">
            <div className="text-xs text-gray-400 mb-1">Holdings</div>
            <div className="text-xl">{portfolioHoldings.length}</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5">
            <div className="text-xs text-gray-400 mb-1">Day's Gain</div>
            <div className="text-xl text-white/80">
              ${((totalValue * totalChange) / 100).toFixed(2)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white/5">
            <div className="text-xs text-gray-400 mb-1">Sectors</div>
            <div className="text-xl">2</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5">
            <div className="text-xs text-gray-400 mb-1">News Items</div>
            <div className="text-xl">34</div>
          </div>
        </div>
      </motion.div>

      {/* Add Position Form */}
      {showAddForm && (
        <motion.div
          className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 mb-6"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <h4 className="mb-4">Add New Position</h4>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Symbol (e.g., AAPL)"
              className="px-4 py-3 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none transition-all"
            />
            <input
              type="number"
              placeholder="Shares"
              className="px-4 py-3 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none transition-all"
            />
            <input
              type="number"
              placeholder="Average Price"
              className="px-4 py-3 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none transition-all"
            />
            <motion.button
              className="px-4 py-3 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 hover:bg-white/15 transition-all text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Add to Portfolio
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Holdings List */}
      <div className="space-y-4">
        <h4 className="text-lg mb-4">Your Holdings</h4>
        {portfolioHoldings.map((holding, index) => (
          <motion.div
            key={holding.symbol}
            className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-all duration-300"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ scale: 1.01 }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-lg">{holding.symbol}</h4>
                  <span className="text-xs px-2 py-1 rounded-lg bg-white/5">
                    {holding.sector}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-4">{holding.name}</p>

                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Shares</div>
                    <div>{holding.shares}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Avg Price</div>
                    <div>${holding.avgPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Current</div>
                    <div>${holding.currentPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Change</div>
                    <div className={holding.change >= 0 ? "text-white/80" : "text-white/80"}>
                      {holding.change >= 0 ? "+" : ""}
                      {holding.change.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-right ml-6">
                <div className="text-xs text-gray-400 mb-1">Value</div>
                <div className="text-2xl mb-1">${holding.value.toLocaleString()}</div>
                <div className="text-sm text-gray-400">
                  {((holding.value / totalValue) * 100).toFixed(1)}% of portfolio
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
