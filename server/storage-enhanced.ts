import { 
  partners, 
  sessions,
  kycSessions, 
  quotes, 
  transactions, 
  webhookEvents,
  complianceLogs,
  analytics,
  type Partner, 
  type InsertPartner,
  type Session,
  type InsertSession,
  type KycSession,
  type InsertKycSession,
  type Quote,
  type InsertQuote,
  type Transaction,
  type InsertTransaction,
  type WebhookEvent,
  type InsertWebhookEvent,
  type ComplianceLog,
  type InsertComplianceLog,
  type Analytics,
  type InsertAnalytics
} from "@shared/schema-enhanced";
export interface IEnhancedStorage {
  // Partner methods
  createPartner(partner: InsertPartner, apiKey?: string, webhookSecret?: string): Promise<Partner>;
  getPartnerByApiKey(apiKey: string): Promise<Partner | undefined>;
  getPartnerById(partnerId: string): Promise<Partner | undefined>;
  
  // Session methods
  createSession(session: InsertSession & { sessionId: string; token: string; expiresAt: Date }): Promise<Session>;
  getSessionById(sessionId: string): Promise<Session | undefined>;
  updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | undefined>;
  
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
    depositAddress: string;
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
  createWebhookEvent(event: InsertWebhookEvent & { eventId: string }): Promise<WebhookEvent>;
  getWebhookEventById(eventId: string): Promise<WebhookEvent | undefined>;
  updateWebhookEvent(eventId: string, updates: Partial<WebhookEvent>): Promise<WebhookEvent | undefined>;
  
  // Compliance methods
  createComplianceLog(log: InsertComplianceLog & { logId: string }): Promise<ComplianceLog>;
  getComplianceLogsByPartner(partnerId: string, limit?: number): Promise<ComplianceLog[]>;
  
  // Analytics methods
  createAnalytics(analytics: InsertAnalytics): Promise<Analytics>;
  getDailyVolume(partnerId?: string): Promise<{ usd: number; inr: number; transactions: number }>;
  getKycMetrics(partnerId?: string): Promise<{ total: number; completed: number; successRate: number }>;
  getTransactionMetrics(partnerId?: string): Promise<{ pending: number; completed: number; failed: number; avgSettlementTime: number }>;
  getComplianceMetrics(partnerId?: string): Promise<{ strCount: number; ctrCount: number; complianceScore: number }>;
}

export class EnhancedDatabaseStorage implements IEnhancedStorage {
  private db: any;

  constructor(dbInstance: any) {
    this.db = dbInstance;
  }

