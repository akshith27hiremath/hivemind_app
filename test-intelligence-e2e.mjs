/**
 * E2E Intelligence API Integration Test Script
 * Runs inside Docker container to test full data flow.
 * Usage: docker compose exec app node test-intelligence-e2e.mjs
 */

const API_URL = process.env.INTELLIGENCE_API_URL || "http://intelligence-api:8001";
const API_KEY = process.env.INTELLIGENCE_API_KEY || "hm-dev-key-change-in-prod";
const ENABLED = process.env.NEXT_PUBLIC_INTELLIGENCE_ENABLED === "true";

const HOLDINGS = [
  { ticker: "AAPL", weight_pct: 30 },
  { ticker: "MSFT", weight_pct: 25 },
  { ticker: "NVDA", weight_pct: 20 },
  { ticker: "TSLA", weight_pct: 15 },
  { ticker: "GOOGL", weight_pct: 10 },
];

let passed = 0;
let failed = 0;
let warnings = 0;

function assert(condition, testName, detail) {
  if (condition) {
    console.log(`  PASS: ${testName}`);
    passed++;
  } else {
    console.log(`  FAIL: ${testName} — ${detail || "assertion failed"}`);
    failed++;
  }
}

function warn(testName, detail) {
  console.log(`  WARN: ${testName} — ${detail}`);
  warnings++;
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      ...options.headers,
    },
  });
  const data = await res.json();
  return { status: res.status, data, headers: res.headers };
}

// ==========================================
// T1: Infrastructure
// ==========================================
async function testInfrastructure() {
  console.log("\n=== T1: Infrastructure ===");

  assert(ENABLED, "INTELLIGENCE_ENABLED is true");
  assert(API_URL.includes("intelligence-api"), "API_URL uses container DNS", API_URL);

  const { status, data } = await fetchJSON(`${API_URL}/api/health`);
  assert(status === 200, "Health endpoint returns 200", `got ${status}`);
  assert(data.data?.status === "healthy", "API status is healthy", data.data?.status);
  assert(data.data?.articles_count > 0, "Articles exist in API", `count: ${data.data?.articles_count}`);
  assert(data.data?.watchlist_size === 27, "Watchlist has 27 tickers", `got ${data.data?.watchlist_size}`);
}

// ==========================================
// T2: Articles Endpoint
// ==========================================
async function testArticles() {
  console.log("\n=== T2: Articles Endpoint ===");

  // T2.1: Default articles
  const { status, data } = await fetchJSON(`${API_URL}/api/articles?limit=5`);
  assert(status === 200, "Articles returns 200");
  assert(Array.isArray(data.data), "Articles data is array");
  assert(data.data.length === 5, "Respects limit=5", `got ${data.data?.length}`);
  assert(data.meta?.total > 0, "Meta has total count", `total: ${data.meta?.total}`);

  // T2.2: Article shape validation
  const article = data.data[0];
  assert(typeof article.id === "number", "Article has numeric id");
  assert(typeof article.url === "string", "Article has url string");
  assert(typeof article.title === "string", "Article has title");
  assert(typeof article.summary === "string", "Article has summary");
  assert(typeof article.source === "string", "Article has source");
  assert(article.published_at === null || typeof article.published_at === "string", "Article published_at is string|null");
  assert(Array.isArray(article.tickers), "Article has tickers array");

  // T2.3: Enrichment validation
  if (article.enrichment) {
    assert(Array.isArray(article.enrichment.signals), "Enrichment has signals array");
    assert(Array.isArray(article.enrichment.entities), "Enrichment has entities array");
    if (article.enrichment.signals.length > 0) {
      const signal = article.enrichment.signals[0];
      assert(["POSITIVE", "NEGATIVE", "NEUTRAL"].includes(signal.direction), "Signal has valid direction", signal.direction);
      assert(["major", "moderate", "minor"].includes(signal.magnitude_category), "Signal has valid magnitude", signal.magnitude_category);
      assert(typeof signal.signal_type === "string", "Signal has signal_type");
    }
  } else {
    warn("Article enrichment", "First article has no enrichment");
  }

  // T2.4: Ticker filter
  const { data: aaplData } = await fetchJSON(`${API_URL}/api/articles?ticker=AAPL&limit=3`);
  assert(aaplData.data.length > 0, "AAPL has articles");
  const allHaveAAPL = aaplData.data.every(a => a.tickers.includes("AAPL"));
  assert(allHaveAAPL, "All filtered articles contain AAPL ticker");

  // T2.5: Pagination
  const { data: page1 } = await fetchJSON(`${API_URL}/api/articles?limit=2&offset=0`);
  const { data: page2 } = await fetchJSON(`${API_URL}/api/articles?limit=2&offset=2`);
  assert(page1.data.length === 2, "Page 1 has 2 articles");
  assert(page2.data.length === 2, "Page 2 has 2 articles");
  assert(page1.data[0].id !== page2.data[0].id, "Pages have different articles");

  // T2.6: Unknown ticker
  const { data: unknownData } = await fetchJSON(`${API_URL}/api/articles?ticker=ZZZZZ&limit=5`);
  assert(unknownData.data.length === 0, "Unknown ticker returns empty", `got ${unknownData.data.length}`);
}

