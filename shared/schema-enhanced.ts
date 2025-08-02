import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enhanced partners table
export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  partnerId: text("partner_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  apiKey: text("api_key").notNull().unique(),
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret"),
  status: text("status").notNull().default("active"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// New sessions table for enhanced session management
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  partnerId: text("partner_id").notNull(),
  token: text("token").notNull(),
  callbackUrl: text("callback_url"),
  metadata: jsonb("metadata"),
  status: text("status").notNull().default("active"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced KYC sessions table
export const kycSessions = pgTable("kyc_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  partnerId: text("partner_id").notNull(),
  userId: text("user_id").notNull(),
  status: text("status").notNull().default("initiated"), // initiated, in_progress, completed, failed
  kycProvider: text("kyc_provider").notNull().default("cashfree"),
  documentType: text("document_type").notNull(),
  documentNumber: text("document_number").notNull(),
  holderName: text("holder_name"),
  verificationData: jsonb("verification_data"),
  verificationMethods: text("verification_methods").array(), // Array of verification methods
  // Enhanced verification tracking
  aadhaarVerified: boolean("aadhaar_verified").default(false),
  panVerified: boolean("pan_verified").default(false),
  faceVerified: boolean("face_verified").default(false),
  upiVerified: boolean("upi_verified").default(false),
  bankVerified: boolean("bank_verified").default(false),
  nameMatchVerified: boolean("name_match_verified").default(false),
  // Store verified names for consistency checking
  aadhaarName: text("aadhaar_name"),
  panName: text("pan_name"),
  upiName: text("upi_name"),
  bankName: text("bank_name"),
  verifiedName: text("verified_name"), // Final consolidated name after verification
  // Compliance tracking
  complianceScore: integer("compliance_score").default(0),
  riskLevel: text("risk_level").default("low"), // low, medium, high
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Enhanced quotes table
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  quoteReference: text("quote_reference").notNull().unique(),
  sessionId: text("session_id").notNull(),
  token: text("token").notNull(),
  network: text("network").notNull(),
  amount: decimal("amount").notNull(),
  targetChain: text("target_chain"),
  targetToken: text("target_token"),
  fxRate: decimal("fx_rate").notNull(),
  markupPct: decimal("markup_pct").notNull(),
  grossINR: decimal("gross_inr").notNull(),
  commission: decimal("commission").notNull(),
  gstAmount: decimal("gst_amount").notNull(),
  tdsAmount: decimal("tds_amount").notNull(),
  estimatedINR: decimal("estimated_inr").notNull(),
  depositAddress: text("deposit_address"),
  minConfirmations: integer("min_confirmations").default(12),
  status: text("status").notNull().default("active"), // active, expired, used
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  transactionId: text("transaction_id").notNull().unique(),
  quoteReference: text("quote_reference").notNull(),
  sessionId: text("session_id").notNull(),
  kycSessionId: text("kyc_session_id"),
  userId: text("user_id").notNull(),
  status: text("status").notNull().default("pending_deposit"), // pending_deposit, deposit_confirmed, processing, completed, failed, expired
  depositAddress: text("deposit_address"),
  destinationAddress: text("destination_address"),
  expectedAmount: decimal("expected_amount").notNull(),
  depositedAmount: decimal("deposited_amount"),
  payoutAmount: decimal("payout_amount"),
  network: text("network").notNull(),
  depositTxHash: text("deposit_tx_hash"),
  payoutTxHash: text("payout_tx_hash"),
  payoutChannel: text("payout_channel"), // upi, bank, neft, imps
  payoutDestination: text("payout_destination"), // UPI ID or bank details
  payoutUtr: text("payout_utr"), // UTR number for bank transfers
  // Compliance tracking
  complianceStatus: text("compliance_status").default("pending"), // pending, approved, flagged, rejected
  riskScore: integer("risk_score").default(0),
  // Timestamps
  depositConfirmedAt: timestamp("deposit_confirmed_at"),
  payoutInitiatedAt: timestamp("payout_initiated_at"),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced webhook events table
export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  sessionId: text("session_id"),
  transactionId: text("transaction_id"),
  webhookUrl: text("webhook_url").notNull(),
  payload: text("payload").notNull(),
  signature: text("signature"),
  status: text("status").notNull().default("pending"), // pending, delivered, failed, retrying
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  lastAttempt: timestamp("last_attempt"),
  nextRetryAt: timestamp("next_retry_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// New compliance logs table
export const complianceLogs = pgTable("compliance_logs", {
  id: serial("id").primaryKey(),
  logId: text("log_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  partnerId: text("partner_id"),
  sessionId: text("session_id"),
  transactionId: text("transaction_id"),
  userId: text("user_id"),
  data: jsonb("data").notNull(),
  riskScore: integer("risk_score").default(0),
  riskLevel: text("risk_level").default("low"),
  complianceStatus: text("compliance_status").default("pending"),
  fiuReported: boolean("fiu_reported").default(false),
  fiuReportId: text("fiu_report_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// New analytics table for business metrics
export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD format
  partnerId: text("partner_id"),
  metricType: text("metric_type").notNull(), // volume, transactions, kyc, compliance
  metricValue: decimal("metric_value").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertPartnerSchema = createInsertSchema(partners).omit({
  id: true,
  partnerId: true,
  apiKey: true,
  webhookSecret: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  sessionId: true,
  token: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKycSessionSchema = createInsertSchema(kycSessions).omit({
  id: true,
  sessionId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  quoteReference: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  transactionId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
  id: true,
  eventId: true,
  status: true,
  attempts: true,
  lastAttempt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertComplianceLogSchema = createInsertSchema(complianceLogs).omit({
  id: true,
  logId: true,
  createdAt: true,
});

export const insertAnalyticsSchema = createInsertSchema(analytics).omit({
  id: true,
  createdAt: true,
});

// Types
export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type KycSession = typeof kycSessions.$inferSelect;
export type InsertKycSession = z.infer<typeof insertKycSessionSchema>;
export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type ComplianceLog = typeof complianceLogs.$inferSelect;
export type InsertComplianceLog = z.infer<typeof insertComplianceLogSchema>;
export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>; 