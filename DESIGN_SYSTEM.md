# HiveMind Design System

This document defines the design tokens, patterns, and components for the HiveMind dashboard based on the Figma Make design.

---

## Theme: Dark Glassmorphism

The HiveMind dashboard uses a dark glassmorphism aesthetic with the following principles:
- **Dark backgrounds** with subtle transparency
- **Glass cards** with backdrop blur effects
- **White text and borders** at varying opacities
- **Minimal color palette** - only red/green for stock candles
- **Fluid animations** using Framer Motion

---

## Color Palette

### Base Colors
```css
--hm-black: #000000;           /* Pure black - main background */
--hm-gray-950: #0a0a0a;        /* Near black */
--hm-gray-900: #111111;        /* Dark gray - card backgrounds */
--hm-gray-850: #1a1a1a;        /* Sidebar background */
--hm-gray-800: #262626;        /* Elevated surfaces */
--hm-gray-700: #404040;        /* Borders, dividers */
--hm-gray-600: #525252;        /* Disabled states */
--hm-gray-500: #6b6b6b;        /* Muted text, timestamps */
--hm-gray-400: #a3a3a3;        /* Secondary text */
--hm-gray-300: #d4d4d4;        /* Primary text */
--hm-white: #ffffff;           /* Accent text, active states */
```

### Transparency Scale (for glass effects)
```css
--hm-white-5: rgba(255, 255, 255, 0.05);   /* Subtle glass */
--hm-white-10: rgba(255, 255, 255, 0.1);   /* Card backgrounds */
--hm-white-20: rgba(255, 255, 255, 0.2);   /* Active states */
--hm-white-30: rgba(255, 255, 255, 0.3);   /* Borders, active */
--hm-white-50: rgba(255, 255, 255, 0.5);   /* Emphasis */
```

### Stock Chart Colors (ONLY exceptions to monochrome)
```css
--hm-candle-green: #22c55e;    /* Bullish candle */
--hm-candle-red: #ef4444;      /* Bearish candle */
```

### Gradient Tokens
```css
/* Gradient text for emphasis (impact scores, key metrics) */
--hm-gradient-text: linear-gradient(to bottom, #ffffff, #a3a3a3);

/* Background animated gradient overlay */
--hm-gradient-bg: radial-gradient(ellipse at top, rgba(255,255,255,0.03), transparent);
```

---

## Typography

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Scale
| Token | Size | Weight | Use Case |
|-------|------|--------|----------|
| `text-4xl` | 36px | 700 | Hero numbers, impact scores |
| `text-2xl` | 24px | 600 | Section titles |
| `text-xl` | 20px | 600 | Card titles |
| `text-lg` | 18px | 500 | Stock tickers |
| `text-base` | 16px | 400 | Body text |
| `text-sm` | 14px | 400 | Secondary text, timestamps |
| `text-xs` | 12px | 400 | Labels, captions |

### Hierarchy
1. **Impact Scores**: `text-4xl font-bold` with gradient text
2. **Tickers**: `text-lg font-medium text-white`
3. **Headlines**: `text-base text-gray-300`
4. **Summaries**: `text-sm text-gray-400`
5. **Timestamps**: `text-xs text-gray-500`

---

## Spacing

### Base Unit: 4px
| Token | Value | Use Case |
|-------|-------|----------|
| `gap-1` | 4px | Icon-text spacing |
| `gap-2` | 8px | Inline elements |
| `gap-3` | 12px | Card list items |
| `gap-4` | 16px | Card sections, nav items |
| `gap-6` | 24px | Major sections |
| `gap-8` | 32px | Page sections |
| `p-3` | 12px | Small card padding |
| `p-4` | 16px | Standard card padding |
| `p-6` | 24px | Large card padding |

---

## Glass Card System

### Base Glass Card
```tsx
// Standard glass card component pattern
className="
  rounded-2xl
  bg-white/10
  backdrop-blur-xl
  border border-white/10
  p-4
"
```

### Hover States
```tsx
// Interactive glass card
className="
  rounded-2xl
  bg-white/10
  backdrop-blur-xl
  border border-white/10
  p-4
  transition-colors duration-200
  hover:bg-white/[0.15]
  hover:border-white/20
"
```

### Active/Selected States
```tsx
// Active navigation or selected item
className="
  rounded-2xl
  bg-white/20
  backdrop-blur-xl
  border border-white/30
  p-4
"
```

### Card Variants
| Variant | Background | Border | Use Case |
|---------|------------|--------|----------|
| Default | `bg-white/10` | `border-white/10` | Content cards |
| Elevated | `bg-white/[0.15]` | `border-white/20` | Hover states |
| Active | `bg-white/20` | `border-white/30` | Selected items |
| Subtle | `bg-white/5` | `border-white/5` | Background panels |

---

## Component Patterns

