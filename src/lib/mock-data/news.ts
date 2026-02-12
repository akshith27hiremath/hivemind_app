// @deprecated - Kept for rollback only. All dashboard components now use Intelligence API via intelligence-data-provider.
// Safe to delete once Intelligence API integration is fully validated in production.

export type NewsImpact = "high" | "medium" | "low";
export type NewsSentiment = "positive" | "negative" | "neutral";
export type NewsCategory = "portfolio" | "market" | "sector";

export interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  time: string;
  timestamp: number;
  source: string;
  impact: NewsImpact;
  sentiment: NewsSentiment;
  category: NewsCategory;
  stocks: string[];
  sector?: string;
  relevance?: number;
}

// Critical news for the summary banner
export const criticalNews: NewsItem[] = [
  {
    id: "crit-1",
    title: "Fed signals potential rate cuts in Q3 2025",
    time: "8 min ago",
    timestamp: Date.now() - 8 * 60 * 1000,
    source: "Reuters",
    impact: "high",
    sentiment: "positive",
    category: "market",
    stocks: ["SPY", "QQQ"],
  },
  {
    id: "crit-2",
    title: "Tech sector sees 4.2% rally on AI infrastructure spending",
    time: "23 min ago",
    timestamp: Date.now() - 23 * 60 * 1000,
    source: "Bloomberg",
    impact: "medium",
    sentiment: "positive",
    category: "sector",
    stocks: ["NVDA", "AMD", "MSFT"],
    sector: "Technology",
  },
  {
    id: "crit-3",
    title: "Energy prices surge 6% amid supply concerns",
    time: "1 hour ago",
    timestamp: Date.now() - 60 * 60 * 1000,
    source: "CNBC",
    impact: "high",
    sentiment: "negative",
    category: "sector",
    stocks: ["XOM", "CVX"],
    sector: "Energy",
  },
];

// Sector news with more detail
export interface SectorNews {
  sector: string;
  news: NewsItem[];
}

export const sectorNews: SectorNews[] = [
  {
    sector: "Technology",
    news: [
      {
        id: "tech-1",
        title: "Major cloud providers announce infrastructure expansion",
        summary:
          "AWS, Azure, and Google Cloud reveal plans for new data centers across emerging markets, signaling strong demand.",
        time: "5 min ago",
        timestamp: Date.now() - 5 * 60 * 1000,
        source: "TechCrunch",
        impact: "high",
        sentiment: "positive",
        category: "sector",
        stocks: ["AMZN", "MSFT", "GOOGL"],
        sector: "Technology",
        relevance: 92,
      },
      {
        id: "tech-2",
        title: "Semiconductor equipment orders surge in December",
        summary:
          "Industry data shows 28% increase in chip manufacturing equipment orders, indicating strong 2025 outlook.",
        time: "1 hour ago",
        timestamp: Date.now() - 60 * 60 * 1000,
        source: "Semiconductor Industry Association",
        impact: "high",
        sentiment: "positive",
        category: "sector",
        stocks: ["NVDA", "AMD", "INTC"],
        sector: "Technology",
        relevance: 88,
      },
      {
        id: "tech-3",
        title: "Enterprise software spending growth decelerates",
        summary:
          "Gartner report suggests companies are becoming more selective with software budgets amid economic uncertainty.",
        time: "2 hours ago",
        timestamp: Date.now() - 2 * 60 * 60 * 1000,
        source: "Gartner",
        impact: "medium",
        sentiment: "neutral",
        category: "sector",
        stocks: ["CRM", "NOW", "ORCL"],
        sector: "Technology",
        relevance: 76,
      },
    ],
  },
  {
    sector: "Automotive",
    news: [
      {
        id: "auto-1",
        title: "EV market share reaches new milestone in Europe",
        summary:
          "Electric vehicles now account for 24% of new car registrations, up from 18% year-over-year.",
        time: "30 min ago",
        timestamp: Date.now() - 30 * 60 * 1000,
        source: "European Automobile Manufacturers Association",
        impact: "high",
        sentiment: "positive",
        category: "sector",
        stocks: ["TSLA", "RIVN", "F"],
        sector: "Automotive",
        relevance: 85,
      },
      {
        id: "auto-2",
        title: "Battery raw material prices show volatility",
        summary:
          "Lithium and cobalt prices fluctuate as supply chain adjustments continue globally.",
        time: "3 hours ago",
        timestamp: Date.now() - 3 * 60 * 60 * 1000,
        source: "Mining Weekly",
        impact: "medium",
        sentiment: "neutral",
        category: "sector",
        stocks: ["TSLA", "GM", "F"],
        sector: "Automotive",
        relevance: 71,
      },
    ],
  },
  {
    sector: "Healthcare",
    news: [
      {
        id: "health-1",
        title: "FDA approves breakthrough cancer treatment",
        summary:
          "New immunotherapy drug receives accelerated approval for late-stage melanoma patients.",
        time: "45 min ago",
        timestamp: Date.now() - 45 * 60 * 1000,
        source: "FDA News",
        impact: "high",
        sentiment: "positive",
        category: "sector",
        stocks: ["MRK", "BMY", "JNJ"],
        sector: "Healthcare",
        relevance: 90,
      },
    ],
  },
];

