import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Types
export interface SessionResponse {
  success: boolean;
  data: {
    sessionId: string;
    token: string;
    expiresAt: string;
    status: string;
  };
}

export interface QuoteResponse {
  success: boolean;
  data: {
    sessionId: string;
    quoteId: string;
    asset: string;
    network: string;
    amountUsd: number;
    fxRate: number;
    grossInr: number;
    breakdown: {
      tds: number;
      platformFee: number;
      gst: number;
      netInr: number;
    };
    depositAddress: {
      network: string;
      address: string;
      minConfirmations: number;
    };
    expiresAt: string;
    status: string;
  };
}

export interface KycSessionResponse {
  success: boolean;
  data: {
    kycSessionId: string;
    status: string;
    verificationMethods: Array<{
      type: string;
      status: string;
      endpoint: string;
    }>;
    createdAt: string;
  };
}

export interface KycVerificationResponse {
  success: boolean;
  data: {
    sessionId: string;
    verified: boolean;
    aadhaar?: {
      verified: boolean;
      name: string;
      number: string;
    };
    completedAt: string;
  };
}

export interface TransactionResponse {
  success: boolean;
  data: {
    transactionId: string;
    sessionId: string;
    status: string;
    depositAddress: {
      network: string;
      address: string;
      minConfirmations: number;
    };
    expectedAmount: number;
    expiresAt: string;
    createdAt: string;
  };
}

export interface TransactionStatusResponse {
  success: boolean;
  data: {
    transactionId: string;
    sessionId: string;
    status: string;
    kyc: {
      status: string;
      kycId: string;
    };
    deposit: {
      status: string;
      txHash?: string;
      confirmations: number;
      amount?: number;
      confirmedAt?: string;
    };
    payout: {
      status: string;
      utr?: string;
      estimatedSettlement?: string;
    };
    financials: {
      grossInr?: number;
      netInr?: number;
      fees: {
        tds?: number;
        platformFee?: number;
        gst?: number;
      };
    };
  };
}

export interface PayoutResponse {
  success: boolean;
  data: {
    payoutId: string;
    transactionId: string;
    status: string;
    channel: string;
    destination: string;
    amount: number;
    utr: string;
    settledAt: string;
  };
}

export interface WebhookTestResponse {
  success: boolean;
  data: {
    received: boolean;
    signatureValid: boolean;
    timestamp: number;
    event: string;
    payload: any;
  };
}

export interface AnalyticsResponse {
  success: boolean;
  data: {
    dailyVolume: {
      usd: number;
      inr: number;
      transactions: number;
    };
    kycMetrics: {
      total: number;
      completed: number;
      successRate: number;
    };
    transactionMetrics: {
      pending: number;
      completed: number;
      failed: number;
      avgSettlementTime: number;
    };
    complianceMetrics: {
      strCount: number;
      ctrCount: number;
      complianceScore: number;
    };
  };
}