### 1. Sidebar Navigation
```tsx
// Sidebar container
<nav className="
  fixed left-0 top-0 h-screen w-64
  bg-[#1a1a1a]
  border-r border-white/10
  p-6
  flex flex-col gap-6
">
  {/* Logo */}
  <div className="text-2xl font-bold text-white">Hivemind</div>

  {/* Nav Items */}
  <div className="flex flex-col gap-3">
    {items.map(item => (
      <button className="
        flex items-center gap-3 px-4 py-3
        rounded-xl
        text-gray-400
        transition-all duration-200
        hover:bg-white/10 hover:text-white
        data-[active=true]:bg-white/20
        data-[active=true]:text-white
        data-[active=true]:border data-[active=true]:border-white/30
      ">
        <Icon className="w-5 h-5" />
        <span>{item.label}</span>
      </button>
    ))}
  </div>
</nav>
```

### 2. Summary Cards (Horizontal Scroll)
```tsx
<div className="flex gap-4 overflow-x-auto pb-2">
  {summaries.map(summary => (
    <div className="
      flex-shrink-0 w-72
      rounded-2xl bg-white/10 backdrop-blur-xl
      border border-white/10 p-4
    ">
      {/* Time & Impact Score */}
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs text-gray-500">{summary.time}</span>
        <span className="text-3xl font-bold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
          {summary.impact}
        </span>
      </div>

      {/* Ticker */}
      <div className="text-lg font-medium text-white mb-2">
        {summary.ticker}
      </div>

      {/* Summary Text */}
      <p className="text-sm text-gray-400 line-clamp-2">
        {summary.text}
      </p>
    </div>
  ))}
</div>
```

### 3. News Feed Item
```tsx
<div className="
  rounded-xl bg-white/10 backdrop-blur-xl
  border border-white/10 p-4
  transition-all duration-200
  hover:bg-white/[0.15] hover:brightness-110
  cursor-pointer
">
  {/* Header Row */}
  <div className="flex items-center gap-2 mb-2">
    <span className="text-xs text-gray-500">{news.time}</span>
    <span className="text-xs text-gray-400">•</span>
    <span className="text-xs text-gray-400">{news.source}</span>
    {news.isHighImpact && (
      <span className="
        px-2 py-0.5 rounded-full text-xs
        bg-white/10 text-white
      ">
        High Impact
      </span>
    )}
  </div>

  {/* Headline */}
  <h3 className="text-base text-gray-200 mb-2">{news.headline}</h3>

  {/* Affected Stocks */}
  <div className="flex gap-2">
    {news.stocks.map(ticker => (
      <span className="
        px-2 py-0.5 rounded text-xs
        bg-white/5 text-gray-400
      ">
        {ticker}
      </span>
    ))}
  </div>
</div>
```

### 4. Stock Tab Selector
```tsx
<div className="flex gap-2 overflow-x-auto pb-2">
  {stocks.map(stock => (
    <button className="
      flex items-center gap-3 px-4 py-2
      rounded-lg
      transition-all duration-200
      ${isActive
        ? 'bg-white/20 border border-white/30'
        : 'bg-white/5 border border-transparent hover:bg-white/10'
      }
    ">
      <span className="font-medium text-white">{stock.ticker}</span>
      <span className="text-sm text-gray-400">${stock.price}</span>
      <span className={`text-sm ${stock.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
        {stock.change >= 0 ? '↑' : '↓'} {Math.abs(stock.changePercent)}%
      </span>
    </button>
  ))}
</div>
```

### 5. Time Period Selector
```tsx
<div className="flex gap-1 p-1 bg-white/5 rounded-lg">
  {['1D', '1W', '1M', '3M', '1Y'].map(period => (
    <button className={`
      px-3 py-1.5 rounded-md text-sm font-medium
      transition-all duration-200
      ${isActive
        ? 'bg-white/20 text-white'
        : 'text-gray-400 hover:text-white'
      }
    `}>
      {period}
    </button>
  ))}
</div>
```

### 6. Sector Impact Card
```tsx
<div className="
  rounded-xl bg-white/10 backdrop-blur-xl
  border border-white/10 p-4
">
  <div className="flex items-start gap-3">
    {/* Icon */}
    <div className="p-2 rounded-lg bg-white/5">
      <Icon className="w-5 h-5 text-white" />
    </div>

    {/* Content */}
    <div className="flex-1">
      <div className="flex justify-between items-center mb-1">
        <span className="font-medium text-white">{sector.name}</span>
        <span className="text-lg font-bold bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">
          {sector.impact}
        </span>
      </div>
      <p className="text-sm text-gray-400">{sector.trend}</p>
    </div>
  </div>
</div>
```

### 7. Filter Chips
```tsx
<div className="flex gap-2">
  {['All', 'Portfolio', 'Market'].map(filter => (
    <button className={`
      px-3 py-1.5 rounded-full text-sm
      transition-all duration-200
      ${isActive
        ? 'bg-white text-black'
        : 'bg-transparent text-gray-400 hover:text-white'
      }
    `}>
      {filter}
    </button>
  ))}
</div>
```

---

## Animation Patterns

### Using motion/react (Framer Motion)
```tsx
import { motion } from 'motion/react';

// Fade in on mount
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>

// Slide up on mount
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, ease: "easeOut" }}
>

// Scale on hover
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>

// Stagger children
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    visible: { transition: { staggerChildren: 0.1 } }
  }}
