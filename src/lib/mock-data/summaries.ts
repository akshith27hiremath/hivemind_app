export interface SummaryItem {
  id: number;
  stock: string;
  impact: "positive" | "negative" | "neutral";
  change: string;
  reason: string;
  news: string;
  confidence: number;
}

export const summaryItems: SummaryItem[] = [
  {
    id: 1,
    stock: "NVDA",
    impact: "positive",
    change: "+3.2%",
    reason:
      "New AI chip announcement drives strong market sentiment. Analyst upgrades from multiple firms including Morgan Stanley and Goldman Sachs.",
    news: "Breakthrough AI chip architecture revealed at tech conference",
    confidence: 94,
  },
  {
    id: 2,
    stock: "AAPL",
    impact: "neutral",
    change: "+0.1%",
    reason:
      "Minor supply chain updates with minimal impact. Market consolidation continues as investors await Q1 earnings.",
    news: "Supplier diversification in Asian markets progresses",
    confidence: 67,
  },
  {
    id: 3,
    stock: "TSLA",
    impact: "negative",
    change: "-1.8%",
    reason:
      "European delivery numbers below analyst expectations. Regulatory headwinds in key markets creating uncertainty.",
    news: "Q4 European deliveries miss estimates by 12%",
    confidence: 88,
  },
  {
    id: 4,
    stock: "MSFT",
    impact: "positive",
    change: "+2.1%",
    reason:
      "Azure cloud growth exceeds projections. Enterprise AI adoption accelerating faster than expected across Fortune 500.",
    news: "Azure revenue up 31% YoY; AI services adoption surges",
    confidence: 91,
  },
  {
    id: 5,
    stock: "GOOGL",
    impact: "positive",
    change: "+1.5%",
    reason:
      "Search advertising revenue shows resilience. YouTube premium subscriptions hit new milestone.",
    news: "Ad revenue beats estimates despite economic headwinds",
    confidence: 82,
  },
];

export interface PortfolioSummary {
  netImpact: string;
  newsAnalyzed: number;
  avgConfidence: number;
  topMover: string;
  topMoverChange: string;
}

export const portfolioSummary: PortfolioSummary = {
  netImpact: "+1.4%",
  newsAnalyzed: 127,
  avgConfidence: 85,
  topMover: "NVDA",
  topMoverChange: "+3.2%",
};

export interface PortfolioOverview {
  summary: string;
  analysis: string;
  riskFactors: string;
  recommendation: string;
}

export const portfolioOverview: PortfolioOverview = {
  summary:
    "Your portfolio is experiencing strong positive momentum driven by significant developments in the technology sector. The neural intelligence engine has identified three critical catalysts affecting your holdings: NVIDIA's breakthrough AI chip architecture announcement, major cloud infrastructure partnerships, and broader semiconductor industry tailwinds.",
  analysis:
    "Morgan Stanley's upgrade of NVIDIA to Overweight with a raised price target of $550 reflects institutional confidence in sustained AI infrastructure demand. The new GPU architecture represents a 40% performance improvement over current generation, positioning NVIDIA to capture incremental market share in data center and enterprise AI applications. AWS's expanded deployment commitment signals strong near-term revenue visibility.",
  riskFactors:
    "However, the neural engine has detected a moderate risk factor from the Fed's hawkish monetary policy stance, which triggered a 2.1% tech sector pullback. This macro headwind may create short-term volatility, though our correlation analysis suggests your portfolio's AI-focused positioning should outperform broader market indices over the medium term.",
  recommendation:
    "Maintain current positions with a slight overweight in semiconductor holdings. Monitor the 10:30 AM analyst upgrade momentum and consider taking partial profits if NVDA approaches the $520 resistance level. The knowledge graph indicates 78% probability of continued upside over the next 5 trading days.",
};
