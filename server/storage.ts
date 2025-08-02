import { 
  partners, 
  kycSessions, 
  quotes, 
  transactions, 
  webhookEvents,
  type Partner, 
  type InsertPartner,
  type KycSession,
  type InsertKycSession,
  type Quote,
  type InsertQuote,
  type Transaction,
  type InsertTransaction,
  type WebhookEvent,
  type InsertWebhookEvent
} from "../shared/schema.ts";

export interface IStorage {
  // Partner methods
  createPartner(partner: InsertPartner, apiKey?: string): Promise<Partner>;
  getPartnerByApiKey(apiKey: string): Promise<Partner | undefined>;
  getPartnerById(partnerId: string): Promise<Partner | undefined>;
  
  // KYC methods
  createKycSession(session: InsertKycSession): Promise<KycSession>;
  getKycSessionById(sessionId: string): Promise<KycSession | undefined>;
  updateKycSession(sessionId: string, updates: Partial<KycSession>): Promise<KycSession | undefined>;
  updateKycVerificationStatus(sessionId: string, verificationType: string, verified: boolean, name?: string): Promise<KycSession | undefined>;
  
  // Quote methods
  createQuote(quote: InsertQuote & { 
    fxRate: number; 
    markupPct: number; 
    grossINR: number; 
    commission: number; 
    gstAmount: number; 
    tdsAmount: number; 
    estimatedINR: number; 
    expiresAt: Date;
  }): Promise<Quote>;
  getQuoteByReference(quoteReference: string): Promise<Quote | undefined>;
  
  // Transaction methods
  createTransaction(transaction: InsertTransaction & { 
    depositAddress: string; 
    expiresAt: Date; 
  }): Promise<Transaction>;
  getTransactionById(transactionId: string): Promise<Transaction | undefined>;
  updateTransaction(transactionId: string, updates: Partial<Transaction>): Promise<Transaction | undefined>;
  
  // Webhook methods
  createWebhookEvent(event: InsertWebhookEvent): Promise<WebhookEvent>;
  getWebhookEventById(eventId: string): Promise<WebhookEvent | undefined>;
  updateWebhookEvent(eventId: string, updates: Partial<WebhookEvent>): Promise<WebhookEvent | undefined>;
}

export class MemStorage implements IStorage {
  private partners: Map<string, Partner> = new Map();
  private kycSessions: Map<string, KycSession> = new Map();
  private quotes: Map<string, Quote> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private webhookEvents: Map<string, WebhookEvent> = new Map();
  
  private currentId = 1;

  // Partner methods
  async createPartner(insertPartner: InsertPartner, providedApiKey?: string): Promise<Partner> {
    const id = this.currentId++;
    const partnerId = `partner_${id.toString().padStart(3, '0')}`;
    // Use provided API key or generate a default one
    const apiKey = providedApiKey || `pk_live_${Math.random().toString(36).substring(2, 15)}`;
    
    const partner: Partner = {
      id,
      partnerId,
      apiKey,
      status: "active",
      createdAt: new Date(),
      environment: "production",
      ...insertPartner,
      webhookUrl: insertPartner.webhookUrl || null,
    };
    
    this.partners.set(partnerId, partner);
    return partner;
  }

  async getPartnerByApiKey(apiKey: string): Promise<Partner | undefined> {
    return Array.from(this.partners.values()).find(p => p.apiKey === apiKey);
  }

  async getPartnerById(partnerId: string): Promise<Partner | undefined> {
    return this.partners.get(partnerId);
  }

  // KYC methods
  async createKycSession(insertSession: InsertKycSession): Promise<KycSession> {
    const id = this.currentId++;
    // Use 'kyc_' prefix for sessionId to match API expectations
    const sessionId = `kyc_${id.toString().padStart(3, '0')}`;
    const session: KycSession = {
      id,
      sessionId,
      status: "initiated",
      createdAt: new Date(),
      updatedAt: new Date(),
      kycProvider: "cashfree",
      aadhaarVerified: false,
      panVerified: false,
      faceVerified: false,
      upiVerified: false,
      bankVerified: false,
      nameMatchVerified: false,
      aadhaarName: null,
      panName: null,
      upiName: null,
      bankName: null,
      verifiedName: null,
      verificationData: null,
      partnerId: insertSession.partnerId,
      userId: insertSession.userId,
      customerRef: insertSession.customerRef || insertSession.userId,
      documentType: insertSession.documentType,
      documentNumber: insertSession.documentNumber,
      holderName: insertSession.holderName || null,
      methods: null,
      redirectUrl: null
    };
    this.kycSessions.set(sessionId, session);
    return session;
  }