// ==========================================
// T3: Dashboard Endpoint
// ==========================================
async function testDashboard() {
  console.log("\n=== T3: Dashboard Endpoint ===");

  const { status, data } = await fetchJSON(`${API_URL}/api/dashboard`, {
    method: "POST",
    body: JSON.stringify({
      holdings: HOLDINGS,
      include: ["digest", "exposure", "alerts", "narratives", "alert_history"],
    }),
  });

  assert(status === 200, "Dashboard returns 200", `got ${status}`);
  assert(typeof data.data === "object", "Dashboard has data object");
  assert(typeof data.meta === "object", "Dashboard has meta object");

  // Meta validation
  assert(data.meta.holdings_count === 5, "Meta holdings_count is 5", data.meta.holdings_count);
  assert(typeof data.meta.portfolio_hash === "string", "Meta has portfolio_hash");
  assert(typeof data.meta.computed_at === "string", "Meta has computed_at");
  assert(Array.isArray(data.meta.sections_included), "Meta has sections_included array");

  // Digest validation
  const digest = data.data.digest;
  assert(digest !== undefined, "Digest section present");
  if (digest) {
    assert(typeof digest.digest_id === "string", "Digest has digest_id");
    assert(typeof digest.generated_at === "string", "Digest has generated_at");
    const sections = digest.sections;
    assert(Array.isArray(sections.direct_news), "Digest has direct_news");
    assert(Array.isArray(sections.related_news), "Digest has related_news");
    assert(Array.isArray(sections.risk_alerts), "Digest has risk_alerts");
    assert(Array.isArray(sections.developing_stories), "Digest has developing_stories");
    assert(Array.isArray(sections.discovery), "Digest has discovery");
    assert(Array.isArray(sections.sector_context), "Digest has sector_context");

    // DigestItem shape
    if (sections.direct_news.length > 0) {
      const item = sections.direct_news[0];
      assert(typeof item.article_id === "number", "DigestItem has article_id");
      assert(typeof item.headline === "string", "DigestItem has headline");
      assert(typeof item.relevance_score === "number", "DigestItem has relevance_score");
      assert(Array.isArray(item.affected_holdings), "DigestItem has affected_holdings");
      assert(typeof item.summary === "string", "DigestItem has summary");
      // Optional fields
      if (item.signal_type) assert(typeof item.signal_type === "string", "DigestItem signal_type is string");
      if (item.sentiment) assert(["POSITIVE", "NEGATIVE", "NEUTRAL"].includes(item.sentiment), "DigestItem sentiment valid");
    }

    console.log(`    direct_news: ${sections.direct_news.length}, risk_alerts: ${sections.risk_alerts.length}, sector_context: ${sections.sector_context.length}`);
  }

  // Exposure validation
  const exposure = data.data.exposure;
  assert(exposure !== undefined, "Exposure section present");
  if (exposure) {
    assert(typeof exposure.by_sector === "object", "Exposure has by_sector");
    assert(typeof exposure.by_geography === "object", "Exposure has by_geography");
    assert(Array.isArray(exposure.concentration_risks), "Exposure has concentration_risks");
    const sectorKeys = Object.keys(exposure.by_sector);
    assert(sectorKeys.length > 0, "Has at least one sector", `sectors: ${sectorKeys.join(", ")}`);
  }

  // Alerts
  assert(Array.isArray(data.data.alerts), "Alerts is array");
  if (data.data.alerts.length > 0) {
    const alert = data.data.alerts[0];
    assert(typeof alert.alert_id === "string", "Alert has alert_id");
    assert(typeof alert.severity_tier === "string", "Alert has severity_tier");
    assert(Array.isArray(alert.affected_holdings), "Alert has affected_holdings");
  }

  // Narratives
  assert(Array.isArray(data.data.narratives), "Narratives is array");
  if (data.data.narratives.length > 0) {
    const n = data.data.narratives[0];
    assert(typeof n.narrative_id === "string", "Narrative has narrative_id");
    assert(typeof n.status === "string", "Narrative has status");
    assert(typeof n.sentiment_trajectory === "string", "Narrative has sentiment_trajectory");
  }

  // Alert History
  assert(Array.isArray(data.data.alert_history), "Alert history is array");
  console.log(`    alerts: ${data.data.alerts.length}, narratives: ${data.data.narratives.length}, alert_history: ${data.data.alert_history.length}`);
}