>
  {items.map(item => (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
    />
  ))}
</motion.div>
```

### Transition Defaults
```tsx
// Standard transitions
transition={{ duration: 0.2, ease: "easeOut" }}  // Fast UI feedback
transition={{ duration: 0.3, ease: "easeOut" }}  // Standard animations
transition={{ duration: 0.5, ease: "easeOut" }}  // Slower reveals
```

---

## Layout Structure

### Dashboard Grid (Desktop)
```tsx
<div className="min-h-screen bg-black">
  {/* Background gradient overlay */}
  <div className="fixed inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

  {/* Sidebar - Fixed Left */}
  <aside className="fixed left-0 top-0 w-64 h-screen">
    <Sidebar />
  </aside>

  {/* Main Content Area */}
  <main className="ml-64 min-h-screen">
    <div className="grid grid-cols-3 gap-6 p-6">
      {/* Left Column (2 cols) - Main content */}
      <div className="col-span-2 space-y-6">
        <TodaysSummary />
        <CriticalNewsFeed />
        <StockScreener />
      </div>

      {/* Right Column (1 col) - Impact Analysis */}
      <div className="col-span-1">
        <ImpactAnalysisPanel />
      </div>
    </div>
  </main>
</div>
```

### Responsive Breakpoints
| Breakpoint | Layout |
|------------|--------|
| `xl` (1280px+) | Full 3-column with sidebar |
| `lg` (1024px) | 2-column with collapsed sidebar |
| `md` (768px) | Single column, hamburger menu |
| `sm` (640px) | Mobile stack |

---

## Icons

Use **Lucide React** for all icons. Key icons by component:

### Sidebar Navigation
- Overview: `Home`
- Portfolio: `Briefcase`
- Sector News: `TrendingUp`
- Stock News: `Newspaper`
- Impact Analysis: `Target`
- Settings: `Settings`
- Logout: `LogOut`

### Sector Icons
- Technology: `Cpu`
- Healthcare: `Heart`
- Financial: `Landmark`
- Industrial: `Factory`
- Energy: `Zap`

### Chart Icons
- Up Arrow: `ArrowUp` or `TrendingUp`
- Down Arrow: `ArrowDown` or `TrendingDown`

---

## Recharts Configuration

### Candlestick Chart Colors
```tsx
const chartColors = {
  up: '#22c55e',      // Green
  down: '#ef4444',    // Red
  grid: 'rgba(255, 255, 255, 0.05)',
  axis: 'rgba(255, 255, 255, 0.3)',
  tooltip: {
    bg: '#262626',
    border: 'rgba(255, 255, 255, 0.1)',
    text: '#ffffff'
  }
};
```

### Chart Grid Styling
```tsx
<CartesianGrid
  strokeDasharray="3 3"
  stroke="rgba(255, 255, 255, 0.05)"
  vertical={false}
/>
```

---

## File Structure for Dashboard Components

```
src/
├── components/
│   └── dashboard/
│       ├── sidebar.tsx           # Navigation sidebar
│       ├── header.tsx            # Optional header bar
│       ├── todays-summary.tsx    # Summary cards (horizontal scroll)
│       ├── critical-news-feed.tsx # News list with filters
│       ├── stock-screener.tsx    # Stock tabs + chart + details
│       ├── impact-analysis.tsx   # Sector impact panel
│       ├── glass-card.tsx        # Reusable glass card component
│       └── filter-chips.tsx      # Reusable filter buttons
├── app/
│   └── (protected)/
│       └── dashboard/
│           ├── page.tsx          # Overview view (all components)
│           ├── portfolio/        # Portfolio view
│           ├── sector-news/      # Sector news view
│           ├── stock-news/       # Individual stock news
│           └── impact/           # Deep impact analysis
└── lib/
    └── mock-data/
        ├── summaries.ts          # Today's summary mock data
        ├── news.ts               # News feed mock data
        ├── stocks.ts             # Stock data mock
        └── sectors.ts            # Sector impact mock data
```

---

## Quick Reference: Tailwind Classes

### Glass Card
```
rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 p-4
```

### Active State
```
bg-white/20 border-white/30
```

### Gradient Text
```
bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent
```

### Muted Text
```
text-gray-400 text-sm
```

### Timestamp Text
```
text-gray-500 text-xs
```

### Horizontal Scroll Container
```
flex gap-4 overflow-x-auto pb-2 scrollbar-hide
```

---

## Implementation Phases

1. **Phase 1: Foundation** - Theme tokens, glass card component, basic layout
2. **Phase 2: Sidebar** - Navigation with view switching
3. **Phase 3: Today's Summary** - Horizontal scroll cards with mock data
4. **Phase 4: Critical News Feed** - News list with filter chips
5. **Phase 5: Stock Screener** - Tab selector, chart integration, details panel
6. **Phase 6: Impact Analysis** - Sector cards with icons
7. **Phase 7: Animations** - Framer Motion integration
8. **Phase 8: Responsive** - Mobile layouts and hamburger menu
9. **Phase 9: Real Data** - API integration, WebSocket updates
