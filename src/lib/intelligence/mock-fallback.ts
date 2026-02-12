// Mock-fallback: reshapes existing mock data into Intelligence API response shapes.
// Used when INTELLIGENCE_ENABLED=false or when the API is unavailable.
// This lets all UI components work with the same interface regardless of data source.

import {
  criticalNews,
  sectorNews,
  stockSpecificNews,
} from "@/lib/mock-data/news";
import {
  summaryItems,
  portfolioSummary,
  portfolioOverview,
} from "@/lib/mock-data/summaries";
import type {
  DashboardResponse,
  SignalAggregationResponse,
  DigestItem,
  DigestStory,
  RiskAlert,
  Narrative,
  AlertHistoryItem,
  SignalType,
} from "./types";

function nowISO(): string {
  return new Date().toISOString();
}

function minutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60 * 1000).toISOString();
}

// Map mock sentiment to API signal direction
function toDirection(s: string): "POSITIVE" | "NEGATIVE" | "NEUTRAL" {
  if (s === "positive") return "POSITIVE";
  if (s === "negative") return "NEGATIVE";
  return "NEUTRAL";
}

// Map mock impact to API magnitude
function toMagnitude(i: string): "major" | "moderate" | "minor" {
  if (i === "high") return "major";
  if (i === "medium") return "moderate";
  return "minor";
}

// Infer a signal type from the mock headline
function inferSignalType(title: string): SignalType {
  const lower = title.toLowerCase();
  if (lower.includes("ai") || lower.includes("chip") || lower.includes("gpu"))
    return "AI_TECHNOLOGY";
  if (lower.includes("supply") || lower.includes("chain"))
    return "SUPPLY_DISRUPTION";
  if (lower.includes("earn") || lower.includes("revenue") || lower.includes("growth"))
    return "EARNINGS_REPORT";
  if (lower.includes("regulat") || lower.includes("fda") || lower.includes("fed"))
    return "REGULATORY";
  if (lower.includes("partner") || lower.includes("deal"))
    return "PARTNERSHIP";
  if (lower.includes("acqui") || lower.includes("merger"))
    return "M_AND_A";
  if (lower.includes("launch") || lower.includes("product") || lower.includes("unveil"))
    return "PRODUCT_LAUNCH";
  if (lower.includes("leader") || lower.includes("ceo"))
    return "LEADERSHIP_CHANGE";
  if (lower.includes("market") || lower.includes("rally") || lower.includes("surge"))
    return "MARKET_MOVEMENT";
  if (lower.includes("geopolit") || lower.includes("export") || lower.includes("tariff"))
    return "GEOPOLITICAL";
  return "GENERAL_NEWS";
}

