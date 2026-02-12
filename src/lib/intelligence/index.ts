// Barrel export for intelligence API utilities

// Types
export type {
  Sentiment,
  Impact,
  SignalDirection,
  SignalMagnitude,
  Trend,
  SeverityTier,
  NarrativeStatus,
  DataStatus,
  SignalType,
  PortfolioHolding,
  DashboardResponse,
  DigestData,
  DigestItem,
  DigestStory,
  ExposureData,
  SectorExposure,
  ConcentrationRisk,
  RiskAlert,
  Narrative,
  AlertHistoryItem,
  SignalAggregationResponse,
  SignalTypeAggregate,
  HoldingSignalSummary,
  PortfolioSignalSummary,
  ArticlesResponse,
  Article,
  ArticleEnrichment,
  EnrichmentEntity,
  ArticleSignal,
  ArticleFullResponse,
  HoldingRelevance,
  HoldingSummary,
  IntelligenceAPIError,
} from "./types";

// Mappers
export {
  mapSentiment,
  mapMagnitude,
  toRelativeTime,
  mapSignalType,
  sanitizeText,
  computePortfolioWeights,
  buildPortfolioHeader,
  simpleHash,
} from "./mappers";

// Config
export {
  INTELLIGENCE_API_URL,
  INTELLIGENCE_API_KEY,
  INTELLIGENCE_ENABLED,
  CACHE_TTL_DASHBOARD,
  CACHE_TTL_ARTICLES,
  CACHE_TTL_SIGNALS,
  POLLING_INTERVAL,
  STALE_THRESHOLD,
  REQUEST_TIMEOUT,
} from "./config";

// Cache
export {
  getCache,
  setCache,
  getStaleCacheEntry,
  clearCache,
} from "./cache";

// Mock fallback
export { getMockDashboard, getMockSignals } from "./mock-fallback";