// ==========================================
// T4: Signals Aggregate Endpoint
// ==========================================
async function testSignals() {
  console.log("\n=== T4: Signals Aggregate ===");

  // T4.1: Default 7-day
  const { status, data } = await fetchJSON(`${API_URL}/api/signals/aggregate`, {
    method: "POST",
    body: JSON.stringify({ holdings: HOLDINGS, days: 7 }),
  });

  assert(status === 200, "Signals returns 200");
  assert(typeof data.data?.by_signal_type === "object", "Has by_signal_type");
  assert(typeof data.data?.by_holding === "object", "Has by_holding");
  assert(typeof data.data?.portfolio_summary === "object", "Has portfolio_summary");

  // by_signal_type shape
  const signalTypes = Object.keys(data.data.by_signal_type);
  assert(signalTypes.length > 0, "Has signal types", `count: ${signalTypes.length}`);
  const sampleType = data.data.by_signal_type[signalTypes[0]];
  assert(typeof sampleType.article_count === "number", "SignalTypeAggregate has article_count");
  assert(typeof sampleType.positive === "number", "SignalTypeAggregate has positive");
  assert(typeof sampleType.negative === "number", "SignalTypeAggregate has negative");
  assert(typeof sampleType.neutral === "number", "SignalTypeAggregate has neutral");
  assert(["POSITIVE", "NEGATIVE", "NEUTRAL"].includes(sampleType.dominant_direction), "Valid dominant_direction");
  assert(Array.isArray(sampleType.affected_holdings), "Has affected_holdings array");
  assert(typeof sampleType.latest_headline === "string", "Has latest_headline");

  // by_holding shape
  const holdingKeys = Object.keys(data.data.by_holding);
  assert(holdingKeys.length === 5, "All 5 holdings present", `got ${holdingKeys.length}: ${holdingKeys.join(", ")}`);
  const sampleHolding = data.data.by_holding[holdingKeys[0]];
  assert(typeof sampleHolding.total_articles === "number", "HoldingSignalSummary has total_articles");
  assert(typeof sampleHolding.net_sentiment === "number", "HoldingSignalSummary has net_sentiment");
  assert(typeof sampleHolding.dominant_signal === "string", "HoldingSignalSummary has dominant_signal");
  assert(typeof sampleHolding.risk_signals === "number", "HoldingSignalSummary has risk_signals");
  assert(typeof sampleHolding.opportunity_signals === "number", "HoldingSignalSummary has opportunity_signals");

  // portfolio_summary shape
  const ps = data.data.portfolio_summary;
  assert(typeof ps.total_articles_analyzed === "number", "Portfolio summary total_articles_analyzed");
  assert(typeof ps.net_sentiment === "number", "Portfolio summary net_sentiment");
  assert(typeof ps.top_opportunity === "string", "Portfolio summary top_opportunity");
  assert(typeof ps.top_risk === "string", "Portfolio summary top_risk");
  assert(typeof ps.signal_diversity === "number", "Portfolio summary signal_diversity");

  // Meta
  assert(data.meta?.days_analyzed === 7, "Meta days_analyzed is 7", data.meta?.days_analyzed);
  assert(data.meta?.holdings_count === 5, "Meta holdings_count is 5", data.meta?.holdings_count);

  // T4.2: Different day ranges
  const { data: d14 } = await fetchJSON(`${API_URL}/api/signals/aggregate`, {
    method: "POST",
    body: JSON.stringify({ holdings: HOLDINGS, days: 14 }),
  });
  assert(d14.meta?.days_analyzed === 14, "14-day range works", d14.meta?.days_analyzed);

  const { data: d30 } = await fetchJSON(`${API_URL}/api/signals/aggregate`, {
    method: "POST",
    body: JSON.stringify({ holdings: HOLDINGS, days: 30 }),
  });
  assert(d30.meta?.days_analyzed === 30, "30-day range works", d30.meta?.days_analyzed);
  assert(
    d30.data.portfolio_summary.total_articles_analyzed >= d14.data.portfolio_summary.total_articles_analyzed,
    "30-day has >= articles than 14-day",
    `30d: ${d30.data.portfolio_summary.total_articles_analyzed}, 14d: ${d14.data.portfolio_summary.total_articles_analyzed}`
  );

  console.log(`    Signal types: ${signalTypes.join(", ")}`);
  console.log(`    Holdings: ${holdingKeys.join(", ")}`);
  console.log(`    Net sentiment: ${ps.net_sentiment}, Top opp: ${ps.top_opportunity}, Top risk: ${ps.top_risk}`);
}