export function getMockDashboard(): DashboardResponse {
  // Build direct_news from criticalNews + stockSpecificNews
  let articleId = 1000;
  const directNews: DigestItem[] = [
    ...criticalNews.map((n) => ({
      article_id: articleId++,
      headline: n.title,
      relevance_score: 0.9,
      affected_holdings: n.stocks,
      summary: n.summary ?? n.title,
      source: n.source,
      published_at: minutesAgo(parseInt(n.time) || 30),
      signal_type: inferSignalType(n.title),
      sentiment: toDirection(n.sentiment),
      magnitude: toMagnitude(n.impact),
    })),
    ...stockSpecificNews.map((n) => ({
      article_id: articleId++,
      headline: n.title,
      relevance_score: 0.85,
      affected_holdings: [n.stock],
      summary: n.summary,
      source: n.source,
      published_at: minutesAgo(parseInt(n.time) || 60),
      signal_type: inferSignalType(n.title),
      sentiment: toDirection(n.sentiment),
      magnitude: toMagnitude(n.sentiment === "positive" ? "high" : "medium"),
    })),
  ];

  // Build sector_context from sectorNews
  const sectorContext: DigestItem[] = sectorNews.flatMap((sector) =>
    sector.news.map((n) => ({
      article_id: articleId++,
      headline: n.title,
      relevance_score: (n.relevance ?? 70) / 100,
      affected_holdings: n.stocks,
      summary: n.summary ?? n.title,
      source: n.source,
      published_at: minutesAgo(parseInt(n.time) || 60),
      signal_type: inferSignalType(n.title),
      sentiment: toDirection(n.sentiment),
      magnitude: toMagnitude(n.impact),
    }))
  );

  // Build developing_stories from summaryItems
  const developingStories: DigestStory[] = summaryItems.map((s) => ({
    narrative_id: `mock-narrative-${s.id}`,
    title: s.news,
    article_count: Math.floor(Math.random() * 8) + 2,
    sentiment_trajectory:
      s.impact === "positive"
        ? ("improving" as const)
        : s.impact === "negative"
          ? ("worsening" as const)
          : ("stable" as const),
    affected_holdings: [s.stock],
  }));

  // Build mock alerts
  const alerts: RiskAlert[] = [
    {
      alert_id: "mock-alert-1",
      correlation_type: "sector_concentration",
      trigger_article_id: 1000,
      trigger_headline: criticalNews[0]?.title ?? "Market update",
      affected_holdings: ["NVDA", "MSFT", "GOOGL"],
      combined_portfolio_exposure_pct: 45,
      severity_tier: "medium",
      cause_description: "High tech sector concentration",
      explanation:
        "Your portfolio has 45% exposure to the technology sector, which may amplify volatility during sector-wide movements.",
    },
  ];

  // Build mock narratives
  const narratives: Narrative[] = summaryItems.map((s) => ({
    narrative_id: `mock-narrative-${s.id}`,
    title: s.news,
    primary_ticker: s.stock,
    signal_type: inferSignalType(s.news),
    article_count: Math.floor(s.confidence / 10),
    first_seen: minutesAgo(240),
    last_updated: minutesAgo(10),
    status: "developing" as const,
    sentiment_trajectory:
      s.impact === "positive"
        ? ("improving" as const)
        : s.impact === "negative"
          ? ("worsening" as const)
          : ("stable" as const),
  }));

  // Build mock alert_history
  const alertHistory: AlertHistoryItem[] = [
    {
      alert_id: "mock-alert-hist-1",
      rule_id: "sector_concentration",
      trigger_type: "threshold",
      triggered_at: minutesAgo(120),
      article_id: 1000,
      headline: "Tech sector rally triggers concentration alert",
      matched_holdings: ["NVDA", "MSFT", "GOOGL"],
      severity: "medium",
      summary: "Technology sector concentration exceeded 40% threshold.",
    },
  ];

  return {
    data: {
      digest: {
        digest_id: `mock-dg-${new Date().toISOString().slice(0, 10)}`,
        generated_at: nowISO(),
        sections: {
          direct_news: directNews,
          related_news: sectorContext.slice(0, 3),
          risk_alerts: directNews.filter((n) => n.sentiment === "NEGATIVE"),
          developing_stories: developingStories,
          discovery: sectorContext.slice(3, 6),
          sector_context: sectorContext,
        },
      },
      exposure: {
        computed_at: nowISO(),
        by_sector: {
          Technology: {
            exposure_pct: 65,
            holdings: ["AAPL", "MSFT", "GOOGL", "NVDA", "META"],
            trend: "improving",
          },
          "Consumer Discretionary": {
            exposure_pct: 15,
            holdings: ["AMZN", "TSLA"],
            trend: "stable",
          },
          Financials: {
            exposure_pct: 10,
            holdings: ["JPM", "V"],
            trend: "stable",
          },
          Healthcare: {
            exposure_pct: 5,
            holdings: ["JNJ"],
            trend: "stable",
          },
        },
        by_geography: {
          "United States": { exposure_pct: 95 },
          Global: { exposure_pct: 5 },
        },
        concentration_risks: [
          {
            risk_type: "sector",
            category: "Technology",
            exposure_pct: 65,
            dependent_holdings: ["AAPL", "MSFT", "GOOGL", "NVDA", "META"],
            severity: "medium",
            description:
              "Technology sector represents 65% of portfolio — consider diversification.",
          },
        ],
      },
      alerts,
      narratives,
      alert_history: alertHistory,
    },
    meta: {
      portfolio_hash: "mock-hash",
      holdings_count: 10,
      computed_at: nowISO(),
      sections_included: [
        "digest",
        "exposure",
        "alerts",
        "narratives",
        "alert_history",
      ],
    },
  };
}

