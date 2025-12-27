import { motion } from "motion/react";
import { TrendingUp, Zap, Brain, ArrowRight } from "lucide-react";
import { useState } from "react";

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [timePerArticle, setTimePerArticle] = useState<number>(5);
  const [numArticles, setNumArticles] = useState<number>(20);

  // Calculate savings
  const minutesSavedPerDay = timePerArticle * numArticles;
  const hoursSavedPerYear = ((minutesSavedPerDay * 365) / 60).toFixed(0);
  const daysSavedPerYear = (Number(hoursSavedPerYear) / 24).toFixed(1);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Animated background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 opacity-80" />
      
      {/* Floating orbs for visual interest */}
      <motion.div
        className="fixed top-20 left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="fixed bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.5, 0.3, 0.5],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <motion.header
          className="flex items-center justify-center py-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl tracking-tight">Hivemind</span>
          </div>
        </motion.header>

        {/* Hero Section */}
        <div className="container mx-auto px-8 pt-12 pb-20">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <motion.div
              className="inline-block mb-4 px-6 py-2 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 text-sm"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Neural Intelligence for Your Portfolio
            </motion.div>

            <h1 className="text-5xl md:text-6xl mb-6 tracking-tight">
              The Bloomberg Terminal
              <br />
              <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                You Can Afford
              </span>
            </h1>

            <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
              Stop wasting time on repetitive tasks. Hivemind delivers precisely what you need—
              instant news analysis, portfolio impact, and sector insights powered by neural intelligence.
            </p>
          </motion.div>

          {/* Savings Calculator - Main Feature (Immediately after hero) */}
          <motion.div
            className="mt-12 max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
          >
            <div className="p-10 rounded-3xl backdrop-blur-xl bg-white/5 border border-white/10">
              <h2 className="text-3xl mb-2 text-center">Stop Wasting Your Time</h2>
              <p className="text-gray-400 text-center mb-8">
                Calculate exactly how many hours you're throwing away on manual research
              </p>

              <div className="max-w-4xl mx-auto">
                {/* Input Section - Horizontal Layout */}
                <div className="flex items-center justify-center gap-8 mb-8">
                  <div className="flex-1 max-w-xs">
                    <label className="block text-center text-gray-400 mb-3">
                      Minutes per article
                      <span className="block text-xs text-gray-600 mt-1">(avg: 2-3 min to read & understand)</span>
                    </label>
                    <input
                      type="number"
                      value={timePerArticle}
                      onChange={(e) => setTimePerArticle(Number(e.target.value))}
                      min="1"
                      className="w-full px-4 py-4 rounded-xl backdrop-blur-xl bg-black/30 border-2 border-white/20 focus:border-white/40 focus:outline-none transition-colors text-3xl text-center font-medium"
                    />
                  </div>

                  <div className="text-center pt-8">
                    <div className="text-4xl text-white/30">×</div>
                  </div>

                  <div className="flex-1 max-w-xs">
                    <label className="block text-center text-gray-400 mb-3">
                      Articles per day
                      <span className="block text-xs text-gray-600 mt-1">(avg: 2 per stock)</span>
                    </label>
                    <input
                      type="number"
                      value={numArticles}
                      onChange={(e) => setNumArticles(Number(e.target.value))}
                      min="1"
                      className="w-full px-4 py-4 rounded-xl backdrop-blur-xl bg-black/30 border-2 border-white/20 focus:border-white/40 focus:outline-none transition-colors text-3xl text-center font-medium"
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="relative mb-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 text-2xl text-white/30 bg-black">=</span>
                  </div>
                </div>

                {/* Results - Emphasis on Time Saved */}
                <div className="grid md:grid-cols-2 gap-6 mb-12">
                  {/* Daily Result */}
                  <div className="text-center p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Time Wasted Daily</div>
                    <motion.div
                      className="text-6xl mb-2 bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent font-bold"
                      key={minutesSavedPerDay}
                      initial={{ scale: 1.1, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {minutesSavedPerDay}
                    </motion.div>
                    <div className="text-lg text-gray-400">minutes/day</div>
                  </div>

                  {/* Yearly Result */}
                  <div className="text-center p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Time Wasted Yearly</div>
                    <motion.div
                      className="text-6xl mb-2 bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent font-bold"
                      key={hoursSavedPerYear}
                      initial={{ scale: 1.1, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {hoursSavedPerYear}
                    </motion.div>
                    <div className="text-lg text-gray-400 mb-3">hours/year</div>
                    <div className="pt-3 border-t border-white/10">
                      <motion.div
                        className="text-3xl bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent font-bold"
                        key={daysSavedPerYear}
                        initial={{ scale: 1.1, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        {daysSavedPerYear}
                      </motion.div>
                      <div className="text-sm text-gray-500">days/year</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="text-center mt-8">
              <motion.button
                className="group relative px-12 py-5 rounded-2xl backdrop-blur-xl bg-white/10 border-2 border-white/30 hover:bg-white/20 hover:border-white/40 transition-all duration-200 overflow-hidden"
                onClick={onGetStarted}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="relative z-10 flex items-center gap-3 text-xl font-medium">
                  Reclaim Your Time — Get Started
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0"
                  animate={{
                    x: ["-100%", "100%"],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.footer
          className="border-t border-white/10 py-8 text-center text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.6 }}
        >
          <p>© 2025 Hivemind. Neural intelligence for modern portfolios.</p>
        </motion.footer>
      </div>
    </div>
  );
}