// Intelligence API TypeScript interfaces
// All types match the Intelligence API response shapes exactly.

// === Shared Enums / Literals ===

export type Sentiment = "positive" | "negative" | "neutral";
export type Impact = "high" | "medium" | "low";
export type SignalDirection = "POSITIVE" | "NEGATIVE" | "NEUTRAL";
export type SignalMagnitude = "major" | "moderate" | "minor";
export type Trend = "improving" | "worsening" | "mixed" | "stable";
export type SeverityTier = "critical" | "high" | "medium" | "low";
export type NarrativeStatus = "emerging" | "developing" | "established";
export type DataStatus = "idle" | "loading" | "success" | "error" | "stale";

export type SignalType =
  | "EARNINGS_REPORT"
  | "M_AND_A"
  | "REGULATORY"
  | "SUPPLY_DISRUPTION"
  | "LEADERSHIP_CHANGE"
  | "PRODUCT_LAUNCH"
  | "PARTNERSHIP"
  | "AI_TECHNOLOGY"
  | "GEOPOLITICAL"
  | "MARKET_MOVEMENT"
  | "GENERAL_NEWS";

// === Holdings (sent TO the API) ===

export interface PortfolioHolding {
  ticker: string;
  weight_pct: number;
}

// === Dashboard Batch Response (POST /api/dashboard) ===

export interface DashboardResponse {
  data: {
    digest?: DigestData;
    exposure?: ExposureData;
    alerts?: RiskAlert[];
    narratives?: Narrative[];
    alert_history?: AlertHistoryItem[];
  };
  meta: {
    portfolio_hash: string;
    holdings_count: number;
    computed_at: string;
    sections_included: string[];
  };
}

export interface DigestData {
  digest_id: string;
  generated_at: string;
  sections: {
    direct_news: DigestItem[];
    related_news: DigestItem[];
    risk_alerts: DigestItem[];
    developing_stories: DigestStory[];
    discovery: DigestItem[];
    sector_context: DigestItem[];
  };
}

export interface DigestItem {
  article_id: number;
  headline: string;
  relevance_score: number;
  affected_holdings: string[];
  summary: string;
  source?: string;
  published_at?: string;
  signal_type?: SignalType;
  sentiment?: SignalDirection;
  magnitude?: SignalMagnitude;
}

export interface DigestStory {
  narrative_id: string;
  title: string;
  article_count: number;
  sentiment_trajectory: Trend;
  affected_holdings: string[];
}

export interface ExposureData {
  computed_at: string;
  by_sector: Record<string, SectorExposure>;
  by_geography: Record<string, { exposure_pct: number }>;
  concentration_risks: ConcentrationRisk[];
}

export interface SectorExposure {
  exposure_pct: number;
  holdings: string[];
  trend: Trend;
}

export interface ConcentrationRisk {
  risk_type: string;
  category: string;
  exposure_pct?: number;
  dependent_holdings?: string[];
  severity: SeverityTier;
  description: string;
}

export interface RiskAlert {
  alert_id: string;
  correlation_type: string;
  trigger_article_id: number;
  trigger_headline: string;
  affected_holdings: string[];
  combined_portfolio_exposure_pct: number;
  severity_tier: SeverityTier;
  cause_description: string;
  explanation: string;
}

export interface Narrative {
  narrative_id: string;
  title: string;
  primary_ticker: string;
  signal_type: SignalType;
  article_count: number;
  first_seen: string;
  last_updated: string;
  status: NarrativeStatus;
  sentiment_trajectory: Trend;
}

export interface AlertHistoryItem {
  alert_id: string;
  rule_id: string;
  trigger_type: string;
  triggered_at: string;
  article_id: number;
  headline: string;
  matched_holdings: string[];
  severity: SeverityTier;
  summary: string;
}

// === Signal Aggregation (POST /api/signals/aggregate) ===

export interface SignalAggregationResponse {
  data: {
    by_signal_type: Record<string, SignalTypeAggregate>;
    by_holding: Record<string, HoldingSignalSummary>;
    portfolio_summary: PortfolioSignalSummary;
  };
  meta: {
    days_analyzed: number;
    holdings_count: number;
    computed_at: string;
  };
}

export interface SignalTypeAggregate {
  article_count: number;
  positive: number;
  negative: number;
  neutral: number;
  dominant_direction: SignalDirection;
  dominant_magnitude: SignalMagnitude;
  affected_holdings: string[];
  trend: Trend;
  latest_headline: string;
}

export interface HoldingSignalSummary {
  total_articles: number;
  net_sentiment: number;
  dominant_signal: SignalType;
  risk_signals: number;
  opportunity_signals: number;
}

export interface PortfolioSignalSummary {
  total_articles_analyzed: number;
  net_sentiment: number;
  top_opportunity: SignalType;
  top_risk: SignalType;
  signal_diversity: number;
}

// === Articles (GET /api/articles) ===

export interface ArticlesResponse {
  data: Article[];
  meta: { count: number; total: number };
}

export interface Article {
  id: number;
  url: string;
  title: string;
  summary: string;
  source: string;
  published_at: string | null;
  fetched_at: string;
  tickers: string[];
  enrichment?: ArticleEnrichment;
}

export interface ArticleEnrichment {
  entities: EnrichmentEntity[];
  signals: ArticleSignal[];
  graph_contexts: Record<string, unknown>;
  narrative: {
    narrative_id: string;
    title: string;
    status: NarrativeStatus;
    sentiment_trajectory: Trend;
  } | null;
  contradiction: {
    contradicting_article_id: number;
    contradicting_headline: string;
    contradiction_type: string;
    confidence: number;
  } | null;
  historical_patterns: {
    past_headline: string;
    similarity_score: number;
    narrative_duration_days: number;
    narrative_resolution: string;
  }[];
}

export interface EnrichmentEntity {
  entity_id: string;
  surface_form: string;
  canonical_name: string;
  role: "PRIMARY_SUBJECT" | "MENTIONED";
  sentiment: SignalDirection;
  role_confidence: number;
  context_snippet: string;
}

export interface ArticleSignal {
  signal_type: SignalType;
  direction: SignalDirection;
  magnitude_category: SignalMagnitude;
  primary_entity_name: string;
  evidence_snippet: string;
  signal_timeframe: "near_term" | "medium_term" | "long_term";
}

// === Article Full Detail (GET /api/articles/{id}/full) ===

export interface ArticleFullResponse {
  data: {
    article: Article;
    relevance: {
      overall_relevance_score: number;
      per_holding_relevance: HoldingRelevance[];
    };
    summaries: HoldingSummary[];
  };
}

export interface HoldingRelevance {
  holding_ticker: string;
  relevance_tier: number;
  relevance_score: number;
  relationship_path: string;
  explanation: string;
}

export interface HoldingSummary {
  holding_ticker: string;
  summary: string;
  action_context: string;
  confidence: number;
}

// === Intelligence API Error ===

export interface IntelligenceAPIError {
  error: { code: string; message: string };
}
