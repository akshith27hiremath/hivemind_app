import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ============================================
// Users Table
// ============================================

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  imageUrl: text("image_url"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  portfolios: many(portfolios),
}));

// ============================================
// Subscriptions Table
// ============================================

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).notNull().unique(),
  stripePriceId: varchar("stripe_price_id", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("incomplete"),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

// ============================================
// Portfolios Table
// ============================================

export const portfolios = pgTable("portfolios", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  source: varchar("source", { length: 50 }).notNull().default("manual"),
  sourceAccountId: varchar("source_account_id", { length: 255 }),
  isActive: boolean("is_active").default(true),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const portfoliosRelations = relations(portfolios, ({ one, many }) => ({
  user: one(users, {
    fields: [portfolios.userId],
    references: [users.id],
  }),
  holdings: many(holdings),
  transactions: many(transactions),
  importLogs: many(importLogs),
}));

// ============================================
// Holdings Table
// ============================================

export const holdings = pgTable(
  "holdings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 50 }).notNull(),
    exchange: varchar("exchange", { length: 50 }),
    instrumentType: varchar("instrument_type", { length: 50 }).notNull().default("equity"),
    quantity: decimal("quantity", { precision: 18, scale: 6 }).notNull(),
    averagePrice: decimal("average_price", { precision: 18, scale: 4 }).notNull(),
    currentPrice: decimal("current_price", { precision: 18, scale: 4 }),
    currency: varchar("currency", { length: 10 }).default("INR"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueHolding: unique("unique_holding").on(table.portfolioId, table.symbol, table.exchange),
    symbolIdx: index("holdings_symbol_idx").on(table.symbol),
  })
);

export const holdingsRelations = relations(holdings, ({ one, many }) => ({
  portfolio: one(portfolios, {
    fields: [holdings.portfolioId],
    references: [portfolios.id],
  }),
  transactions: many(transactions),
}));

// ============================================
// Transactions Table
// ============================================

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    holdingId: uuid("holding_id").references(() => holdings.id, { onDelete: "set null" }),
    symbol: varchar("symbol", { length: 50 }).notNull(),
    exchange: varchar("exchange", { length: 50 }),
    transactionType: varchar("transaction_type", { length: 20 }).notNull(),
    quantity: decimal("quantity", { precision: 18, scale: 6 }).notNull(),
    price: decimal("price", { precision: 18, scale: 4 }).notNull(),
    totalAmount: decimal("total_amount", { precision: 18, scale: 4 }).notNull(),
    fees: decimal("fees", { precision: 18, scale: 4 }).default("0"),
    currency: varchar("currency", { length: 10 }).default("INR"),
    transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
    notes: text("notes"),
    externalId: varchar("external_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    portfolioIdx: index("transactions_portfolio_idx").on(table.portfolioId),
    symbolIdx: index("transactions_symbol_idx").on(table.symbol),
    dateIdx: index("transactions_date_idx").on(table.transactionDate),
  })
);

export const transactionsRelations = relations(transactions, ({ one }) => ({
  portfolio: one(portfolios, {
    fields: [transactions.portfolioId],
    references: [portfolios.id],
  }),
  holding: one(holdings, {
    fields: [transactions.holdingId],
    references: [holdings.id],
  }),
}));

// ============================================
// Import Logs Table
// ============================================

export const importLogs = pgTable(
  "import_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    source: varchar("source", { length: 50 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("pending"),
    totalRecords: integer("total_records"),
    processedRecords: integer("processed_records").default(0),
    failedRecords: integer("failed_records").default(0),
    errorDetails: jsonb("error_details"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    portfolioIdx: index("import_logs_portfolio_idx").on(table.portfolioId),
  })
);

export const importLogsRelations = relations(importLogs, ({ one }) => ({
  portfolio: one(portfolios, {
    fields: [importLogs.portfolioId],
    references: [portfolios.id],
  }),
}));

// ============================================
// Type Exports
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

export type Portfolio = typeof portfolios.$inferSelect;
export type NewPortfolio = typeof portfolios.$inferInsert;

export type Holding = typeof holdings.$inferSelect;
export type NewHolding = typeof holdings.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type ImportLog = typeof importLogs.$inferSelect;
export type NewImportLog = typeof importLogs.$inferInsert;

// Subscription status enum
export const SubscriptionStatus = {
  INCOMPLETE: "incomplete",
  INCOMPLETE_EXPIRED: "incomplete_expired",
  TRIALING: "trialing",
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
  UNPAID: "unpaid",
  PAUSED: "paused",
} as const;

// Transaction type enum
export const TransactionType = {
  BUY: "buy",
  SELL: "sell",
  DIVIDEND: "dividend",
  SPLIT: "split",
  BONUS: "bonus",
} as const;

// Portfolio source enum
export const PortfolioSource = {
  MANUAL: "manual",
  CSV: "csv",
  ZERODHA: "zerodha",
  GROWW: "groww",
} as const;

// Import status enum
export const ImportStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;
