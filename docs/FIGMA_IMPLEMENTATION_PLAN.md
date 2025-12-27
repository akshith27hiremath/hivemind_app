# HiveMind Figma Dashboard Implementation Plan

This document outlines the phased implementation plan for migrating the Figma Make design to the HiveMind application.

---

## Overview

**Source**: [Figma Make Design](https://www.figma.com/make/f8w3TTNEdnmmrI0IROMkqG/hivemind-dashboard)
**Figma Code**: `figmadesign/` - Complete React components from Figma Make
**Reference**: `docs/FIGMADASHBOARDDESCRIPTION.md`
**Design System**: `DESIGN_SYSTEM.md`

### Figma Make Components Available
The following production-ready React components are in `figmadesign/app/components/`:
- `Dashboard.tsx` - Main layout with sidebar, header, panel switching
- `GlassButton.tsx` - Navigation button with icon and active state
- `TodaySummary.tsx` - Stock impact cards with confidence bars
- `CriticalNews.tsx` - Critical news feed
- `StockChart.tsx` - Interactive Recharts chart with timeframes
- `ImpactAnalysisPanel.tsx` - Neural impact analysis with radar charts
- `PortfolioImpactSummary.tsx` - Portfolio metrics (3-column grid)
- `PortfolioPanel.tsx` - Holdings management with add form
- `SectorNewsPanel.tsx` - Sector news with sort/filter dropdown
- `StockComparison.tsx` - Stock screener with dual-stock comparison
- `NewsSelector.tsx` - Toggleable news events for chart overlay

### Dashboard Structure
```
┌────────────────────────────────────────────────────────────────┐
│ Dashboard                                                       │
├──────────┬─────────────────────────────────┬───────────────────┤
│          │  Today's Summary (scroll)       │                   │
│ Sidebar  ├─────────────────────────────────┤  Impact Analysis  │
│   (5     │  Critical News Feed             │  Panel            │
│  views)  │  (with filters)                 │  (5 sectors)      │
│          ├─────────────────────────────────┤                   │
│          │  Stock Screener                 │                   │
│          │  (tabs + chart + details)       │                   │
└──────────┴─────────────────────────────────┴───────────────────┘
```

---

## Phase 1: Foundation & Theme (Current)
**Status**: ✅ Complete
**Files Modified**:
- `DESIGN_SYSTEM.md` - Design tokens documentation
- `src/app/globals.css` - CSS variables and utility classes
- `tailwind.config.ts` - Extended color palette

### Deliverables
- [x] Dark glassmorphism CSS variables
- [x] Glass card utility classes (`.glass-card`, `.glass-card-hover`, `.glass-card-active`)
- [x] Gradient text utility (`.gradient-text`)
- [x] HiveMind color palette in Tailwind (`hm-*`)
- [x] Animation keyframes (fade-in, fade-up, slide-in)
- [x] Scrollbar hide utility

---

## Phase 2: Base Components & Layout
**Estimated Components**: 3
**Dependencies**: Phase 1

### 2.1 GlassCard Component
Create a reusable glass card component with variants.

```
src/components/dashboard/glass-card.tsx
```

**Props**:
- `variant`: 'default' | 'hover' | 'active' | 'subtle'
- `className`: Additional classes
- `children`: React children

### 2.2 Dashboard Layout
Create the main dashboard shell with sidebar and content areas.

```
src/app/(protected)/dashboard/layout.tsx (modify existing)
src/components/dashboard/dashboard-shell.tsx
```

**Features**:
- Fixed sidebar (w-64)
- Main content area with grid (2 cols + 1 col)
- Background gradient overlay
- Responsive breakpoints

### 2.3 Sidebar Component
Create the navigation sidebar.

```
src/components/dashboard/sidebar.tsx
```

**Features**:
- Logo/branding at top
- 5 navigation items with icons
- Active state highlighting
- Hover transitions
- Mobile hamburger menu (Phase 8)

**Navigation Items**:
1. Overview (Home icon) - `/dashboard`
2. Portfolio (Briefcase icon) - `/dashboard/portfolio`
3. Sector News (TrendingUp icon) - `/dashboard/sector-news`
4. Stock News (Newspaper icon) - `/dashboard/stock-news`
5. Impact Analysis (Target icon) - `/dashboard/impact`

---

## Phase 3: Today's Summary Section
**Estimated Components**: 2
**Dependencies**: Phase 2

### 3.1 Mock Data
```
src/lib/mock-data/summaries.ts
```

**Data Structure**:
```typescript
interface Summary {
  id: string;
  time: string;           // "8:42 AM"
  impact: string;         // "+8.2"
  ticker: string;         // "NVDA"
  summary: string;        // AI-generated text
}
```

### 3.2 TodaysSummary Component
```
src/components/dashboard/todays-summary.tsx
```

**Features**:
- Section header with title
- Horizontal scroll container
- 4+ summary cards
- Each card shows: time, impact score (gradient), ticker, summary text
- Smooth scroll with hidden scrollbar

---

## Phase 4: Critical News Feed
**Estimated Components**: 3
**Dependencies**: Phase 2

### 4.1 Mock Data
```
src/lib/mock-data/news.ts
```

**Data Structure**:
```typescript
interface NewsItem {
  id: string;
  timestamp: string;      // "2h ago"
  source: string;         // "Reuters"
  headline: string;
  impact: 'high' | 'medium' | 'low';
  stocks: string[];       // ["TSLA", "NVDA"]
  category: 'portfolio' | 'market';
}
```

### 4.2 FilterChips Component
```
src/components/dashboard/filter-chips.tsx
```

**Features**:
- Horizontal chip list
- Active/inactive states
- "All", "Portfolio", "Market" filters

### 4.3 CriticalNewsFeed Component
```
src/components/dashboard/critical-news-feed.tsx
```

**Features**:
- Section header with filter chips
- Scrollable news list
- Each item: timestamp, source, headline, impact badge, stock tags
- Hover effects
- Click handler (future: open article)

---

## Phase 5: Stock Screener
**Estimated Components**: 4
**Dependencies**: Phase 2

### 5.1 Mock Data Enhancement
```
src/lib/mock-data/stocks.ts
```

**Extend existing stock data with**:
- OHLC candlestick data
- Multiple timeframes (1D, 1W, 1M, 3M, 1Y)

### 5.2 StockTabs Component
```
src/components/dashboard/stock-tabs.tsx
```

**Features**:
- Horizontal tab list
- Each tab: ticker, price, change arrow + percentage
- Active state highlighting
- Click to switch chart

### 5.3 TimePeriodSelector Component
```
src/components/dashboard/time-period-selector.tsx
```

**Features**:
- Button group: 1D, 1W, 1M, 3M, 1Y
- Active state
- Click handler

### 5.4 StockScreener Component
```
src/components/dashboard/stock-screener.tsx
```

**Features**:
- Integrates StockTabs, chart, TimePeriodSelector
- Uses Recharts for candlestick (or modify existing lightweight-charts)
- Stock details panel below chart (name, metrics grid)

---

## Phase 6: Impact Analysis Panel
**Estimated Components**: 2
**Dependencies**: Phase 2

### 6.1 Mock Data
```
src/lib/mock-data/sectors.ts
```

**Data Structure**:
```typescript
interface SectorImpact {
  sector: string;         // "Technology"
  icon: string;           // "Cpu"
  impact: string;         // "+5.2%"
  trend: string;          // Description
  direction: 'positive' | 'negative';
  affectedStocks: string[];
  confidence: number;
}
```

### 6.2 ImpactAnalysisPanel Component
```
src/components/dashboard/impact-analysis.tsx
```

**Features**:
- Section header with title + subtitle
- Vertical stack of sector cards
- 5 sectors: Technology, Healthcare, Financial, Industrial, Energy
- Each card: icon, sector name, impact score (gradient), trend text

**Sector Icons**:
- Technology: `Cpu`
- Healthcare: `Heart`
- Financial: `Landmark`
- Industrial: `Factory`
- Energy: `Zap`

---

## Phase 7: Animations (motion/react)
**Dependencies**: Phases 2-6

### 7.1 Install motion/react
```bash
npm install motion
```

### 7.2 Add Animations
Apply Framer Motion to all components:

**Page Transitions**:
- Fade in on mount
- Stagger children for lists

**Cards**:
- Fade up on mount
- Scale on hover (whileHover)
- Tap feedback (whileTap)

**Sidebar**:
- Slide in from left on mobile
- Item hover animations

---

## Phase 8: Responsive Design
**Dependencies**: Phases 2-6

### Breakpoint Behaviors

| Breakpoint | Sidebar | Grid | Impact Panel |
|------------|---------|------|--------------|
| `xl` (1280+) | Full (w-64) | 2 + 1 cols | Visible |
| `lg` (1024) | Collapsed (icons only) | 2 cols | Below main |
| `md` (768) | Hidden (hamburger) | 1 col | Below |
| `sm` (640) | Hidden | 1 col | Below |

### 8.1 Mobile Sidebar
- Hamburger menu button
- Slide-out drawer
- Overlay backdrop

### 8.2 Responsive Grid
- Stack columns on smaller screens
- Adjust padding/gaps

---

## Phase 9: View-Specific Pages
**Dependencies**: Phase 2

Create individual view pages for sidebar navigation:

### 9.1 Overview Page (Default)
```
src/app/(protected)/dashboard/page.tsx (modify)
```
Shows all components: Summary, News, Screener, Impact

### 9.2 Portfolio View
```
src/app/(protected)/dashboard/portfolio/page.tsx
```
Portfolio-focused view (enhance existing)

### 9.3 Sector News View
```
src/app/(protected)/dashboard/sector-news/page.tsx
```
Sector-specific news filtering

### 9.4 Stock News View
```
src/app/(protected)/dashboard/stock-news/page.tsx
```
Individual stock news

### 9.5 Impact Analysis View
```
src/app/(protected)/dashboard/impact/page.tsx
```
Full-page impact analysis

---

## Phase 10: API Integration (Future)
**Dependencies**: All previous phases

### 10.1 News API
- RSS feed integration
- Real-time updates (WebSocket or polling)

### 10.2 Stock Data API
- Integrate with Yahoo Finance (existing)
- Real-time quotes

### 10.3 AI Analysis API
- Impact score calculation
- Summary generation

---

## Implementation Order

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4
   ✅          │           │           │
               ▼           ▼           ▼
            Phase 5 ──► Phase 6 ──► Phase 7
               │           │           │
               ▼           ▼           ▼
            Phase 8 ──► Phase 9 ──► Phase 10
```

### Recommended Sequence
1. **Phase 2**: Layout & Sidebar (enables navigation)
2. **Phase 6**: Impact Analysis (simplest panel)
3. **Phase 3**: Today's Summary (horizontal scroll)
4. **Phase 4**: News Feed (with filters)
5. **Phase 5**: Stock Screener (most complex)
6. **Phase 7**: Animations (enhance all)
7. **Phase 8**: Responsive (polish)
8. **Phase 9**: View pages (routing)
9. **Phase 10**: Real data (production)

---

## File Structure After Implementation

```
src/
├── app/
│   └── (protected)/
│       └── dashboard/
│           ├── layout.tsx           # Modified with new shell
│           ├── page.tsx             # Overview (all components)
│           ├── portfolio/
│           │   └── page.tsx
│           ├── portfolios/          # Existing
│           ├── sector-news/
│           │   └── page.tsx
│           ├── stock-news/
│           │   └── page.tsx
│           ├── impact/
│           │   └── page.tsx
│           └── stocks/              # Existing
├── components/
│   ├── dashboard/
│   │   ├── sidebar.tsx
│   │   ├── dashboard-shell.tsx
│   │   ├── glass-card.tsx
│   │   ├── todays-summary.tsx
│   │   ├── critical-news-feed.tsx
│   │   ├── filter-chips.tsx
│   │   ├── stock-screener.tsx
│   │   ├── stock-tabs.tsx
│   │   ├── time-period-selector.tsx
│   │   └── impact-analysis.tsx
│   ├── portfolios/                  # Existing
│   ├── stocks/                      # Existing
│   └── ui/                          # Existing
└── lib/
    └── mock-data/
        ├── summaries.ts
        ├── news.ts
        ├── stocks.ts
        └── sectors.ts
```

---

## Getting Started

To begin implementation:

```bash
# Ensure you're on the feature branch
git checkout feature/figma-dashboard-implementation

# Start Docker services
docker compose -f docker-compose.dev.yml up -d

# View the app
open http://localhost:3000/dashboard
```

Start with **Phase 2** to establish the layout foundation.