export function getMockSignals(): SignalAggregationResponse {
  return {
    data: {
      by_signal_type: {
        AI_TECHNOLOGY: {
          article_count: 12,
          positive: 8,
          negative: 2,
          neutral: 2,
          dominant_direction: "POSITIVE",
          dominant_magnitude: "major",
          affected_holdings: ["NVDA", "MSFT", "GOOGL", "META"],
          trend: "improving",
          latest_headline:
            "NVIDIA unveils next-generation AI accelerator at tech summit",
        },
        EARNINGS_REPORT: {
          article_count: 8,
          positive: 5,
          negative: 2,
          neutral: 1,
          dominant_direction: "POSITIVE",
          dominant_magnitude: "moderate",
          affected_holdings: ["MSFT", "GOOGL", "AAPL"],
          trend: "stable",
          latest_headline:
            "Azure revenue up 31% YoY; AI services adoption surges",
        },
        SUPPLY_DISRUPTION: {
          article_count: 5,
          positive: 1,
          negative: 3,
          neutral: 1,
          dominant_direction: "NEGATIVE",
          dominant_magnitude: "moderate",
          affected_holdings: ["AAPL", "NVDA"],
          trend: "worsening",
          latest_headline: "Semiconductor supply chain faces new bottlenecks",
        },
        PRODUCT_LAUNCH: {
          article_count: 6,
          positive: 5,
          negative: 0,
          neutral: 1,
          dominant_direction: "POSITIVE",
          dominant_magnitude: "moderate",
          affected_holdings: ["AAPL", "TSLA", "META"],
          trend: "improving",
          latest_headline: "Apple diversifies supply chain with new partnerships",
        },
        REGULATORY: {
          article_count: 4,
          positive: 1,
          negative: 2,
          neutral: 1,
          dominant_direction: "NEGATIVE",
          dominant_magnitude: "minor",
          affected_holdings: ["GOOGL", "META", "NVDA"],
          trend: "stable",
          latest_headline: "Fed signals potential rate cuts in Q3",
        },
        M_AND_A: {
          article_count: 2,
          positive: 2,
          negative: 0,
          neutral: 0,
          dominant_direction: "POSITIVE",
          dominant_magnitude: "minor",
          affected_holdings: ["MSFT"],
          trend: "stable",
          latest_headline:
            "Major cloud providers announce infrastructure expansion",
        },
        MARKET_MOVEMENT: {
          article_count: 7,
          positive: 4,
          negative: 2,
          neutral: 1,
          dominant_direction: "POSITIVE",
          dominant_magnitude: "moderate",
          affected_holdings: [
            "NVDA",
            "AAPL",
            "MSFT",
            "GOOGL",
            "AMZN",
            "TSLA",
          ],
          trend: "improving",
          latest_headline:
            "Tech sector sees 4.2% rally on AI infrastructure spending",
        },
      },
      by_holding: {
        NVDA: {
          total_articles: 18,
          net_sentiment: 0.72,
          dominant_signal: "AI_TECHNOLOGY",
          risk_signals: 3,
          opportunity_signals: 12,
        },
        AAPL: {
          total_articles: 9,
          net_sentiment: 0.35,
          dominant_signal: "PRODUCT_LAUNCH",
          risk_signals: 2,
          opportunity_signals: 5,
        },
        MSFT: {
          total_articles: 11,
          net_sentiment: 0.61,
          dominant_signal: "EARNINGS_REPORT",
          risk_signals: 1,
          opportunity_signals: 8,
        },
        GOOGL: {
          total_articles: 8,
          net_sentiment: 0.45,
          dominant_signal: "AI_TECHNOLOGY",
          risk_signals: 2,
          opportunity_signals: 5,
        },
        TSLA: {
          total_articles: 6,
          net_sentiment: -0.15,
          dominant_signal: "MARKET_MOVEMENT",
          risk_signals: 3,
          opportunity_signals: 2,
        },
        META: {
          total_articles: 5,
          net_sentiment: 0.4,
          dominant_signal: "AI_TECHNOLOGY",
          risk_signals: 1,
          opportunity_signals: 3,
        },
        AMZN: {
          total_articles: 4,
          net_sentiment: 0.5,
          dominant_signal: "AI_TECHNOLOGY",
          risk_signals: 0,
          opportunity_signals: 3,
        },
        JPM: {
          total_articles: 3,
          net_sentiment: 0.3,
          dominant_signal: "EARNINGS_REPORT",
          risk_signals: 1,
          opportunity_signals: 2,
        },
        V: {
          total_articles: 2,
          net_sentiment: 0.25,
          dominant_signal: "MARKET_MOVEMENT",
          risk_signals: 0,
          opportunity_signals: 2,
        },
        JNJ: {
          total_articles: 2,
          net_sentiment: 0.1,
          dominant_signal: "REGULATORY",
          risk_signals: 1,
          opportunity_signals: 1,
        },
      },
      portfolio_summary: {
        total_articles_analyzed: Number(portfolioSummary.newsAnalyzed),
        net_sentiment: 0.54,
        top_opportunity: "AI_TECHNOLOGY",
        top_risk: "SUPPLY_DISRUPTION",
        signal_diversity: 7,
      },
    },
    meta: {
      days_analyzed: 7,
      holdings_count: 10,
      computed_at: nowISO(),
    },
  };
}