// Stock-specific news for chart overlays
export interface ChartNewsItem {
  id: string;
  time: string; // Time on chart (e.g., "10:30")
  title: string;
  description: string;
  impact: NewsImpact;
  sentiment: NewsSentiment;
  price: number; // Price at time of news
}

export const stockNewsData: Record<string, ChartNewsItem[]> = {
  NVDA: [
    {
      id: "nvda-1",
      time: "10:30",
      title: "Analyst Upgrade: NVDA to Overweight",
      description: "Morgan Stanley upgrades NVIDIA citing strong AI chip demand.",
      impact: "high",
      sentiment: "positive",
      price: 484.8,
    },
    {
      id: "nvda-2",
      time: "13:00",
      title: "New AI Chip Architecture Announced",
      description: "NVIDIA unveils next-gen GPU architecture with 40% performance boost.",
      impact: "high",
      sentiment: "positive",
      price: 493.8,
    },
    {
      id: "nvda-3",
      time: "15:30",
      title: "Broad Market Correction",
      description: "Tech sector pullback as Fed signals hawkish stance.",
      impact: "medium",
      sentiment: "negative",
      price: 496.7,
    },
  ],
  TSLA: [
    {
      id: "tsla-1",
      time: "11:00",
      title: "Q4 Deliveries Beat Estimates",
      description: "Record deliveries reported for the quarter.",
      impact: "high",
      sentiment: "positive",
      price: 242.5,
    },
    {
      id: "tsla-2",
      time: "14:00",
      title: "New Gigafactory Announcement",
      description: "Expansion into Southeast Asia confirmed.",
      impact: "medium",
      sentiment: "positive",
      price: 245.2,
    },
  ],
  AAPL: [
    {
      id: "aapl-1",
      time: "09:45",
      title: "iPhone Supply Chain Stabilizes",
      description: "Production bottlenecks resolved in key facilities.",
      impact: "medium",
      sentiment: "positive",
      price: 195.5,
    },
  ],
  MSFT: [
    {
      id: "msft-1",
      time: "11:30",
      title: "Azure Growth Exceeds Expectations",
      description: "Cloud revenue up 31% YoY, beating analyst estimates.",
      impact: "high",
      sentiment: "positive",
      price: 375.3,
    },
  ],
};

// Stock-specific news for the news panel
export interface StockNewsItemDetailed {
  id: string;
  stock: string;
  title: string;
  source: string;
  summary: string;
  time: string;
  timestamp: number;
  sentiment: NewsSentiment;
  priceImpact: string;
  impactValue: number;
}

