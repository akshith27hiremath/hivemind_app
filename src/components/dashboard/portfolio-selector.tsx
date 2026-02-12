"use client";

import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Briefcase, Plus } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useIntelligenceData } from "./intelligence-data-provider";
import { useDashboard } from "./dashboard-context";
import { useRouter, usePathname } from "next/navigation";

export function PortfolioSelector() {
  const { portfolios, selectedPortfolioId, setSelectedPortfolioId } =
    useIntelligenceData();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { setActivePanel } = useDashboard();
  const router = useRouter();
  const pathname = usePathname();

  const goToPortfolioPanel = () => {
    setActivePanel("portfolio");
    if (pathname !== "/dashboard") {
      router.push("/dashboard");
    }
  };

  const selectedPortfolio = portfolios.find(
    (p) => p.id === selectedPortfolioId
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (portfolios.length === 0) {
    return (
      <button
        onClick={goToPortfolioPanel}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm text-gray-300"
      >
        <Plus className="w-4 h-4" />
        <span>Create Portfolio</span>
      </button>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
      >
        <Briefcase className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-white max-w-[160px] truncate">
          {selectedPortfolio?.name ?? "Select Portfolio"}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 rounded-xl backdrop-blur-2xl bg-gray-900/95 border border-white/10 shadow-2xl z-50 overflow-hidden"
          >
            {portfolios.map((portfolio) => (
              <button
                key={portfolio.id}
                onClick={() => {
                  setSelectedPortfolioId(portfolio.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 transition-all ${
                  portfolio.id === selectedPortfolioId
                    ? "bg-white/10"
                    : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white truncate">
                    {portfolio.name}
                  </span>
                  {portfolio.isActive && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  )}
                </div>
                {portfolio.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {portfolio.description}
                  </p>
                )}
              </button>
            ))}

            <button
              onClick={() => {
                setIsOpen(false);
                goToPortfolioPanel();
              }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-400 hover:bg-white/5 border-t border-white/10 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manage Portfolios</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