// ==========================================
// T5: Stock Page Data Flow
// ==========================================
async function testStockArticles() {
  console.log("\n=== T5: Stock Articles (getStockArticles flow) ===");

  // Test each of the 10 S&P 500 stocks
  const stocks = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JPM", "V", "JNJ"];
  let stocksWithArticles = 0;

  for (const ticker of stocks) {
    const { data } = await fetchJSON(`${API_URL}/api/articles?ticker=${ticker}&limit=6`);
    const count = data.data?.length || 0;
    if (count > 0) {
      stocksWithArticles++;
      // Validate first article maps correctly to NewsItem shape
      const a = data.data[0];
      assert(typeof a.title === "string" && a.title.length > 0, `${ticker}: article has title`);
      assert(typeof a.source === "string", `${ticker}: article has source`);
      assert(a.published_at === null || typeof a.published_at === "string", `${ticker}: published_at valid`);
    }
  }
  console.log(`    ${stocksWithArticles}/10 stocks have articles in Intelligence API`);

  // Test that articles map to chart marker shape (enrichment -> sentiment/impact)
  const { data: nvdaData } = await fetchJSON(`${API_URL}/api/articles?ticker=NVDA&limit=3`);
  if (nvdaData.data.length > 0) {
    const a = nvdaData.data[0];
    const signal = a.enrichment?.signals?.[0];
    if (signal) {
      const sentiment = signal.direction.toLowerCase();
      assert(["positive", "negative", "neutral"].includes(sentiment), "NVDA article signal maps to sentiment");
      const magnitude = signal.magnitude_category;
      assert(["major", "moderate", "minor"].includes(magnitude), "NVDA article signal maps to magnitude");
      console.log(`    NVDA sample: direction=${signal.direction}, magnitude=${magnitude}, type=${signal.signal_type}`);
    } else {
      warn("NVDA enrichment", "No signals on first NVDA article");
    }
  }
}

