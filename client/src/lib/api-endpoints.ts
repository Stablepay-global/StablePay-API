export interface ApiEndpoint {
  id: string;
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  category: string;
  requiresAuth?: boolean;
  requestBody?: Record<string, any>;
  pathParams?: Record<string, string | undefined>;
  queryParams?: Record<string, string | undefined>;
  responseExample: Record<string, any>;
}

export const API_ENDPOINTS = [
  // Health & Status
  {
    id: 'health-check',
    name: 'Health Check',
    description: 'Check the health status of the StablePay API server and connected services',
    method: 'GET' as const,
    url: '/api/health',
    category: 'Health & Status',
    requiresAuth: false,
    responseExample: {
      status: 'healthy',
      timestamp: '2024-01-01T10:00:00Z',
      services: {
        database: 'connected',
        cache: 'connected'
      }
    }
  },
  {
    id: 'api-status',
    name: 'API Status',
    description: 'Get detailed API status including service health and configuration',
    method: 'GET' as const,
    url: '/api/status',
    category: 'Health & Status',
    requiresAuth: false,
    responseExample: {
      environment: 'production',
      status: 'operational',
      version: '1.0.0',
      uptime: 86400
    }
  },

  // Partner Management
  {
    id: 'create-partner',
    name: 'Create Partner',
    description: 'Create a new partner account and get API credentials',
    method: 'POST' as const,
    url: '/api/v1/partner/create',
    category: 'Partner Management',
    requiresAuth: false,
    requestBody: {
      name: 'Test Partner',
              email: 'test@stablepay.global',
      webhookUrl: 'https://webhook.site/test',
      callbackUrl: 'https://partner-app.com/callback'
    },
    responseExample: {
      success: true,
      partner_id: 'partner_123456789',
      api_key: 'stp_live_xyz123',
      message: 'Partner created successfully'
    }
  },
  {
    id: 'get-partner-details',
    name: 'Get Partner Details',
    description: 'Get partner account details and statistics',
    method: 'GET' as const,
    url: '/api/v1/partner/details',
    category: 'Partner Management',
    requiresAuth: true,
    responseExample: {
      success: true,
      partner: {
        partner_id: 'partner_123456789',
        name: 'Test Partner',
        email: 'test@stablepay.global',
        status: 'active'
      }
    }
  },
  {
    id: 'update-partner',
    name: 'Update Partner',
    description: 'Update partner configuration and webhook URLs',
    method: 'PUT' as const,
    url: '/api/v1/partner/update',
    category: 'Partner Management',
    requiresAuth: true,
    requestBody: {
      webhookUrl: 'https://new-webhook.site/test',
      callbackUrl: 'https://new-partner-app.com/callback'
    },
    responseExample: {
      success: true,
      message: 'Partner updated successfully'
    }
  },

  // Session Management
  {
    id: 'create-session',
    name: 'Create Session',
    description: 'Create a new session for off-ramping flow',
    method: 'POST' as const,
    url: '/api/v1/session/create',
    category: 'Session Management',
    requiresAuth: true,
    requestBody: {
      callbackUrl: 'https://webhook.site/test',
      metadata: {
        source: 'partner-app',
        userId: 'user_123'
      }
    },
    responseExample: {
      success: true,
      session_id: 'session_123456789',
      status: 'created',
      expires_at: '2024-01-01T12:00:00Z'
    }
  },
  {
    id: 'get-session-status',
    name: 'Get Session Status',
    description: 'Get session details and current status',
    method: 'GET' as const,
    url: '/api/v1/session/{sessionId}',
    category: 'Session Management',
    requiresAuth: true,
    pathParams: {
      sessionId: 'session_123456789'
    },
    responseExample: {
      success: true,
      session: {
        session_id: 'session_123456789',
        status: 'active',
        created_at: '2024-01-01T10:00:00Z'
      }
    }
  },
  {
    id: 'validate-session-token',
    name: 'Validate Session Token',
    description: 'Validate a session token and get session details',
    method: 'POST' as const,
    url: '/api/v1/session/validate',
    category: 'Session Management',
    requiresAuth: false,
    requestBody: {
      token: 'session_token_123456789'
    },
    responseExample: {
      success: true,
      valid: true,
      session_id: 'session_123456789'
    }
  },

  // Quote Engine
  {
    id: 'get-supported-assets',
    name: 'Get Supported Assets',
    description: 'Get list of supported cryptocurrencies (USDC, USDT) and networks (Ethereum, Polygon, BSC, Base, Avalanche, Tron, Solana) with detailed descriptions, contract addresses, and limits.',
    method: 'GET' as const,
    url: '/api/v1/quote-engine/supported-assets',
    category: 'Quote Engine',
    requiresAuth: true,
    responseExample: {
      success: true,
      data: {
        assets: [
          {
            symbol: 'USDC',
            name: 'USD Coin',
            type: 'stablecoin',
            decimals: 6,
            networks: [
              {
                name: 'Ethereum',
                chainId: 1,
                contractAddress: '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8',
                minAmount: 10,
                maxAmount: 100000,
                gasLimit: 21000,
                confirmations: 12
              }
            ]
          }
        ],
        networks: [
          {
            name: 'Ethereum',
            chainId: 1,
            nativeToken: 'ETH',
            blockTime: '12-15 seconds',
            transactionSpeed: '15-30 TPS',
            gasModel: 'EIP-1559'
          }
        ],
        limits: {
          minTransactionAmount: 10,
          maxTransactionAmount: 100000,
          quoteExpiryMinutes: 15,
          supportedCurrencies: ['USD', 'INR']
        }
      }
    }
  },
  {
    id: 'get-quote',
    name: 'Get Quote',
    description: 'Get a quote for converting crypto to INR with fee breakdown. Supports USDC/USDT on Ethereum, Polygon, BSC, Base, Avalanche, Tron, and Solana networks.',
    method: 'GET' as const,
    url: '/api/v1/quotes',
    category: 'Quote Engine',
    requiresAuth: true,
    queryParams: {
      sessionId: 'session_123456789',
      asset: 'USDC',
      network: 'polygon',
      amountUsd: '100'
    },
    responseExample: {
      success: true,
      data: {
        sessionId: 'session_123456789',
        quoteId: 'quote_123456789',
        asset: {
          symbol: 'USDC',
          name: 'USD Coin'
        },
        network: {
          name: 'polygon',
          chainId: 137
        },
        amountUsd: 100,
        fxRate: 83.0,
        grossInr: 8300,
        breakdown: {
          tds: 83,
          platformFee: 58.1,
          gst: 10.46,
          gasFeeUsd: 0.5,
          netInr: 8148.44
        },
        depositAddress: {
          network: 'polygon',
          address: '0x742d35Cc6634C0532925a3b8D6Ac6E7CD3E4AE9F',
          minConfirmations: 256
        },
        expiresAt: '2024-01-01T12:15:00Z',
        status: 'active'
      }
    }
  },

  // KYC Verification
  {
    id: 'create-kyc-session',
    name: 'Create KYC Session',
    description: 'Create a new KYC verification session',
    method: 'POST' as const,
    url: '/api/v1/kyc/session/create',
    category: 'KYC Verification',
    requiresAuth: true,
    requestBody: {
      userId: 'user_123',
      documentType: 'aadhaar',
      documentNumber: '123456789012',
      holderName: 'Test User'
    },
    responseExample: {
      success: true,
      sessionId: 'kyc_session_123456789',
      status: 'created'
    }
  },
  {
    id: 'generate-aadhaar-otp',
    name: 'Generate Aadhaar OTP',
    description: 'Generate OTP for Aadhaar verification',
    method: 'POST' as const,
    url: '/api/v1/kyc/aadhaar/generate-otp',
    category: 'KYC Verification',
    requiresAuth: true,
    requestBody: {
      sessionId: 'kyc_session_123456789',
      aadhaarNumber: '330259727443'
    },
    responseExample: {
      success: true,
      ref_id: 'cf_123456789',
      message: 'OTP sent successfully'
    }
  },
  {
    id: 'verify-aadhaar',
    name: 'Verify Aadhaar',
    description: 'Verify Aadhaar with OTP',
    method: 'POST' as const,
    url: '/api/v1/kyc/aadhaar/verify',
    category: 'KYC Verification',
    requiresAuth: true,
    requestBody: {
      ref_id: 'cf_123456789',
      otp: '123456',
      aadhaar_number: '330259727443'
    },
    responseExample: {
      success: true,
      status: 'verified',
      data: {
        name: 'Test User',
        aadhaar: 'XXXX-XXXX-1234',
        dateOfBirth: '1990-01-01'
      }
    }
  },
  {
    id: 'verify-pan',
    name: 'Verify PAN',
    description: 'Verify PAN in a single step (stateless)',
    method: 'POST' as const,
    url: '/api/v1/kyc/pan/verify',
    category: 'KYC Verification',
    requiresAuth: true,
    requestBody: {
      pan: 'ABCDE1234F',
      name: 'Test User'
    },
    responseExample: {
      success: true,
      status: 'verified',
      data: {
        pan: 'ABCDE1234F',
        name: 'Test User',
        category: 'Individual',
        pan_status: 'valid'
      }
    }
  },
  {
    id: 'verify-upi',
    name: 'Verify UPI',
    description: 'Verify UPI ID details',
    method: 'POST' as const,
    url: '/api/v1/kyc/upi/verify',
    category: 'KYC Verification',
    requiresAuth: true,
    requestBody: {
      sessionId: 'kyc_session_123456789',
      vpa: '9925028999@upi',
      name: 'Test User'
    },
    responseExample: {
      success: true,
      data: {
        upiId: '9925028999@upi',
        name: 'Test User',
        pspName: 'Paytm',
        accountStatus: 'Active',
        verified: true
      }
    }
  },
  {
    id: 'verify-bank',
    name: 'Verify Bank Account',
    description: 'Verify bank account details',
    method: 'POST' as const,
    url: '/api/v1/kyc/bank/verify',
    category: 'KYC Verification',
    requiresAuth: true,
    requestBody: {
      account_number: '919925028999',
      ifsc: 'PYTM0123456',
      name: 'Yashkumar Purohit'
    },
    responseExample: {
      success: true,
      status: 'verified',
      data: {
        account_number: '919925028999',
        ifsc: 'PYTM0123456',
        name: 'Yashkumar Purohit',
        bank_name: 'Paytm Payments Bank',
        account_status: 'Active'
      }
    }
  },
  {
    id: 'verify-face-liveness',
    name: 'Verify Face Liveness',
    description: 'Verify user face liveness using a selfie image and action (e.g., blink)',
    method: 'POST' as const,
    url: '/api/v1/kyc/face-liveness/verify',
    category: 'KYC Verification',
    requiresAuth: true,
    requestBody: {
      image: 'base64_encoded_image',
      action: 'blink'
    },
    responseExample: {
      success: true,
      status: 'verified',
      data: {
        livenessScore: 0.98,
        qualityScore: 0.95,
        faceMatch: true,
        actionVerified: true
      }
    }
  },
  {
    id: 'verify-name-match',
    name: 'Verify Name Match',
    description: 'Verify if two names match',
    method: 'POST' as const,
    url: '/api/v1/kyc/name-match/verify',
    category: 'KYC Verification',
    requiresAuth: true,
    requestBody: {
      name1: 'Test User',
      name2: 'Actual User Name'
    },
    responseExample: {
      success: true,
      status: 'verified',
      data: {
        name1: 'Test User',
        name2: 'Actual User Name',
        match: true
      }
    }
  },
  {
    id: 'get-kyc-status',
    name: 'Get KYC Status',
    description: 'Get KYC session status and verification details',
    method: 'GET' as const,
    url: '/api/v1/kyc/session/{kycSessionId}',
    category: 'KYC Verification',
    requiresAuth: true,
    pathParams: {
      kycSessionId: 'kyc_session_123456789'
    },
    responseExample: {
      success: true,
      kyc_session: {
        session_id: 'kyc_session_123456789',
        status: 'completed',
        verifications: [
          {
            type: 'aadhaar',
            status: 'verified',
            verified_at: '2024-01-01T11:00:00Z'
          }
        ]
      }
    }
  },

  // Transaction Management
  {
    id: 'create-transaction',
    name: 'Create Transaction',
    description: 'Create a new off-ramping transaction',
    method: 'POST' as const,
    url: '/api/v1/transaction/create',
    category: 'Transaction Management',
    requiresAuth: true,
    requestBody: {
      sessionId: 'session_123456789',
      quoteId: 'quote_123456789',
      kycSessionId: 'kyc_session_123456789',
      asset: 'USDC',
      network: 'polygon'
    },
    responseExample: {
      success: true,
      transaction_id: 'txn_123456789',
      status: 'pending',
      deposit_address: '0x1234567890abcdef'
    }
  },
  {
    id: 'get-transaction-status',
    name: 'Get Transaction Status',
    description: 'Get transaction details and current status',
    method: 'GET' as const,
    url: '/api/v1/transaction/{transactionId}',
    category: 'Transaction Management',
    requiresAuth: true,
    pathParams: {
      transactionId: 'txn_123456789'
    },
    responseExample: {
      success: true,
      transaction: {
        transaction_id: 'txn_123456789',
        status: 'completed',
        amount_usd: 100,
        amount_inr: 8300,
        created_at: '2024-01-01T10:00:00Z'
      }
    }
  },
  {
    id: 'list-transactions',
    name: 'List Transactions',
    description: 'List all transactions for the partner',
    method: 'GET' as const,
    url: '/api/v1/transaction/list',
    category: 'Transaction Management',
    requiresAuth: true,
    queryParams: {
      limit: '10',
      offset: '0',
      status: 'all'
    },
    responseExample: {
      success: true,
      transactions: [
        {
          transaction_id: 'txn_123456789',
          status: 'completed',
          amount_usd: 100,
          amount_inr: 8300
        }
      ],
      pagination: {
        limit: 10,
        offset: 0,
        total: 1
      }
    }
  },
  {
    id: 'cancel-transaction',
    name: 'Cancel Transaction',
    description: 'Cancel a transaction',
    method: 'POST' as const,
    url: '/api/v1/transaction/{transactionId}/cancel',
    category: 'Transaction Management',
    requiresAuth: true,
    pathParams: {
      transactionId: 'txn_123456789'
    },
    requestBody: {
      reason: 'User cancelled'
    },
    responseExample: {
      success: true,
      message: 'Transaction cancelled successfully'
    }
  },
  {
    id: 'get-deposit-status',
    name: 'Get Deposit Status',
    description: 'Get deposit status and confirmation details',
    method: 'GET' as const,
    url: '/api/v1/transaction/{transactionId}/deposit',
    category: 'Transaction Management',
    requiresAuth: true,
    pathParams: {
      transactionId: 'txn_123456789'
    },
    responseExample: {
      success: true,
      deposit: {
        status: 'confirmed',
        amount: '100',
        asset: 'USDC',
        network: 'polygon',
        tx_hash: '0x1234567890abcdef'
      }
    }
  },

  // Payout Engine
  {
    id: 'initiate-payout',
    name: 'Initiate Payout',
    description: 'Initiate INR payout to user\'s UPI ID or bank account',
    method: 'POST' as const,
    url: '/api/v1/payout/initiate',
    category: 'Payout Engine',
    requiresAuth: true,
    requestBody: {
      transactionId: 'txn_123456789',
      channel: 'upi',
      destination: 'test@okaxis',
      amount: 8000
    },
    responseExample: {
      success: true,
      payout_id: 'payout_123456789',
      status: 'pending',
      utr_number: 'UTR123456789'
    }
  },
  {
    id: 'get-payout-status',
    name: 'Get Payout Status',
    description: 'Get payout status and UTR details',
    method: 'GET' as const,
    url: '/api/v1/payout/{payoutId}',
    category: 'Payout Engine',
    requiresAuth: true,
    pathParams: {
      payoutId: 'payout_123456789'
    },
    responseExample: {
      success: true,
      payout: {
        payout_id: 'payout_123456789',
        status: 'completed',
        amount: 8000,
        utr_number: 'UTR123456789',
        completed_at: '2024-01-01T11:00:00Z'
      }
    }
  },
  {
    id: 'list-payouts',
    name: 'List Payouts',
    description: 'List all payouts for the partner',
    method: 'GET' as const,
    url: '/api/v1/payout/list',
    category: 'Payout Engine',
    requiresAuth: true,
    queryParams: {
      limit: '10',
      offset: '0'
    },
    responseExample: {
      success: true,
      payouts: [
        {
          payout_id: 'payout_123456789',
          status: 'completed',
          amount: 8000,
          utr_number: 'UTR123456789'
        }
      ],
      pagination: {
        limit: 10,
        offset: 0,
        total: 1
      }
    }
  },

  // Webhooks
  {
    id: 'test-webhook',
    name: 'Test Webhook',
    description: 'Test webhook signature verification',
    method: 'POST' as const,
    url: '/api/v1/webhook-test',
    category: 'Webhooks',
    requiresAuth: false,
    requestBody: {
      test: 'payload'
    },
    responseExample: {
      success: true,
      message: 'Webhook signature verified successfully'
    }
  },
  {
    id: 'get-webhook-events',
    name: 'Get Webhook Events',
    description: 'Get webhook event history',
    method: 'GET' as const,
    url: '/api/v1/webhook/events',
    category: 'Webhooks',
    requiresAuth: true,
    queryParams: {
      limit: '10',
      offset: '0'
    },
    responseExample: {
      success: true,
      events: [
        {
          event_id: 'evt_123456789',
          type: 'transaction.completed',
          timestamp: '2024-01-01T10:00:00Z',
          status: 'delivered'
        }
      ],
      pagination: {
        limit: 10,
        offset: 0,
        total: 1
      }
    }
  },

  // Analytics
  {
    id: 'dashboard-analytics',
    name: 'Dashboard Analytics',
    description: 'Get dashboard analytics and business metrics',
    method: 'GET' as const,
    url: '/api/v1/analytics/dashboard',
    category: 'Analytics',
    requiresAuth: true,
    responseExample: {
      success: true,
      dashboard: {
        total_transactions: 1000,
        total_volume_usd: 50000,
        total_volume_inr: 4150000,
        success_rate: 95.5
      }
    }
  },
  {
    id: 'transaction-analytics',
    name: 'Transaction Analytics',
    description: 'Get transaction analytics for the specified period',
    method: 'GET' as const,
    url: '/api/v1/analytics/transactions',
    category: 'Analytics',
    requiresAuth: true,
    queryParams: {
      period: '7d'
    },
    responseExample: {
      success: true,
      analytics: {
        period: '7d',
        transactions: 150,
        volume_usd: 7500,
        volume_inr: 622500,
        average_transaction: 50
      }
    }
  },
  {
    id: 'revenue-analytics',
    name: 'Revenue Analytics',
    description: 'Get revenue analytics and fee breakdown',
    method: 'GET' as const,
    url: '/api/v1/analytics/revenue',
    category: 'Analytics',
    requiresAuth: true,
    queryParams: {
      period: '30d'
    },
    responseExample: {
      success: true,
      revenue: {
        period: '30d',
        total_fees: 2500,
        total_revenue: 5000,
        fee_breakdown: {
          transaction_fees: 2000,
          processing_fees: 500
        }
      }
    }
  },

  // Compliance
  {
    id: 'get-compliance-report',
    name: 'Get Compliance Report',
    description: 'Get compliance report for FIU-IND reporting',
    method: 'GET' as const,
    url: '/api/v1/compliance/report',
    category: 'Compliance',
    requiresAuth: true,
    queryParams: {
      period: 'monthly'
    },
    responseExample: {
      success: true,
      report: {
        period: 'monthly',
        total_transactions: 1000,
        total_volume: 50000,
        suspicious_transactions: 0,
        report_url: 'https://reports.stablepay.global/compliance/monthly.pdf'
      }
    }
  },
  {
    id: 'get-audit-logs',
    name: 'Get Audit Logs',
    description: 'Get audit logs for compliance tracking',
    method: 'GET' as const,
    url: '/api/v1/compliance/audit',
    category: 'Compliance',
    requiresAuth: true,
    queryParams: {
      limit: '50',
      offset: '0'
    },
    responseExample: {
      success: true,
      audit_logs: [
        {
          log_id: 'log_123456789',
          action: 'transaction.created',
          user_id: 'user_123',
          timestamp: '2024-01-01T10:00:00Z',
          ip_address: '192.168.1.1'
        }
      ],
      pagination: {
        limit: 50,
        offset: 0,
        total: 1
      }
    }
  }
];

export const getEndpointsByCategory = () => {
  const categories: Record<string, ApiEndpoint[]> = {};
  API_ENDPOINTS.forEach(endpoint => {
    if (!categories[endpoint.category]) {
      categories[endpoint.category] = [];
    }
    categories[endpoint.category].push(endpoint);
  });
  return categories;
};

export const getEndpointById = (id: string): ApiEndpoint | undefined => {
  return API_ENDPOINTS.find(endpoint => endpoint.id === id);
}; 