  async getKycSessionById(sessionId: string): Promise<KycSession | undefined> {
    return this.kycSessions.get(sessionId);
  }

  async updateKycSession(sessionId: string, updates: Partial<KycSession>): Promise<KycSession | undefined> {
    const session = this.kycSessions.get(sessionId);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.kycSessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  async updateKycVerificationStatus(sessionId: string, verificationType: string, verified: boolean, name?: string): Promise<KycSession | undefined> {
    const session = this.kycSessions.get(sessionId);
    if (!session) return undefined;
    
    const updates: Partial<KycSession> = {};
    
    // Update verification status and name based on type
    switch (verificationType) {
      case 'aadhaar':
        updates.aadhaarVerified = verified;
        if (name) updates.aadhaarName = name;
        break;
      case 'pan':
        updates.panVerified = verified;
        if (name) updates.panName = name;
        break;
      case 'face':
        updates.faceVerified = verified;
        break;
      case 'upi':
        updates.upiVerified = verified;
        if (name) updates.upiName = name;
        break;
      case 'bank':
        updates.bankVerified = verified;
        if (name) updates.bankName = name;
        break;
      case 'name_match':
        updates.nameMatchVerified = verified;
        if (name) updates.verifiedName = name;
        break;
    }
    
    const updatedSession = { ...session, ...updates };
    this.kycSessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  // Quote methods
  async createQuote(quoteData: InsertQuote & { 
    fxRate: number; 
    markupPct: number; 
    grossINR: number; 
    commission: number; 
    gstAmount: number; 
    tdsAmount: number; 
    estimatedINR: number; 
    expiresAt: Date;
  }): Promise<Quote> {
    const id = this.currentId++;
    const quoteReference = `quote_${id.toString().padStart(3, '0')}`;
    
    const quote: Quote = {
      id,
      quoteReference,
      createdAt: new Date(),
      token: quoteData.token,
      network: quoteData.network,
      amount: quoteData.amount,
      targetChain: quoteData.targetChain || null,
      targetToken: quoteData.targetToken || null,
      fxRate: quoteData.fxRate.toString(),
      markupPct: quoteData.markupPct.toString(),
      grossINR: quoteData.grossINR.toString(),
      commission: quoteData.commission.toString(),
      gstAmount: quoteData.gstAmount.toString(),
      tdsAmount: quoteData.tdsAmount.toString(),
      estimatedINR: quoteData.estimatedINR.toString(),
      expiresAt: quoteData.expiresAt,
    };
    
    this.quotes.set(quoteReference, quote);
    return quote;
  }

  async getQuoteByReference(quoteReference: string): Promise<Quote | undefined> {
    return this.quotes.get(quoteReference);
  }

  // Transaction methods
  async createTransaction(transactionData: InsertTransaction & { 
    depositAddress: string; 
    expiresAt: Date; 
  }): Promise<Transaction> {
    const id = this.currentId++;
    const transactionId = `tx_${id.toString().padStart(3, '0')}`;
    
    const transaction: Transaction = {
      id,
      transactionId,
      status: "pending_deposit",
      depositedAmount: null,
      payoutAmount: null,
      depositTxHash: null,
      payoutTxHash: null,
      completedAt: null,
      createdAt: new Date(),
      ...transactionData,
      destinationAddress: transactionData.destinationAddress || null,
    };
    
    this.transactions.set(transactionId, transaction);
    return transaction;
  }

  async getTransactionById(transactionId: string): Promise<Transaction | undefined> {
    return this.transactions.get(transactionId);
  }

  async updateTransaction(transactionId: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return undefined;
    
    const updatedTransaction = { ...transaction, ...updates };
    this.transactions.set(transactionId, updatedTransaction);
    return updatedTransaction;
  }

  // Webhook methods
  async createWebhookEvent(insertEvent: InsertWebhookEvent): Promise<WebhookEvent> {
    const id = this.currentId++;
    const eventId = `event_${id.toString().padStart(3, '0')}`;
    
    const event: WebhookEvent = {
      id,
      eventId,
      status: "pending",
      attempts: 0,
      lastAttempt: null,
      createdAt: new Date(),
      ...insertEvent,
    };
    
    this.webhookEvents.set(eventId, event);
    return event;
  }

  async getWebhookEventById(eventId: string): Promise<WebhookEvent | undefined> {
    return this.webhookEvents.get(eventId);
  }

  async updateWebhookEvent(eventId: string, updates: Partial<WebhookEvent>): Promise<WebhookEvent | undefined> {
    const event = this.webhookEvents.get(eventId);
    if (!event) return undefined;
    
    const updatedEvent = { ...event, ...updates };
    this.webhookEvents.set(eventId, updatedEvent);
    return updatedEvent;
  }
}

// Use database storage for production
import { db } from "./db.ts";
import { eq } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  async createPartner(insertPartner: InsertPartner, providedApiKey?: string): Promise<Partner> {
    const partnerId = `partner_${Date.now().toString().slice(-6)}`;
    // Use provided API key or generate a default one
    const apiKey = providedApiKey || `pk_live_${Math.random().toString(36).substring(2, 15)}`;
    
    const insertData = {
      ...insertPartner,
      partnerId,
      apiKey,
      status: 'active'
    };
    
    const [partner] = await db
      .insert(partners)
      .values(insertData)
      .returning();
    return partner;
  }

  async getPartnerByApiKey(apiKey: string): Promise<Partner | undefined> {
    const [partner] = await db.select().from(partners).where(eq(partners.apiKey, apiKey));
    return partner || undefined;
  }

  async getPartnerById(partnerId: string): Promise<Partner | undefined> {
    const [partner] = await db.select().from(partners).where(eq(partners.partnerId, partnerId));
    return partner || undefined;
  }

  async createKycSession(insertSession: InsertKycSession): Promise<KycSession> {
    // Always generate a unique sessionId for DB-backed storage
    const sessionId = `kyc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const insertData = {
      ...insertSession,
      sessionId,
      status: 'initiated',
      createdAt: new Date(),
      updatedAt: new Date(),
      kycProvider: 'cashfree',
      aadhaarVerified: false,
      panVerified: false,
      faceVerified: false,
      upiVerified: false,
      bankVerified: false,
      nameMatchVerified: false,
      aadhaarName: null,
      panName: null,
      upiName: null,
      bankName: null,
      verifiedName: null,
      verificationData: null
    };
    try {
      const [session] = await db
        .insert(kycSessions)
        .values(insertData)
        .returning();
      return session;
    } catch (err) {
      console.error('[ERROR] Failed to insert KYC session:', err);
      throw err;
    }
  }

  async getKycSessionById(sessionId: string): Promise<KycSession | undefined> {
    const [session] = await db.select().from(kycSessions).where(eq(kycSessions.sessionId, sessionId));
    return session || undefined;
  }

  async updateKycSession(sessionId: string, updates: Partial<KycSession>): Promise<KycSession | undefined> {
    // Filter out undefined values to prevent "No values to set" error
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    if (Object.keys(filteredUpdates).length === 0) {
      return this.getKycSessionById(sessionId);
    }
    
    const [session] = await db
      .update(kycSessions)
      .set(filteredUpdates)
      .where(eq(kycSessions.sessionId, sessionId))
      .returning();
    return session || undefined;
  }

  async updateKycVerificationStatus(sessionId: string, verificationType: string, verified: boolean, name?: string): Promise<KycSession | undefined> {
    const updates: Partial<KycSession> = {};
    
    // Update verification status and name based on type
    switch (verificationType) {
      case 'aadhaar':
        updates.aadhaarVerified = verified;
        if (name) updates.aadhaarName = name;
        break;
      case 'pan':
        updates.panVerified = verified;
        if (name) updates.panName = name;
        break;
      case 'face':
        updates.faceVerified = verified;
        break;
      case 'upi':
        updates.upiVerified = verified;
        if (name) updates.upiName = name;
        break;
      case 'bank':
        updates.bankVerified = verified;
        if (name) updates.bankName = name;
        break;
      case 'name_match':
        updates.nameMatchVerified = verified;
        if (name) updates.verifiedName = name;
        break;
    }
    
    const [session] = await db
      .update(kycSessions)
      .set(updates)
      .where(eq(kycSessions.sessionId, sessionId))
      .returning();
    return session || undefined;
  }

  async createQuote(quoteData: InsertQuote & { 
    fxRate: number; 
    markupPct: number; 
    grossINR: number; 
    commission: number; 
    gstAmount: number; 
    tdsAmount: number; 
    estimatedINR: number; 
    expiresAt: Date;
  }): Promise<Quote> {
    const quoteReference = `quote_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const insertData = {
      ...quoteData,
      quoteReference,
      fxRate: quoteData.fxRate.toString(),
      markupPct: quoteData.markupPct.toString(),
      grossINR: quoteData.grossINR.toString(),
      commission: quoteData.commission.toString(),
      gstAmount: quoteData.gstAmount.toString(),
      tdsAmount: quoteData.tdsAmount.toString(),
      estimatedINR: quoteData.estimatedINR.toString(),
      expiresAt: quoteData.expiresAt
    };
    
    const [quote] = await db
      .insert(quotes)
      .values(insertData)
      .returning();
    return quote;
  }

  async getQuoteByReference(quoteReference: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.quoteReference, quoteReference));
    return quote || undefined;
  }

  async createTransaction(transactionData: InsertTransaction & { 
    depositAddress: string; 
    expiresAt: Date; 
  }): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(transactionData)
      .returning();
    return transaction;
  }

  async getTransactionById(transactionId: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.transactionId, transactionId));
    return transaction || undefined;
  }

  async updateTransaction(transactionId: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    // Filter out undefined values to prevent "No values to set" error
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    if (Object.keys(filteredUpdates).length === 0) {
      console.log(`[STORAGE] No updates to apply for transaction ${transactionId}`);
      return this.getTransactionById(transactionId);
    }
    
    const [transaction] = await db
      .update(transactions)
      .set(filteredUpdates)
      .where(eq(transactions.transactionId, transactionId))
      .returning();
    return transaction || undefined;
  }

  async createWebhookEvent(insertEvent: InsertWebhookEvent): Promise<WebhookEvent> {
    const [event] = await db
      .insert(webhookEvents)
      .values(insertEvent)
      .returning();
    return event;
  }

  async getWebhookEventById(eventId: string): Promise<WebhookEvent | undefined> {
    const [event] = await db.select().from(webhookEvents).where(eq(webhookEvents.eventId, eventId));
    return event || undefined;
  }

  async updateWebhookEvent(eventId: string, updates: Partial<WebhookEvent>): Promise<WebhookEvent | undefined> {
    // Filter out undefined values to prevent "No values to set" error
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    if (Object.keys(filteredUpdates).length === 0) {
      console.log(`[STORAGE] No updates to apply for webhook event ${eventId}`);
      return this.getWebhookEventById(eventId);
    }
    
    const [event] = await db
      .update(webhookEvents)
      .set(filteredUpdates)
      .where(eq(webhookEvents.eventId, eventId))
      .returning();
    return event || undefined;
  }
}

// Force production behavior immediately
class ProductionStorage extends DatabaseStorage {
  async createPartner(insertPartner: InsertPartner): Promise<Partner> {
    const partnerId = `partner_${Date.now().toString().slice(-6)}`;
    const apiKey = `pk_live_${Math.random().toString(36).substring(2, 15)}`;
    
    const insertData = {
      ...insertPartner,
      partnerId,
      apiKey,
      status: 'active'
    };
    
    const [partner] = await db
      .insert(partners)
      .values(insertData)
      .returning();
    return partner;
  }
}

export const storage = db ? new ProductionStorage() : new MemStorage();