export class StablePay {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string, baseURL = 'https://api.stablepay.global') {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('StablePay API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Session Management
  async createSession(callbackUrl: string, metadata?: any): Promise<SessionResponse> {
    const response: AxiosResponse<SessionResponse> = await this.client.post('/api/v1/session/create', {
      callbackUrl,
      metadata
    });
    return response.data;
  }

  // Quote Generation
  async getQuote(params: {
    sessionId: string;
    asset: 'USDC' | 'USDT';
    network: 'ethereum' | 'polygon' | 'bsc' | 'solana';
    amountUsd: number;
  }): Promise<QuoteResponse> {
    const response: AxiosResponse<QuoteResponse> = await this.client.get('/api/v1/quotes', { params });
    return response.data;
  }

  // KYC Management
  async createKycSession(params: {
    sessionId: string;
    userId: string;
    documentType: string;
    documentNumber: string;
    holderName: string;
  }): Promise<KycSessionResponse> {
    const response: AxiosResponse<KycSessionResponse> = await this.client.post('/api/v1/kyc/session/create', params);
    return response.data;
  }

  async generateAadhaarOtp(params: {
    sessionId: string;
    aadhaarNumber: string;
  }): Promise<{ success: boolean; data: { sessionId: string; message: string; refId: string; maskedMobile: string } }> {
    const response = await this.client.post('/api/v1/kyc/aadhaar/generate-otp', params);
    return response.data;
  }

  async verifyAadhaar(params: {
    sessionId: string;
    aadhaarNumber: string;
    name: string;
    otp: string;
  }): Promise<KycVerificationResponse> {
    const response: AxiosResponse<KycVerificationResponse> = await this.client.post('/api/v1/kyc/aadhaar-okyc', params);
    return response.data;
  }

  async verifyPan(params: {
    sessionId: string;
    panNumber: string;
    name: string;
  }): Promise<{ success: boolean; data: any }> {
    const response = await this.client.post('/api/v1/kyc/pan/verify', params);
    return response.data;
  }

  async verifyBankAccount(params: {
    sessionId: string;
    accountNumber: string;
    ifscCode: string;
    name: string;
  }): Promise<{ success: boolean; data: any }> {
    const response = await this.client.post('/api/v1/kyc/bank/verify', params);
    return response.data;
  }

  async verifyUpi(params: {
    sessionId: string;
    upiId: string;
    name: string;
  }): Promise<{ success: boolean; data: any }> {
    const response = await this.client.post('/api/v1/kyc/upi/verify', params);
    return response.data;
  }

  async verifyFaceLiveness(params: {
    sessionId: string;
    imageData: string;
    action?: string;
  }): Promise<{ success: boolean; data: any }> {
    const response = await this.client.post('/api/v1/kyc/face-liveness/verify', params);
    return response.data;
  }

  // Transaction Management
  async createTransaction(params: {
    sessionId: string;
    quoteId: string;
    kycSessionId: string;
    asset: string;
    network: string;
  }): Promise<TransactionResponse> {
    const response: AxiosResponse<TransactionResponse> = await this.client.post('/api/v1/transaction/create', params);
    return response.data;
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionStatusResponse> {
    const response: AxiosResponse<TransactionStatusResponse> = await this.client.get(`/api/v1/transaction/${transactionId}`);
    return response.data;
  }

  // Deposit Simulation (for testing)
  async simulateDeposit(params: {
    transactionId: string;
    amount: number;
    txHash: string;
  }): Promise<{ success: boolean; data: any }> {
    const response = await this.client.post('/api/v1/simulate/deposit', params);
    return response.data;
  }

  // Payout Management
  async initiatePayout(params: {
    transactionId: string;
    channel: 'upi' | 'bank';
    destination: string;
    amount: number;
  }): Promise<PayoutResponse> {
    const response: AxiosResponse<PayoutResponse> = await this.client.post('/api/v1/payout/initiate', params);
    return response.data;
  }

  // Webhook Testing
  async testWebhook(payload: any, signature: string, timestamp: string, event: string): Promise<WebhookTestResponse> {
    const response: AxiosResponse<WebhookTestResponse> = await this.client.post('/api/v1/webhook-test', payload, {
      headers: {
        'X-SPY-Signature': signature,
        'X-SPY-Timestamp': timestamp,
        'X-SPY-Event': event
      }
    });
    return response.data;
  }

  // Analytics
  async getAnalytics(): Promise<AnalyticsResponse> {
    const response: AxiosResponse<AnalyticsResponse> = await this.client.get('/api/v1/analytics/dashboard');
    return response.data;
  }

  // Utility methods
  generateWebhookSignature(payload: string, secret: string): string {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateWebhookSignature(payload, secret);
    return signature.replace('sha256=', '') === expectedSignature;
  }
}

// Complete flow example
export async function completeOffRampFlow(
  apiKey: string,
  callbackUrl: string,
  userId: string,
  amountUsd: number,
  asset: 'USDC' | 'USDT' = 'USDC',
  network: 'polygon' | 'ethereum' | 'bsc' | 'solana' = 'polygon'
) {
  const stablepay = new StablePay(apiKey);
  
  try {
    // 1. Create session
    console.log('Creating session...');
    const session = await stablepay.createSession(callbackUrl);
    console.log('Session created:', session.data.sessionId);
    
    // 2. Get quote
    console.log('Getting quote...');
    const quote = await stablepay.getQuote({
      sessionId: session.data.sessionId,
      asset,
      network,
      amountUsd
    });
    console.log('Quote received:', quote.data.quoteId);
    console.log('Net INR:', quote.data.breakdown.netInr);
    
    // 3. Create KYC session
    console.log('Creating KYC session...');
    const kyc = await stablepay.createKycSession({
      sessionId: session.data.sessionId,
      userId,
      documentType: 'aadhaar',
      documentNumber: '123456789012', // This would be user input
      holderName: 'John Doe' // This would be user input
    });
    console.log('KYC session created:', kyc.data.kycSessionId);
    
    // 4. Generate Aadhaar OTP (this would be user-triggered)
    console.log('Generating Aadhaar OTP...');
    const otpResponse = await stablepay.generateAadhaarOtp({
      sessionId: kyc.data.kycSessionId,
      aadhaarNumber: '123456789012'
    });
    console.log('OTP sent to:', otpResponse.data.maskedMobile);
    
    // 5. Verify Aadhaar (this would be user-triggered with OTP input)
    console.log('Verifying Aadhaar...');
    const verification = await stablepay.verifyAadhaar({
      sessionId: kyc.data.kycSessionId,
      aadhaarNumber: '123456789012',
      name: 'John Doe',
      otp: '123456' // This would be user input
    });
    console.log('Aadhaar verified:', verification.data.verified);
    
    // 6. Create transaction
    console.log('Creating transaction...');
    const transaction = await stablepay.createTransaction({
      sessionId: session.data.sessionId,
      quoteId: quote.data.quoteId,
      kycSessionId: kyc.data.kycSessionId,
      asset,
      network
    });
    console.log('Transaction created:', transaction.data.transactionId);
    console.log('Deposit address:', transaction.data.depositAddress.address);
    
    // 7. Monitor transaction status
    console.log('Monitoring transaction status...');
    const status = await stablepay.getTransactionStatus(transaction.data.transactionId);
    console.log('Transaction status:', status.data.status);
    
    // 8. Simulate deposit (for testing)
    console.log('Simulating deposit...');
    const depositSimulation = await stablepay.simulateDeposit({
      transactionId: transaction.data.transactionId,
      amount: amountUsd,
      txHash: '0x' + Math.random().toString(36).substring(2, 15)
    });
    console.log('Deposit simulated:', depositSimulation.data.event);
    
    // 9. Initiate payout
    console.log('Initiating payout...');
    const payout = await stablepay.initiatePayout({
      transactionId: transaction.data.transactionId,
      channel: 'upi',
      destination: 'john.doe@okaxis',
      amount: quote.data.breakdown.netInr
    });
    console.log('Payout initiated:', payout.data.payoutId);
    console.log('UTR:', payout.data.utr);
    
    return {
      sessionId: session.data.sessionId,
      transactionId: transaction.data.transactionId,
      depositAddress: transaction.data.depositAddress.address,
      netInr: quote.data.breakdown.netInr,
      utr: payout.data.utr
    };
    
  } catch (error) {
    console.error('Off-ramp flow failed:', error);
    throw error;
  }
}

// Export default
export default StablePay; 