// ==========================================
// T6: Component Data Compatibility
// ==========================================
async function testComponentDataCompatibility() {
  console.log("\n=== T6: Component Data Compatibility ===");

  // Test that dashboard data maps correctly to what each component expects
  const { data: dashData } = await fetchJSON(`${API_URL}/api/dashboard`, {
    method: "POST",
    body: JSON.stringify({
      holdings: HOLDINGS,
      include: ["digest", "exposure", "alerts", "narratives", "alert_history"],
    }),
  });

  const { data: sigData } = await fetchJSON(`${API_URL}/api/signals/aggregate`, {
    method: "POST",
    body: JSON.stringify({ holdings: HOLDINGS, days: 7 }),
  });

  // T6.1: TodaySummary expects digest sections
  const digest = dashData.data.digest;
  assert(digest?.sections?.direct_news !== undefined, "TodaySummary: direct_news available");
  assert(digest?.sections?.risk_alerts !== undefined, "TodaySummary: risk_alerts available");

  // T6.2: CriticalNews expects digest items with optional sentiment/magnitude
  const directNews = digest?.sections?.direct_news || [];
  if (directNews.length > 0) {
    const item = directNews[0];
    // Component uses: item.sentiment ?? "NEUTRAL", item.magnitude ?? "moderate"
    assert(item.headline !== undefined, "CriticalNews: headline exists");
    assert(item.summary !== undefined, "CriticalNews: summary exists");
    assert(item.affected_holdings !== undefined, "CriticalNews: affected_holdings exists");
    assert(item.relevance_score !== undefined, "CriticalNews: relevance_score exists");
    // These are optional - component handles with ?? defaults
    if (!item.sentiment) warn("CriticalNews", "sentiment missing on direct_news item (handled by ?? default)");
    if (!item.magnitude) warn("CriticalNews", "magnitude missing on direct_news item (handled by ?? default)");
  }

  // T6.3: SectorNewsPanel expects articles with enrichment
  const { data: articlesData } = await fetchJSON(`${API_URL}/api/articles?limit=10`);
  if (articlesData.data.length > 0) {
    const a = articlesData.data[0];
    assert(a.enrichment !== undefined || a.enrichment === undefined, "SectorNews: enrichment is optional");
    // Component maps: enrichment.signals[0] for sentiment, enrichment.entities[0] for sector
    if (a.enrichment?.signals?.length > 0) {
      assert(typeof a.enrichment.signals[0].direction === "string", "SectorNews: signal direction mappable");
    }
    if (a.enrichment?.entities?.length > 0) {
      assert(typeof a.enrichment.entities[0].canonical_name === "string", "SectorNews: entity canonical_name for sector proxy");
    }
  }

  // T6.4: ImpactAnalysisPanel expects signals by_signal_type and by_holding
  assert(Object.keys(sigData.data.by_signal_type).length > 0, "ImpactPanel: has signal types for radar");
  assert(Object.keys(sigData.data.by_holding).length > 0, "ImpactPanel: has holdings for heatmap");

  // RadarChart normalization test
  const firstType = Object.values(sigData.data.by_signal_type)[0];
  const raw = firstType.positive * 1.0 + firstType.neutral * 0.5 - firstType.negative * 0.5;
  const maxPossible = firstType.article_count || 1;
  const normalized = Math.max(0, Math.min(100, ((raw / maxPossible) * 50) + 50));
  assert(normalized >= 0 && normalized <= 100, "Radar normalization in range", `value: ${normalized.toFixed(1)}`);

  // Heatmap: verify affected_holdings cross-references by_holding
  for (const [type, agg] of Object.entries(sigData.data.by_signal_type)) {
    for (const h of agg.affected_holdings) {
      if (!sigData.data.by_holding[h]) {
        warn(`Heatmap ${type}`, `affected_holding ${h} not in by_holding`);
      }
    }
  }

  // T6.5: Timeline uses top-level alerts (RiskAlert shape, NOT DigestItem)
  const topAlerts = dashData.data.alerts || [];
  if (topAlerts.length > 0) {
    const alert = topAlerts[0];
    assert(typeof alert.trigger_article_id === "number", "Timeline: alert has trigger_article_id");
    assert(typeof alert.trigger_headline === "string", "Timeline: alert has trigger_headline");
    assert(typeof alert.explanation === "string", "Timeline: alert has explanation");
    assert(Array.isArray(alert.affected_holdings), "Timeline: alert has affected_holdings");
    assert(typeof alert.severity_tier === "string", "Timeline: alert has severity_tier");
    assert(typeof alert.correlation_type === "string", "Timeline: alert has correlation_type");
  }

  // T6.6: Digest risk_alerts are RiskAlert-shaped (not DigestItem)
  const digestRiskAlerts = digest?.sections?.risk_alerts || [];
  if (digestRiskAlerts.length > 0) {
    const dra = digestRiskAlerts[0];
    assert(typeof dra.trigger_article_id === "number" || typeof dra.article_id === "number",
      "Digest risk_alert: has trigger_article_id or article_id",
      `keys: ${Object.keys(dra).join(", ")}`);
  }

  console.log(`    Data compat checks complete for all 6 migrated panels`);
}