export const stockSpecificNews: StockNewsItemDetailed[] = [
  {
    id: "stock-news-1",
    stock: "NVDA",
    title: "NVIDIA unveils next-generation AI accelerator at tech summit",
    source: "TechCrunch",
    summary:
      "The company's new Blackwell Ultra architecture promises 2.5x performance improvements over current generation, with major cloud providers already committing to large-scale deployments.",
    time: "12 min ago",
    timestamp: Date.now() - 12 * 60 * 1000,
    sentiment: "positive",
    priceImpact: "+3.2%",
    impactValue: 3.2,
  },
  {
    id: "stock-news-2",
    stock: "NVDA",
    title: "Analysts raise price targets following product announcement",
    source: "Bloomberg",
    summary:
      "Multiple Wall Street firms increase NVIDIA price targets, citing strong demand visibility and competitive moat in AI infrastructure.",
    time: "1 hour ago",
    timestamp: Date.now() - 60 * 60 * 1000,
    sentiment: "positive",
    priceImpact: "+1.1%",
    impactValue: 1.1,
  },
  {
    id: "stock-news-3",
    stock: "AAPL",
    title: "Apple diversifies supply chain with new Asian partnerships",
    source: "Reuters",
    summary:
      "Strategic supplier agreements in Vietnam and India aim to reduce manufacturing concentration risks and improve cost structure.",
    time: "2 hours ago",
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    sentiment: "neutral",
    priceImpact: "+0.1%",
    impactValue: 0.1,
  },
  {
    id: "stock-news-4",
    stock: "TSLA",
    title: "European Q4 delivery numbers miss analyst consensus",
    source: "Financial Times",
    summary:
      "Tesla reports 12% shortfall in European deliveries versus expectations, citing production ramp challenges and increased competition.",
    time: "3 hours ago",
    timestamp: Date.now() - 3 * 60 * 60 * 1000,
    sentiment: "negative",
    priceImpact: "-1.8%",
    impactValue: -1.8,
  },
  {
    id: "stock-news-5",
    stock: "MSFT",
    title: "Azure revenue growth exceeds projections in cloud earnings",
    source: "CNBC",
    summary:
      "Microsoft's cloud division posts 31% year-over-year growth, driven by enterprise AI adoption and infrastructure expansion.",
    time: "4 hours ago",
    timestamp: Date.now() - 4 * 60 * 60 * 1000,
    sentiment: "positive",
    priceImpact: "+2.1%",
    impactValue: 2.1,
  },
  {
    id: "stock-news-6",
    stock: "GOOGL",
    title: "Google Cloud wins major government contract",
    source: "Wall Street Journal",
    summary:
      "Multi-billion dollar cloud infrastructure deal signals growing enterprise confidence in Google's AI and cloud capabilities.",
    time: "5 hours ago",
    timestamp: Date.now() - 5 * 60 * 60 * 1000,
    sentiment: "positive",
    priceImpact: "+1.5%",
    impactValue: 1.5,
  },
];

// Sector-wide news that affects all stocks in a sector
export const sectorWideNews: ChartNewsItem[] = [
  {
    id: "sector-1",
    time: "15:30",
    title: "Tech Sector Pullback",
    description: "Fed signals hawkish stance on rates.",
    impact: "high",
    sentiment: "negative",
    price: 0, // Price is determined per-stock
  },
  {
    id: "sector-2",
    time: "09:30",
    title: "Semiconductor Industry Outlook Positive",
    description: "Industry analysts raise forecasts for 2025.",
    impact: "medium",
    sentiment: "positive",
    price: 0,
  },
];

// Historical news events for chart markers (with actual dates)
export interface HistoricalNewsEvent {
  id: string;
  date: string; // YYYY-MM-DD format
  title: string;
  description: string;
  sentiment: NewsSentiment;
  impact: NewsImpact;
}

