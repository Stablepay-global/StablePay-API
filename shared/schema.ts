import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  partnerId: text("partner_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  apiKey: text("api_key").notNull().unique(),
  webhookUrl: text("webhook_url"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  environment: text("environment").notNull().default("production"), // <-- added
});

export const kycSessions = pgTable("kyc_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  partnerId: text("partner_id").notNull(),
  userId: text("user_id").notNull(),
  customerRef: text("customer_ref").notNull(),
  status: text("status").notNull().default("initiated"), // initiated, in_progress, completed, failed
  kycProvider: text("kyc_provider").notNull().default("cashfree"),
  methods: text("methods").array(),
  redirectUrl: text("redirect_url"),
  documentType: text("document_type").notNull(),
  documentNumber: text("document_number").notNull(),
  holderName: text("holder_name"),
  verificationData: jsonb("verification_data"),
  // KYC status tracking
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  partnerId: text("partner_id").notNull(),
  status: text("status").notNull().default("created"), // created, active, completed, expired
  callbackUrl: text("callback_url"),
  metadata: jsonb("metadata"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  quoteReference: text("quote_reference").notNull().unique(),
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
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  transactionId: text("transaction_id").notNull().unique(),
  quoteReference: text("quote_reference").notNull(),
  userId: text("user_id").notNull(),
  status: text("status").notNull().default("pending_deposit"),
  depositAddress: text("deposit_address"),
  destinationAddress: text("destination_address"),
  expectedAmount: decimal("expected_amount").notNull(),
  depositedAmount: decimal("deposited_amount"),
  payoutAmount: decimal("payout_amount"),
  network: text("network").notNull(),
  depositTxHash: text("deposit_tx_hash"),
  payoutTxHash: text("payout_tx_hash"),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  webhookUrl: text("webhook_url").notNull(),
  payload: text("payload").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").default(0),
  lastAttempt: timestamp("last_attempt"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertPartnerSchema = createInsertSchema(partners).omit({
  id: true,
  partnerId: true,
  apiKey: true,
  status: true,
  createdAt: true,
  // do NOT omit environment
});

export const insertKycSessionSchema = createInsertSchema(kycSessions).omit({
  id: true,
  sessionId: true,
  status: true,
  createdAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  sessionId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  quoteReference: true,
  fxRate: true,
  markupPct: true,
  grossINR: true,
  commission: true,
  gstAmount: true,
  tdsAmount: true,
  estimatedINR: true,
  expiresAt: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  transactionId: true,
  status: true,
  depositAddress: true,
  depositedAmount: true,
  payoutAmount: true,
  depositTxHash: true,
  payoutTxHash: true,
  completedAt: true,
  expiresAt: true,
  createdAt: true,
});

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
  id: true,
  eventId: true,
  status: true,
  attempts: true,
  lastAttempt: true,
  createdAt: true,
});

// Types
export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type KycSession = typeof kycSessions.$inferSelect;
export type InsertKycSession = z.infer<typeof insertKycSessionSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
