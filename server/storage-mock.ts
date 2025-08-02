 
import { z } from 'zod';
import { partnerSchema, kycSessionSchema, quoteSchema, transactionSchema } from '@shared/schema';

type Partner = z.infer<typeof partnerSchema>;
type KycSession = z.infer<typeof kycSessionSchema>;
type Quote = z.infer<typeof quoteSchema>;
type Transaction = z.infer<typeof transactionSchema>;

const mockStorage = {
  getPartnerByApiKey: async (apiKey: string): Promise<Partner | null> => {
    console.log(`[MOCK] getPartnerByApiKey called with: ${apiKey}`);
    if (apiKey === 'pk_live_12345') {
      return {
        partnerId: 'partner_12345',
        apiKey: 'pk_live_12345',
        name: 'Mock Partner',
        email: 'mock@partner.com',
        status: 'active',
        webhookUrl: 'https://mockpartner.com/webhook',
        callbackUrl: 'https://mockpartner.com/callback',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return null;
  },

  createPartner: async (partnerData: Omit<Partner, 'partnerId' | 'apiKey' | 'createdAt' | 'updatedAt'>, apiKey: string, webhookSecret: string): Promise<Partner> => {
    console.log('[MOCK] createPartner called with:', partnerData);
    const newPartner: Partner = {
      ...partnerData,
      partnerId: `partner_${Date.now()}`,
      apiKey,
      webhookSecret,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return newPartner;
  },

  createSession: async (sessionData: any): Promise<any> => {
    console.log('[MOCK] createSession called with:', sessionData);
    return {
      ...sessionData,
      sessionId: `sess_${Date.now()}`,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },
  
  getSessionById: async (sessionId: string): Promise<any> => {
    console.log(`[MOCK] getSessionById called with: ${sessionId}`);
    return {
        sessionId,
        partnerId: 'partner_12345',
        status: 'active',
        callbackUrl: 'https://mockpartner.com/callback',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
  },

  createQuote: async (quoteData: any): Promise<any> => {
    console.log('[MOCK] createQuote called with:', quoteData);
    return {
      ...quoteData,
      quoteReference: `quote_${Date.now()}`,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },
  
    getQuoteByReference: async (quoteReference: string): Promise<any> => {
        console.log(`[MOCK] getQuoteByReference called with: ${quoteReference}`);
        return {
            quoteReference,
            sessionId: 'sess_12345',
            status: 'active',
            amount: '100',
            network: 'polygon',
            depositAddress: '0x1234567890abcdef1234567890abcdef12345678',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    },

  createKycSession: async (kycData: any): Promise<any> => {
    console.log('[MOCK] createKycSession called with:', kycData);
    return {
      ...kycData,
      sessionId: `kycsess_${Date.now()}`,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },
  
    getKycSessionById: async (sessionId: string): Promise<any> => {
        console.log(`[MOCK] getKycSessionById called with: ${sessionId}`);
        return {
            sessionId,
            partnerId: 'partner_12345',
            userId: 'user_12345',
            status: 'completed',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    },

  updateKycSession: async (sessionId: string, kycData: any): Promise<any> => {
    console.log(`[MOCK] updateKycSession called with: ${sessionId}`, kycData);
    return {
      sessionId,
      ...kycData,
    };
  },

  updateKycVerificationStatus: async (sessionId: string, verificationType: string, status: boolean, name: string | undefined): Promise<any> => {
    console.log(`[MOCK] updateKycVerificationStatus called with: ${sessionId}`, verificationType, status, name);
    return {
      sessionId,
      verificationType,
      status,
      name,
    };
  },

  createTransaction: async (transactionData: any): Promise<any> => {
    console.log('[MOCK] createTransaction called with:', transactionData);
    return {
      ...transactionData,
      transactionId: `txn_${Date.now()}`,
      status: 'pending_deposit',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },
  
    getTransactionById: async (transactionId: string): Promise<any> => {
        console.log(`[MOCK] getTransactionById called with: ${transactionId}`);
        return {
            transactionId,
            quoteReference: 'quote_12345',
            status: 'pending_deposit',
            network: 'polygon',
            depositAddress: '0x1234567890abcdef1234567890abcdef12345678',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    },

  updateTransaction: async (transactionId: string, transactionData: any): Promise<any> => {
    console.log(`[MOCK] updateTransaction called with: ${transactionId}`, transactionData);
    return {
      transactionId,
      ...transactionData,
    };
  },

  createComplianceLog: async (logData: any): Promise<void> => {
    console.log('[MOCK] createComplianceLog called with:', logData);
  },
};

export const mockEnhancedStoragePromise = Promise.resolve(mockStorage); 