export const historicalStockNews: Record<string, HistoricalNewsEvent[]> = {
  AAPL: [
    {
      id: "aapl-h1",
      date: "2024-09-09",
      title: "iPhone 16 Launch Event",
      description: "Apple unveils iPhone 16 with Apple Intelligence AI features",
      sentiment: "positive",
      impact: "high",
    },
    {
      id: "aapl-h2",
      date: "2024-06-10",
      title: "WWDC 2024",
      description: "Apple Intelligence announced, partnership with OpenAI revealed",
      sentiment: "positive",
      impact: "high",
    },
    {
      id: "aapl-h3",
      date: "2024-02-01",
      title: "Vision Pro Launch",
      description: "Apple Vision Pro spatial computing headset goes on sale",
      sentiment: "positive",
      impact: "medium",
    },
    {
      id: "aapl-h4",
      date: "2023-09-12",
      title: "iPhone 15 Launch",
      description: "Apple announces iPhone 15 with USB-C and titanium design",
      sentiment: "positive",
      impact: "high",
    },
    {
      id: "aapl-h5",
      date: "2022-06-06",
      title: "M2 Chip Unveiled",
      description: "Next-generation Apple Silicon announced at WWDC",
      sentiment: "positive",
      impact: "medium",
    },
  ],
  MSFT: [
    {
      id: "msft-h1",
      date: "2024-10-01",
      title: "Copilot+ PCs Launch",
      description: "Microsoft launches new AI-powered Windows PCs",
      sentiment: "positive",
      impact: "medium",
    },
    {
      id: "msft-h2",
      date: "2024-01-29",
      title: "Record Cloud Growth",
      description: "Azure revenue up 30%, AI services driving growth",
      sentiment: "positive",
      impact: "high",
    },
    {
      id: "msft-h3",
      date: "2023-11-06",
      title: "OpenAI Partnership Deepens",
      description: "Microsoft increases investment in OpenAI",
      sentiment: "positive",
      impact: "high",
    },
    {
      id: "msft-h4",
      date: "2023-01-23",
      title: "ChatGPT Integration",
      description: "Microsoft announces $10B investment in OpenAI",
      sentiment: "positive",
      impact: "high",
    },
    {
      id: "msft-h5",
      date: "2022-01-18",
      title: "Activision Acquisition",
      description: "Microsoft announces $68.7B Activision Blizzard deal",
      sentiment: "positive",
      impact: "high",
    },
  ],
  GOOGL: [
    {
      id: "googl-h1",
      date: "2024-12-11",
      title: "Gemini 2.0 Launch",
      description: "Google unveils next-gen AI model Gemini 2.0",
      sentiment: "positive",
      impact: "high",
    },
    {
      id: "googl-h2",
      date: "2024-05-14",
      title: "Google I/O 2024",
      description: "AI Overviews and Gemini features announced",
      sentiment: "positive",
      impact: "medium",
    },
    {
      id: "googl-h3",
      date: "2023-12-06",
      title: "Gemini AI Announcement",
      description: "Google launches multimodal AI model Gemini",
      sentiment: "positive",
      impact: "high",
    },
    {
      id: "googl-h4",
      date: "2023-02-06",
      title: "Bard AI Debut",
      description: "Google announces Bard AI chatbot to compete with ChatGPT",
      sentiment: "positive",
      impact: "medium",
    },
  ],
  AMZN: [
    {
      id: "amzn-h1",
      date: "2024-09-20",
      title: "Alexa AI Overhaul",
      description: "Amazon announces major Alexa AI upgrade",
      sentiment: "positive",
      impact: "medium",
    },
    {
      id: "amzn-h2",
      date: "2024-04-30",
      title: "AWS AI Services",
      description: "Amazon expands Bedrock AI platform capabilities",
      sentiment: "positive",
      impact: "medium",
    },
    {
      id: "amzn-h3",
      date: "2023-09-25",
      title: "Anthropic Investment",
      description: "Amazon invests $4B in AI startup Anthropic",
      sentiment: "positive",
      impact: "high",
    },
  ],
  NVDA: [
    {
      id: "nvda-h1",
      date: "2024-11-20",
      title: "Record Earnings",
      description: "NVIDIA posts $35B quarterly revenue, beats estimates",
      sentiment: "positive",
      impact: "high",
    },
    {
      id: "nvda-h2",
      date: "2024-10-14",
      title: "Blackwell Production Ramp",
      description: "Next-gen AI chips enter full production",
      sentiment: "positive",
      impact: "high",
    },
    {
      id: "nvda-h3",
      date: "2024-03-18",
      title: "GTC 2024 Keynote",
      description: "Jensen Huang unveils Blackwell architecture",
      sentiment: "positive",
      impact: "high",
    },
    {
      id: "nvda-h4",
      date: "2023-05-24",
      title: "AI Boom Earnings",
      description: "Quarterly revenue doubles on AI chip demand",
      sentiment: "positive",
      impact: "high",
    },
    {
      id: "nvda-h5",
      date: "2022-09-20",
      title: "Export Restrictions",
      description: "US limits AI chip exports to China",
      sentiment: "negative",
      impact: "high",
    },
  ],
  META: [
    {
      id: "meta-h1",
      date: "2024-09-25",
      title: "Meta Connect 2024",
      description: "Quest 3S and AI glasses announced",
      sentiment: "positive",
      impact: "medium",
    },
    {
      id: "meta-h2",
      date: "2024-07-31",
      title: "Llama 3.1 Release",
      description: "Meta releases largest open-source AI model",
      sentiment: "positive",
      impact: "high",
    },
    {
      id: "meta-h3",
      date: "2024-04-18",
      title: "Llama 3 Launch",
      description: "New open-source AI model rivals GPT-4",
      sentiment: "positive",
      impact: "high",
    },
    {
      id: "meta-h4",
      date: "2023-10-04",
      title: "Reality Labs Cuts",
      description: "Metaverse division restructures amid losses",
      sentiment: "negative",
      impact: "medium",
    },
  ],
  TSLA: [
    {
      id: "tsla-h1",
      date: "2024-10-10",
      title: "Robotaxi Reveal",
      description: "Tesla unveils autonomous Cybercab robotaxi",
      sentiment: "positive",
      impact: "high",
    },
    {
      id: "tsla-h2",
      date: "2024-07-23",
      title: "Q2 Earnings Miss",
      description: "Margins decline amid price cuts and competition",
      sentiment: "negative",
      impact: "high",
    },
    {
      id: "tsla-h3",
      date: "2024-04-15",
      title: "Global Layoffs",
      description: "Tesla announces 10% workforce reduction",
      sentiment: "negative",
      impact: "high",
    },
    {
      id: "tsla-h4",
      date: "2023-11-30",
      title: "Cybertruck Delivery",
      description: "First Cybertruck deliveries begin",
      sentiment: "positive",
      impact: "high",
    },
    {
      id: "tsla-h5",
      date: "2023-04-19",
      title: "Price War Concerns",
      description: "Multiple price cuts pressure margins",
      sentiment: "negative",
      impact: "medium",
    },
  ],
  JPM: [
    {
      id: "jpm-h1",
      date: "2024-10-11",
      title: "Strong Q3 Earnings",
      description: "Record revenue driven by investment banking rebound",
      sentiment: "positive",
      impact: "high",
    },
    {
      id: "jpm-h2",
      date: "2024-05-20",
      title: "First Republic Integration",
      description: "Successfully integrates acquired First Republic assets",
      sentiment: "positive",
      impact: "medium",
    },
    {
      id: "jpm-h3",
      date: "2023-05-01",
      title: "First Republic Acquisition",
      description: "JPMorgan acquires failed First Republic Bank",
      sentiment: "positive",
      impact: "high",
    },
  ],
  V: [
    {
      id: "v-h1",
      date: "2024-10-29",
      title: "Strong Consumer Spending",
      description: "Payment volume growth beats expectations",
      sentiment: "positive",
      impact: "medium",
    },
    {
      id: "v-h2",
      date: "2024-07-23",
      title: "Cross-Border Recovery",
      description: "International travel spending fully recovered",
      sentiment: "positive",
      impact: "medium",
    },
    {
      id: "v-h3",
      date: "2023-09-21",
      title: "Crypto Partnership",
      description: "Visa expands stablecoin settlement capabilities",
      sentiment: "positive",
      impact: "medium",
    },
  ],
  JNJ: [
    {
      id: "jnj-h1",
      date: "2024-08-13",
      title: "Kenvue Spinoff Complete",
      description: "Consumer health business fully separated",
      sentiment: "neutral",
      impact: "medium",
    },
    {
      id: "jnj-h2",
      date: "2024-04-16",
      title: "Cancer Drug Approval",
      description: "FDA approves new targeted cancer therapy",
      sentiment: "positive",
      impact: "high",
    },
    {
      id: "jnj-h3",
      date: "2023-10-05",
      title: "Talc Settlement Progress",
      description: "Major settlement reached in talc litigation",
      sentiment: "negative",
      impact: "medium",
    },
  ],
};