  // Partner methods
  async createPartner(insertPartner: InsertPartner, providedApiKey?: string, providedWebhookSecret?: string): Promise<Partner> {
    const partnerId = `partner_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const apiKey = providedApiKey || `pk_live_${Math.random().toString(36).substring(2, 15)}`;
    const webhookSecret = providedWebhookSecret || `whsec_${Math.random().toString(36).substring(2, 15)}`;
    
    const insertData = {
      ...insertPartner,
      partnerId,
      apiKey,
      webhookSecret,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    try {
      const collection = this.db.collection('partners');
      const result = await collection.insertOne(insertData);
      if (!result.acknowledged) {
        throw new Error('Failed to insert partner');
      }
      return insertData as Partner;
    } catch (err) {
      console.error('[ERROR] Failed to insert partner:', err);
      throw err;
    }
  }

  async getPartnerByApiKey(apiKey: string): Promise<Partner | undefined> {
    try {
      const collection = this.db.collection('partners');
      const partner = await collection.findOne({ apiKey });
      return partner || undefined;
    } catch (err) {
      console.error('[ERROR] Failed to get partner by API key:', err);
      return undefined;
    }
  }

  async getPartnerById(partnerId: string): Promise<Partner | undefined> {
    try {
      const collection = this.db.collection('partners');
      const partner = await collection.findOne({ partnerId });
      return partner || undefined;
    } catch (err) {
      console.error('[ERROR] Failed to get partner by ID:', err);
      return undefined;
    }
  }

  // Session methods
  async createSession(insertSession: InsertSession & { sessionId: string; token: string; expiresAt: Date }): Promise<Session> {
    const insertData = {
      ...insertSession,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    try {
      const collection = this.db.collection('sessions');
      const result = await collection.insertOne(insertData);
      if (!result.acknowledged) {
        throw new Error('Failed to insert session');
      }
      return insertData as Session;
    } catch (err) {
      console.error('[ERROR] Failed to insert session:', err);
      throw err;
    }
  }

  async getSessionById(sessionId: string): Promise<Session | undefined> {
    try {
      const collection = this.db.collection('sessions');
      const session = await collection.findOne({ sessionId });
      return session || undefined;
    } catch (err) {
      console.error('[ERROR] Failed to get session by ID:', err);
      return undefined;
    }
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | undefined> {
    try {
      const collection = this.db.collection('sessions');
      const result = await collection.findOneAndUpdate(
        { sessionId },
        { $set: { ...updates, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
      return result.value || undefined;
    } catch (err) {
      console.error('[ERROR] Failed to update session:', err);
      return undefined;
    }
  }

  // KYC methods
  async createKycSession(insertSession: InsertKycSession): Promise<KycSession> {
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
      verificationData: null,
      complianceScore: 0,
      riskLevel: 'low'
    };
    
    try {
      const collection = this.db.collection('kycSessions');
      const result = await collection.insertOne(insertData);
      if (!result.acknowledged) {
        throw new Error('Failed to insert KYC session');
      }
      return insertData as KycSession;
    } catch (err) {
      console.error('[ERROR] Failed to insert KYC session:', err);
      throw err;
    }
  }

  async getKycSessionById(sessionId: string): Promise<KycSession | undefined> {
    try {
      const collection = this.db.collection('kycSessions');
      const session = await collection.findOne({ sessionId });
      return session || undefined;
    } catch (err) {
      console.error('[ERROR] Failed to get KYC session by ID:', err);
      return undefined;
    }
  }

  async updateKycSession(sessionId: string, updates: Partial<KycSession>): Promise<KycSession | undefined> {
    try {
      const collection = this.db.collection('kycSessions');
      const result = await collection.findOneAndUpdate(
        { sessionId },
        { $set: { ...updates, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
      return result.value || undefined;
    } catch (err) {
      console.error('[ERROR] Failed to update KYC session:', err);
      return undefined;
    }
  }

  async updateKycVerificationStatus(sessionId: string, verificationType: string, verified: boolean, name?: string): Promise<KycSession | undefined> {
    const session = await this.getKycSessionById(sessionId);
    if (!session) return undefined;
    
    const updates: Partial<KycSession> = {};
    
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
    
    return this.updateKycSession(sessionId, updates);
  }

  // Quote methods
  async createQuote(quoteData: InsertQuote & { 
    fxRate: string; 
    markupPct: string; 
    grossINR: string; 
    commission: string; 
    gstAmount: string; 
    tdsAmount: string; 
    estimatedINR: string; 
    depositAddress: string;
    expiresAt: Date;
  }): Promise<Quote> {
    const quoteReference = `quote_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const insertData = {
      ...quoteData,
      quoteReference,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    try {
      const collection = this.db.collection('quotes');
      const result = await collection.insertOne(insertData);
      if (!result.acknowledged) {
        throw new Error('Failed to insert quote');
      }
      return insertData as Quote;
    } catch (err) {
      console.error('[ERROR] Failed to insert quote:', err);
      throw err;
    }
  }

  async getQuoteByReference(quoteReference: string): Promise<Quote | undefined> {
    try {
      const collection = this.db.collection('quotes');
      const quote = await collection.findOne({ quoteReference });
      return quote || undefined;
    } catch (err) {
      console.error('[ERROR] Failed to get quote by reference:', err);
      return undefined;
    }
  }

  // Transaction methods
  async createTransaction(transactionData: InsertTransaction & { 
    depositAddress: string; 
    expiresAt: Date; 
  }): Promise<Transaction> {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const insertData = {
      ...transactionData,
      transactionId,
      status: 'pending_deposit',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    try {
      const collection = this.db.collection('transactions');
      const result = await collection.insertOne(insertData);
      if (!result.acknowledged) {
        throw new Error('Failed to insert transaction');
      }
      return insertData as Transaction;
    } catch (err) {
      console.error('[ERROR] Failed to insert transaction:', err);
      throw err;
    }
  }

  async getTransactionById(transactionId: string): Promise<Transaction | undefined> {
    try {
      const collection = this.db.collection('transactions');
      const transaction = await collection.findOne({ transactionId });
      return transaction || undefined;
    } catch (err) {
      console.error('[ERROR] Failed to get transaction by ID:', err);
      return undefined;
    }
  }

  async updateTransaction(transactionId: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    try {
      const collection = this.db.collection('transactions');
      const result = await collection.findOneAndUpdate(
        { transactionId },
        { $set: { ...updates, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
      return result.value || undefined;
    } catch (err) {
      console.error('[ERROR] Failed to update transaction:', err);
      return undefined;
    }
  }

  // Webhook methods
  async createWebhookEvent(insertEvent: InsertWebhookEvent & { eventId: string }): Promise<WebhookEvent> {
    const insertData = {
      ...insertEvent,
      status: 'pending',
      attempts: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    try {
      const collection = this.db.collection('webhookEvents');
      const result = await collection.insertOne(insertData);
      if (!result.acknowledged) {
        throw new Error('Failed to insert webhook event');
      }
      return insertData as WebhookEvent;
    } catch (err) {
      console.error('[ERROR] Failed to insert webhook event:', err);
      throw err;
    }
  }

  async getWebhookEventById(eventId: string): Promise<WebhookEvent | undefined> {
    try {
      const collection = this.db.collection('webhookEvents');
      const event = await collection.findOne({ eventId });
      return event || undefined;
    } catch (err) {
      console.error('[ERROR] Failed to get webhook event by ID:', err);
      return undefined;
    }
  }

  async updateWebhookEvent(eventId: string, updates: Partial<WebhookEvent>): Promise<WebhookEvent | undefined> {
    try {
      const collection = this.db.collection('webhookEvents');
      const result = await collection.findOneAndUpdate(
        { eventId },
        { $set: { ...updates, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
      return result.value || undefined;
    } catch (err) {
      console.error('[ERROR] Failed to update webhook event:', err);
      return undefined;
    }
  }

  // Compliance methods
  async createComplianceLog(insertLog: InsertComplianceLog & { logId: string }): Promise<ComplianceLog> {
    const insertData = {
      ...insertLog,
      createdAt: new Date()
    };
    
    try {
      const collection = this.db.collection('complianceLogs');
      const result = await collection.insertOne(insertData);
      if (!result.acknowledged) {
        throw new Error('Failed to insert compliance log');
      }
      return insertData as ComplianceLog;
    } catch (err) {
      console.error('[ERROR] Failed to insert compliance log:', err);
      throw err;
    }
  }

  async getComplianceLogsByPartner(partnerId: string, limit: number = 100): Promise<ComplianceLog[]> {
    try {
      const collection = this.db.collection('complianceLogs');
      const logs = await collection.find({ partnerId }).sort({ createdAt: -1 }).limit(limit).toArray();
      return logs;
    } catch (err) {
      console.error('[ERROR] Failed to get compliance logs by partner:', err);
      return [];
    }
  }

  // Analytics methods
  async createAnalytics(insertAnalytics: InsertAnalytics): Promise<Analytics> {
    const insertData = {
      ...insertAnalytics,
      createdAt: new Date()
    };
    
    try {
      const collection = this.db.collection('analytics');
      const result = await collection.insertOne(insertData);
      if (!result.acknowledged) {
        throw new Error('Failed to insert analytics');
      }
      return insertData as Analytics;
    } catch (err) {
      console.error('[ERROR] Failed to insert analytics:', err);
      throw err;
    }
  }

  async getDailyVolume(partnerId?: string): Promise<{ usd: number; inr: number; transactions: number }> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      const collection = this.db.collection('transactions');
      const match: any = {
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      };
      if (partnerId) {
        match.sessionId = partnerId;
      }
      
      const aggregation = [
        { $match: match },
        {
          $group: {
            _id: null,
            usd: { $sum: "$amount" },
            inr: { $sum: "$expectedAmount" },
            transactions: { $sum: 1 }
          }
        }
      ];
      
      const result = await collection.aggregate(aggregation).toArray();
      const data = result[0] || { usd: 0, inr: 0, transactions: 0 };
      
      return {
        usd: Number(data.usd) || 0,
        inr: Number(data.inr) || 0,
        transactions: Number(data.transactions) || 0
      };
    } catch (err) {
      console.error('[ERROR] Failed to get daily volume:', err);
      return { usd: 0, inr: 0, transactions: 0 };
    }
  }

  async getKycMetrics(partnerId?: string): Promise<{ total: number; completed: number; successRate: number }> {
    try {
      const collection = this.db.collection('kycSessions');
      const match: any = {};
      if (partnerId) {
        match.partnerId = partnerId;
      }
      
      const aggregation = [
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } }
          }
        }
      ];
      
      const result = await collection.aggregate(aggregation).toArray();
      const data = result[0] || { total: 0, completed: 0 };
      const total = Number(data.total) || 0;
      const completed = Number(data.completed) || 0;
      
      return {
        total,
        completed,
        successRate: total > 0 ? (completed / total) * 100 : 0
      };
    } catch (err) {
      console.error('[ERROR] Failed to get KYC metrics:', err);
      return { total: 0, completed: 0, successRate: 0 };
    }
  }

  async getTransactionMetrics(partnerId?: string): Promise<{ pending: number; completed: number; failed: number; avgSettlementTime: number }> {
    try {
      const collection = this.db.collection('transactions');
      const match: any = {};
      if (partnerId) {
        match.sessionId = partnerId;
      }
      
      const aggregation = [
        { $match: match },
        {
          $group: {
            _id: null,
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending_deposit"] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
            avgSettlementTime: { $avg: { $divide: [{ $subtract: ["$completedAt", "$createdAt"] }, 3600000] } }
          }
        }
      ];
      
      const result = await collection.aggregate(aggregation).toArray();
      const data = result[0] || { pending: 0, completed: 0, failed: 0, avgSettlementTime: 0 };
      
      return {
        pending: Number(data.pending) || 0,
        completed: Number(data.completed) || 0,
        failed: Number(data.failed) || 0,
        avgSettlementTime: Number(data.avgSettlementTime) || 0
      };
    } catch (err) {
      console.error('[ERROR] Failed to get transaction metrics:', err);
      return { pending: 0, completed: 0, failed: 0, avgSettlementTime: 0 };
    }
  }

  async getComplianceMetrics(partnerId?: string): Promise<{ strCount: number; ctrCount: number; complianceScore: number }> {
    try {
      const collection = this.db.collection('complianceLogs');
      const match: any = {};
      if (partnerId) {
        match.partnerId = partnerId;
      }
      
      const aggregation = [
        { $match: match },
        {
          $group: {
            _id: null,
            strCount: { $sum: { $cond: [{ $eq: ["$eventType", "suspicious_transaction"] }, 1, 0] } },
            ctrCount: { $sum: { $cond: [{ $eq: ["$eventType", "cash_transaction"] }, 1, 0] } },
            avgComplianceScore: { $avg: "$complianceScore" }
          }
        }
      ];
      
      const result = await collection.aggregate(aggregation).toArray();
      const data = result[0] || { strCount: 0, ctrCount: 0, avgComplianceScore: 0 };
      
      return {
        strCount: Number(data.strCount) || 0,
        ctrCount: Number(data.ctrCount) || 0,
        complianceScore: Number(data.avgComplianceScore) || 0
      };
    } catch (err) {
      console.error('[ERROR] Failed to get compliance metrics:', err);
      return { strCount: 0, ctrCount: 0, complianceScore: 0 };
    }
  }
}

// Export the enhanced storage instance
import { connectToMongo } from './db';
let enhancedStorage: EnhancedDatabaseStorage;

// Immediately-invoked async function to initialize enhancedStorage with a connected db
const enhancedStoragePromise = (async () => {
  const db = await connectToMongo();
  return new EnhancedDatabaseStorage(db);
})();
export { enhancedStoragePromise };