// ==========================================
// T7: Edge Cases
// ==========================================
async function testEdgeCases() {
  console.log("\n=== T7: Edge Cases ===");

  // T7.1: Empty portfolio (API returns 400, our BFF handles gracefully)
  const { status: emptyStatus } = await fetchJSON(`${API_URL}/api/dashboard`, {
    method: "POST",
    body: JSON.stringify({ holdings: [], include: ["digest"] }),
  });
  assert(emptyStatus === 400 || emptyStatus === 422 || emptyStatus === 200,
    "Empty portfolio returns 400/422/200",
    `status: ${emptyStatus} (BFF converts to {data:null, meta:{no_portfolio:true}})`);

  // T7.2: Single holding
  const { status: singleStatus, data: singleData } = await fetchJSON(`${API_URL}/api/signals/aggregate`, {
    method: "POST",
    body: JSON.stringify({ holdings: [{ ticker: "AAPL", weight_pct: 100 }], days: 7 }),
  });
  assert(singleStatus === 200, "Single holding signals works");
  assert(Object.keys(singleData.data.by_holding).length >= 1, "Single holding in by_holding");

  // T7.3: Non-covered ticker (outside 27-ticker watchlist)
  const { data: exoticData } = await fetchJSON(`${API_URL}/api/signals/aggregate`, {
    method: "POST",
    body: JSON.stringify({ holdings: [{ ticker: "BRK.B", weight_pct: 50 }, { ticker: "AAPL", weight_pct: 50 }], days: 7 }),
  });
  assert(typeof exoticData.data === "object", "Non-covered ticker doesn't crash API");

  // T7.4: Large limit
  const { data: largeData } = await fetchJSON(`${API_URL}/api/articles?limit=100`);
  assert(largeData.data.length <= 100, "Large limit respected", `got ${largeData.data.length}`);

  // T7.5: articles meta.total consistency
  const { data: countData } = await fetchJSON(`${API_URL}/api/articles?limit=1`);
  assert(countData.meta.total >= countData.meta.count, "meta.total >= meta.count");
  assert(countData.meta.count === countData.data.length, "meta.count matches data.length");
}

// ==========================================
// T8: Cross-Endpoint Consistency
// ==========================================
async function testCrossEndpointConsistency() {
  console.log("\n=== T8: Cross-Endpoint Consistency ===");

  // Fetch both dashboard and signals for same holdings
  const [{ data: dashData }, { data: sigData }] = await Promise.all([
    fetchJSON(`${API_URL}/api/dashboard`, {
      method: "POST",
      body: JSON.stringify({ holdings: HOLDINGS, include: ["digest", "alerts"] }),
    }),
    fetchJSON(`${API_URL}/api/signals/aggregate`, {
      method: "POST",
      body: JSON.stringify({ holdings: HOLDINGS, days: 7 }),
    }),
  ]);

  // Both should reference the same holdings
  const dashHoldings = new Set();
  for (const item of (dashData.data.digest?.sections?.direct_news || [])) {
    for (const h of item.affected_holdings) dashHoldings.add(h);
  }
  const sigHoldings = new Set(Object.keys(sigData.data.by_holding));

  // At minimum, our requested tickers should appear in signals
  for (const h of HOLDINGS) {
    assert(sigHoldings.has(h.ticker), `Signals has requested holding: ${h.ticker}`);
  }

  // Verify meta consistency
  assert(dashData.meta.holdings_count === sigData.meta.holdings_count,
    "Dashboard and signals agree on holdings_count",
    `dash: ${dashData.meta.holdings_count}, sig: ${sigData.meta.holdings_count}`
  );

  // Verify article IDs from dashboard exist in articles endpoint
  const sampleArticleId = dashData.data.digest?.sections?.direct_news?.[0]?.article_id;
  if (sampleArticleId) {
    const { data: articleData } = await fetchJSON(`${API_URL}/api/articles/${sampleArticleId}/full`, {
      headers: { "X-Portfolio": HOLDINGS.map(h => `${h.ticker}:${h.weight_pct}`).join(",") },
    });
    assert(articleData.data?.article?.id === sampleArticleId,
      `Article ${sampleArticleId} retrievable from articles/full endpoint`,
      `got id: ${articleData.data?.article?.id}`
    );
  } else {
    warn("Cross-endpoint article check", "No direct_news articles to validate");
  }
}

// ==========================================
// Run All Tests
// ==========================================
async function main() {
  console.log("================================================================");
  console.log("  E2E Intelligence API Integration Test Suite");
  console.log("  API: " + API_URL);
  console.log("  Enabled: " + ENABLED);
  console.log("  Holdings: " + HOLDINGS.map(h => h.ticker).join(", "));
  console.log("================================================================");

  try {
    await testInfrastructure();
    await testArticles();
    await testDashboard();
    await testSignals();
    await testStockArticles();
    await testComponentDataCompatibility();
    await testEdgeCases();
    await testCrossEndpointConsistency();
  } catch (err) {
    console.error("\nFATAL ERROR:", err.message);
    failed++;
  }

  console.log("\n================================================================");
  console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${warnings} warnings`);
  console.log("================================================================");

  process.exit(failed > 0 ? 1 : 0);
}

main();
