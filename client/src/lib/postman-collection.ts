export function generatePostmanCollection(environment: "production" = "production") {
  return {
    info: {
      name: "StablePay API - Production",
      description: "Complete API collection for StablePay off-ramping platform. Includes partner management, sessions, quotes, KYC verification, transactions, payouts, webhooks, and analytics.",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: [
      {
        name: "Health & Status",
        item: [
          {
            name: "Health Check",
            request: {
              method: "GET",
              header: [],
              url: {
                raw: "{{baseUrl}}/api/health",
                host: ["{{baseUrl}}"],
                path: ["api", "health"]
              },
              description: "Check the health status of the StablePay API server and connected services."
            }
          },
          {
            name: "API Status",
            request: {
              method: "GET",
              header: [],
              url: {
                raw: "{{baseUrl}}/api/status",
                host: ["{{baseUrl}}"],
                path: ["api", "status"]
              },
              description: "Get detailed API status including service health and configuration."
            }
          }
        ],
        description: "Health and status endpoints for monitoring the API server."
      },
      {
        name: "Partner Management",
        item: [
          {
            name: "Create Partner",
            request: {
              method: "POST",
              header: [{ key: "Content-Type", value: "application/json" }],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  name: "Test Partner",
                  email: "test@stablepay.global",
                  webhookUrl: "https://webhook.site/test",
                  callbackUrl: "https://partner-app.com/callback"
                }, null, 2)
              },
              url: {
                raw: "{{baseUrl}}/api/v1/partner/create",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "partner", "create"]
              },
              description: "Create a new partner account and get API credentials."
            }
          },
          {
            name: "Get Partner Details",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{apiKey}}" }],
              url: {
                raw: "{{baseUrl}}/api/v1/partner/details",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "partner", "details"]
              },
              description: "Get partner account details and statistics."
            }
          },
          {
            name: "Update Partner",
            request: {
              method: "PUT",
              header: [
                { key: "Content-Type", value: "application/json" },
                { key: "Authorization", value: "Bearer {{apiKey}}" }
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  webhookUrl: "https://new-webhook.site/test",
                  callbackUrl: "https://new-partner-app.com/callback"
                }, null, 2)
              },
              url: {
                raw: "{{baseUrl}}/api/v1/partner/update",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "partner", "update"]
              },
              description: "Update partner configuration and webhook URLs."
            }
          }
        ],
        description: "Partner account management endpoints."
      },
      {
        name: "Session Management",
        item: [
          {
            name: "Create Session",
            request: {
              method: "POST",
              header: [
                { key: "Content-Type", value: "application/json" },
                { key: "Authorization", value: "Bearer {{apiKey}}" }
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  callbackUrl: "https://webhook.site/test",
                  metadata: {
                    source: "partner-app",
                    userId: "user_123"
                  }
                }, null, 2)
              },
              url: {
                raw: "{{baseUrl}}/api/v1/session/create",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "session", "create"]
              },
              description: "Create a new session for off-ramping flow."
            }
          },
          {
            name: "Get Session Status",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{apiKey}}" }],
              url: {
                raw: "{{baseUrl}}/api/v1/session/{{sessionId}}",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "session", "{{sessionId}}"]
              },
              description: "Get session details and current status."
            }
          },
          {
            name: "Validate Session Token",
            request: {
              method: "POST",
              header: [{ key: "Content-Type", value: "application/json" }],
              body: {
                mode: "raw",
                raw: JSON.stringify({ token: "{{sessionToken}}" }, null, 2)
              },
              url: {
                raw: "{{baseUrl}}/api/v1/session/validate",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "session", "validate"]
              },
              description: "Validate a session token and get session details."
            }
          }
        ],
        description: "Session management for off-ramping flows."
      },
      {
        name: "Quote Engine",
        item: [
          {
            name: "Get Quote",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{apiKey}}" }],
              url: {
                raw: "{{baseUrl}}/api/v1/quotes?sessionId={{sessionId}}&asset=USDC&network=polygon&amountUsd=100",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "quotes"],
                query: [
                  { key: "sessionId", value: "{{sessionId}}" },
                  { key: "asset", value: "USDC" },
                  { key: "network", value: "polygon" },
                  { key: "amountUsd", value: "100" }
                ]
              },
              description: "Get a quote for converting crypto to INR with fee breakdown."
            }
          },
          {
            name: "Get Quote (USDT)",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{apiKey}}" }],
              url: {
                raw: "{{baseUrl}}/api/v1/quotes?sessionId={{sessionId}}&asset=USDT&network=polygon&amountUsd=50",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "quotes"],
                query: [
                  { key: "sessionId", value: "{{sessionId}}" },
                  { key: "asset", value: "USDT" },
                  { key: "network", value: "polygon" },
                  { key: "amountUsd", value: "50" }
                ]
              },
              description: "Get a quote for USDT conversion."
            }
          },
          {
            name: "Get Quote (Ethereum)",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{apiKey}}" }],
              url: {
                raw: "{{baseUrl}}/api/v1/quotes?sessionId={{sessionId}}&asset=USDC&network=ethereum&amountUsd=200",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "quotes"],
                query: [
                  { key: "sessionId", value: "{{sessionId}}" },
                  { key: "asset", value: "USDC" },
                  { key: "network", value: "ethereum" },
                  { key: "amountUsd", value: "200" }
                ]
              },
              description: "Get a quote for Ethereum network conversion."
            }
          }
        ],
        description: "Quote generation for crypto-to-INR conversion."
      },
      {
        name: "KYC Verification",
        item: [
          {
            name: "Create KYC Session",
            request: {
              method: "POST",
              header: [
                { key: "Content-Type", value: "application/json" },
                { key: "Authorization", value: "Bearer {{apiKey}}" }
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  sessionId: "{{sessionId}}",
                  userId: "user_123",
                  documentType: "aadhaar",
                  documentNumber: "123456789012",
                  holderName: "Test User"
                }, null, 2)
              },
              url: {
                raw: "{{baseUrl}}/api/v1/kyc/session/create",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "kyc", "session", "create"]
              },
              description: "Create a new KYC verification session."
            }
          },
          {
            name: "Generate Aadhaar OTP",
            request: {
              method: "POST",
              header: [
                { key: "Content-Type", value: "application/json" },
                { key: "Authorization", value: "Bearer {{apiKey}}" }
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  sessionId: "{{kycSessionId}}",
                  aadhaarNumber: "123456789012"
                }, null, 2)
              },
              url: {
                raw: "{{baseUrl}}/api/v1/kyc/aadhaar/generate-otp",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "kyc", "aadhaar", "generate-otp"]
              },
              description: "Generate OTP for Aadhaar verification."
            }
          },
          {
            name: "Verify Aadhaar",
            request: {
              method: "POST",
              header: [
                { key: "Content-Type", value: "application/json" },
                { key: "Authorization", value: "Bearer {{apiKey}}" }
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  sessionId: "{{kycSessionId}}",
                  aadhaarNumber: "123456789012",
                  name: "Test User",
                  otp: "123456"
                }, null, 2)
              },
              url: {
                raw: "{{baseUrl}}/api/v1/kyc/aadhaar/verify",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "kyc", "aadhaar", "verify"]
              },
              description: "Verify Aadhaar with OTP."
            }
          },
          {
            name: "Verify PAN",
            request: {
              method: "POST",
              header: [
                { key: "Content-Type", value: "application/json" },
                { key: "Authorization", value: "Bearer {{apiKey}}" }
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  sessionId: "{{kycSessionId}}",
                  panNumber: "ABCDE1234F",
                  name: "Test User"
                }, null, 2)
              },
              url: {
                raw: "{{baseUrl}}/api/v1/kyc/pan/verify",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "kyc", "pan", "verify"]
              },
              description: "Verify PAN card details."
            }
          },
          {
            name: "Verify UPI",
            request: {
              method: "POST",
              header: [
                { key: "Content-Type", value: "application/json" },
                { key: "Authorization", value: "Bearer {{apiKey}}" }
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  sessionId: "{{kycSessionId}}",
                  upiId: "9925028999@upi",
                  name: "Test User"
                }, null, 2)
              },
              url: {
                raw: "{{baseUrl}}/api/v1/kyc/upi/verify",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "kyc", "upi", "verify"]
              },
              description: "Verify UPI ID details."
            }
          },
          {
            name: "Verify Bank Account",
            request: {
              method: "POST",
              header: [
                { key: "Content-Type", value: "application/json" },
                { key: "Authorization", value: "Bearer {{apiKey}}" }
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  sessionId: "{{kycSessionId}}",
                  accountNumber: "1234567890",
                  ifsc: "SBIN0001234",
                  name: "Test User"
                }, null, 2)
              },
              url: {
                raw: "{{baseUrl}}/api/v1/kyc/bank/verify",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "kyc", "bank", "verify"]
              },
              description: "Verify bank account details."
            }
          },
          {
            name: "Get KYC Status",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{apiKey}}" }],
              url: {
                raw: "{{baseUrl}}/api/v1/kyc/session/{{kycSessionId}}",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "kyc", "session", "{{kycSessionId}}"]
              },
              description: "Get KYC session status and verification details."
            }
          }
        ],
        description: "KYC verification endpoints for identity and bank account verification."
      },
      {
        name: "Transaction Management",
        item: [
          {
            name: "Create Transaction",
            request: {
              method: "POST",
              header: [
                { key: "Content-Type", value: "application/json" },
                { key: "Authorization", value: "Bearer {{apiKey}}" }
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  sessionId: "{{sessionId}}",
                  quoteId: "{{quoteId}}",
                  kycSessionId: "{{kycSessionId}}",
                  asset: "USDC",
                  network: "polygon"
                }, null, 2)
              },
              url: {
                raw: "{{baseUrl}}/api/v1/transaction/create",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "transaction", "create"]
              },
              description: "Create a new off-ramping transaction."
            }
          },
          {
            name: "Get Transaction Status",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{apiKey}}" }],
              url: {
                raw: "{{baseUrl}}/api/v1/transaction/{{transactionId}}",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "transaction", "{{transactionId}}"]
              },
              description: "Get transaction details and current status."
            }
          },
          {
            name: "List Transactions",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{apiKey}}" }],
              url: {
                raw: "{{baseUrl}}/api/v1/transaction/list?limit=10&offset=0&status=all",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "transaction", "list"],
                query: [
                  { key: "limit", value: "10" },
                  { key: "offset", value: "0" },
                  { key: "status", value: "all" }
                ]
              },
              description: "List all transactions for the partner."
            }
          },
          {
            name: "Cancel Transaction",
            request: {
              method: "POST",
              header: [
                { key: "Content-Type", value: "application/json" },
                { key: "Authorization", value: "Bearer {{apiKey}}" }
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({ reason: "User cancelled" }, null, 2)
              },
              url: {
                raw: "{{baseUrl}}/api/v1/transaction/{{transactionId}}/cancel",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "transaction", "{{transactionId}}", "cancel"]
              },
              description: "Cancel a pending transaction."
            }
          }
        ],
        description: "Transaction management for off-ramping flows."
      },
      {
        name: "Deposit Detection",
        item: [
          {
            name: "Simulate Deposit",
            request: {
              method: "POST",
              header: [
                { key: "Content-Type", value: "application/json" },
                { key: "Authorization", value: "Bearer {{apiKey}}" }
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  transactionId: "{{transactionId}}",
                  amount: 100,
                  txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
                }, null, 2)
              },
              url: {
                raw: "{{baseUrl}}/api/v1/simulate/deposit",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "simulate", "deposit"]
              },
              description: "Simulate a blockchain deposit for testing."
            }
          },
          {
            name: "Get Deposit Status",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{apiKey}}" }],
              url: {
                raw: "{{baseUrl}}/api/v1/transaction/{{transactionId}}/deposit",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "transaction", "{{transactionId}}", "deposit"]
              },
              description: "Get deposit status and confirmation details."
            }
          }
        ],
        description: "Deposit detection and monitoring endpoints."
      },
      {
        name: "Payout Engine",
        item: [
          {
            name: "Initiate Payout",
            request: {
              method: "POST",
              header: [
                { key: "Content-Type", value: "application/json" },
                { key: "Authorization", value: "Bearer {{apiKey}}" }
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  transactionId: "{{transactionId}}",
                  channel: "upi",
                  destination: "test@okaxis",
                  amount: 8000
                }, null, 2)
              },
              url: {
                raw: "{{baseUrl}}/api/v1/payout/initiate",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "payout", "initiate"]
              },
              description: "Initiate INR payout to user's UPI ID or bank account."
            }
          },
          {
            name: "Get Payout Status",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{apiKey}}" }],
              url: {
                raw: "{{baseUrl}}/api/v1/payout/{{payoutId}}",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "payout", "{{payoutId}}"]
              },
              description: "Get payout status and UTR details."
            }
          },
          {
            name: "List Payouts",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{apiKey}}" }],
              url: {
                raw: "{{baseUrl}}/api/v1/payout/list?limit=10&offset=0",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "payout", "list"],
                query: [
                  { key: "limit", value: "10" },
                  { key: "offset", value: "0" }
                ]
              },
              description: "List all payouts for the partner."
            }
          }
        ],
        description: "Payout processing and management endpoints."
      },
      {
        name: "Webhooks",
        item: [
          {
            name: "Test Webhook",
            request: {
              method: "POST",
              header: [
                { key: "Content-Type", value: "application/json" },
                { key: "X-SPY-Signature", value: "sha256=test" },
                { key: "X-SPY-Timestamp", value: "1234567890" },
                { key: "X-SPY-Event", value: "test" }
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({ test: "payload" }, null, 2)
              },
              url: {
                raw: "{{baseUrl}}/api/v1/webhook-test",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "webhook-test"]
              },
              description: "Test webhook signature verification."
            }
          },
          {
            name: "Get Webhook Events",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{apiKey}}" }],
              url: {
                raw: "{{baseUrl}}/api/v1/webhook/events?limit=10&offset=0",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "webhook", "events"],
                query: [
                  { key: "limit", value: "10" },
                  { key: "offset", value: "0" }
                ]
              },
              description: "Get webhook event history."
            }
          }
        ],
        description: "Webhook testing and event management."
      },
      {
        name: "Analytics",
        item: [
          {
            name: "Dashboard Analytics",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{apiKey}}" }],
              url: {
                raw: "{{baseUrl}}/api/v1/analytics/dashboard",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "analytics", "dashboard"]
              },
              description: "Get dashboard analytics and business metrics."
            }
          },
          {
            name: "Transaction Analytics",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{apiKey}}" }],
              url: {
                raw: "{{baseUrl}}/api/v1/analytics/transactions?period=7d",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "analytics", "transactions"],
                query: [{ key: "period", value: "7d" }]
              },
              description: "Get transaction analytics for the specified period."
            }
          },
          {
            name: "Revenue Analytics",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{apiKey}}" }],
              url: {
                raw: "{{baseUrl}}/api/v1/analytics/revenue?period=30d",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "analytics", "revenue"],
                query: [{ key: "period", value: "30d" }]
              },
              description: "Get revenue analytics and fee breakdown."
            }
          }
        ],
        description: "Analytics and reporting endpoints."
      },
      {
        name: "Compliance",
        item: [
          {
            name: "Get Compliance Report",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{apiKey}}" }],
              url: {
                raw: "{{baseUrl}}/api/v1/compliance/report?period=monthly",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "compliance", "report"],
                query: [{ key: "period", value: "monthly" }]
              },
              description: "Get compliance report for FIU-IND reporting."
            }
          },
          {
            name: "Get Audit Logs",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{apiKey}}" }],
              url: {
                raw: "{{baseUrl}}/api/v1/compliance/audit?limit=50&offset=0",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "compliance", "audit"],
                query: [
                  { key: "limit", value: "50" },
                  { key: "offset", value: "0" }
                ]
              },
              description: "Get audit logs for compliance tracking."
            }
          }
        ],
        description: "Compliance and audit endpoints."
      }
    ],
    variable: [
      { key: "baseUrl", value: "http://localhost:4000" },
      { key: "apiKey", value: "" },
      { key: "sessionId", value: "" },
      { key: "quoteId", value: "" },
      { key: "kycSessionId", value: "" },
      { key: "transactionId", value: "" },
      { key: "payoutId", value: "" },
      { key: "sessionToken", value: "" }
    ]
  };
}
