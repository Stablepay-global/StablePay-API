# StablePay Platform Blueprint v2.0
## Complete Stable-Coin-to-INR Off-Ramp Banking & SDK Platform for India

---

## 🏗️ **1. High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────────────────┐
│             Partner (merchant, wallet, remittance app)                 │
│  ────────────────────────────────────────────────────────────────────   │
│  • Partner-Auth (API Key)      • SDKs (JS, Kotlin, Swift, Go)          │
│  • Webhook Endpoints           • Interactive Documentation             │
└──────────────┬──────────────────────────────────────────────────────────┘
               │ REST API + HMAC-signed webhooks
┌──────────────▼──────────────────────────────────────────────────────────┐
│                    StablePay Off-Ramp Gateway                          │
│ ─────────────────────────────────────────────────────────────────────── │
│ 1  Session & Quote Engine       4  Off-Ramp Orchestrator               │
│ 2  KYC Orchestrator (Cashfree)  5  Deposit Listener (EVM + Solana)     │
│ 3  Compliance & Tax Engine      6  INR Payout Engine (Razorpay X)      │
└──────────────┬──────────────────────────────────────────────────────────┘
               │ Internal events + PostgreSQL persistence
┌──────────────▼──────────────┐     ┌──────────────▼───────────────┐
│  AML / FIU-IND log sink      │     │  Treasury & Liquidity bot    │
│  (24-hr rule, STR, CTR)      │     │  (USDC/USDT ↔ INR hedging)   │
└──────────────────────────────┘     └───────────────────────────────┘
```

---

## 🔐 **2. Authentication & Session Management**

### **Partner Onboarding** - `POST /api/v1/partner/create`

```jsonc
{
  "name": "Your Company Name",
  "email": "dev@company.com",
  "webhookUrl": "https://yourapp.com/webhooks/stablepay"
}
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "partnerId": "partner_001",
    "apiKey": "pk_live_abc123def456...",
    "webhookSecret": "whsec_xyz789...",
    "status": "active",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

### **Session Creation** - `POST /api/v1/session/create`

```jsonc
POST /api/v1/session/create
Authorization: Bearer pk_live_abc123def456...
{
  "callbackUrl": "https://partner.app/webhooks/offramp",
  "metadata": {
    "source": "mobile_app",
    "version": "1.0.0"
  }
}
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "sessionId": "sess_20250115_abc123",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2025-01-15T11:00:00Z",
    "status": "active"
  }
}
```

---

## 💰 **3. Real-Time Quote Engine** - `GET /api/v1/quotes`

### **Request Parameters**

| Parameter     | Type    | Required | Description                    |
|---------------|---------|----------|--------------------------------|
| `sessionId`   | string  | Yes      | Valid session ID               |
| `asset`       | string  | Yes      | `USDC` \| `USDT`               |
| `network`     | string  | Yes      | `ethereum` \| `polygon` \| `bsc` \| `solana` |
| `amountUsd`   | decimal | Yes      | Amount in USD (2 decimal places) |

### **Response**

```jsonc
{
  "success": true,
  "data": {
    "sessionId": "sess_20250115_abc123",
    "quoteId": "quote_20250115_def456",
    "asset": "USDC",
    "network": "polygon",
    "amountUsd": 1000.00,
    "fxRate": 83.65,
    "grossInr": 83650.00,
    "breakdown": {
      "tds": 836.50,              // 1% TDS on gross
      "platformFee": 585.55,      // 0.7% platform fee
      "gst": 105.40,              // 18% GST on platform fee
      "netInr": 82122.55
    },
    "depositAddress": {
      "network": "polygon",
      "address": "0x8e1234567890abcdef1234567890abcdef1234567",
      "minConfirmations": 12
    },
    "expiresAt": "2025-01-15T10:45:00Z",
    "status": "active"
  }
}
```

**Implementation Notes:**
- Uses RBI-authorized FX feed (Refinitiv/DCB API) with ±0.1₹ spread
- TDS (s.194Q) withheld on gross consideration
- GST 18% applies only on service fee, not crypto principal
- Deposit addresses generated per quote with 15-minute expiry

---

## 🆔 **4. KYC Verification System** - Production-Ready Cashfree Integration

The StablePay platform integrates with Cashfree's V2 API for comprehensive KYC verification. All endpoints are stateless proxy endpoints that directly communicate with Cashfree's production API.

### **KYC Session Creation** - `POST /api/v1/kyc/session/create`

**Request:**
```jsonc
POST /api/v1/kyc/session/create
Authorization: Bearer pk_live_abc123def456...
{
  "userId": "user_12345",
  "documentType": "aadhaar",
  "documentNumber": "123456789012",
  "holderName": "John Doe"
}
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "sessionId": "kyc_session_123456789",
    "userId": "user_12345",
    "documentType": "aadhaar",
    "status": "created",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

### **Aadhaar OTP Generation** - `POST /api/v1/kyc/aadhaar/generate-otp`

**Request:**
```jsonc
POST /api/v1/kyc/aadhaar/generate-otp
Authorization: Bearer pk_live_abc123def456...
{
  "aadhaar_number": "123456789012"
}
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "ref_id": "ref_123456789",
    "message": "OTP sent successfully"
  }
}
```

### **Aadhaar Verification** - `POST /api/v1/kyc/aadhaar/verify`

**Request:**
```jsonc
POST /api/v1/kyc/aadhaar/verify
Authorization: Bearer pk_live_abc123def456...
{
  "ref_id": "ref_123456789",
  "otp": "123456",
  "aadhaar_number": "123456789012"
}
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "ref_id": "ref_123456789",
    "status": "success",
    "verification_data": {
      "name": "John Doe",
      "aadhaar": "XXXX-XXXX-1234",
      "date_of_birth": "1990-01-01",
      "gender": "Male",
      "address": "123 Main St, Mumbai, MH 400001"
    }
  }
}
```

### **PAN Verification** - `POST /api/v1/kyc/pan/verify`

**Request:**
```jsonc
POST /api/v1/kyc/pan/verify
Authorization: Bearer pk_live_abc123def456...
{
  "pan": "ABCDE1234F",
  "name": "John Doe"
}
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "ref_id": "ref_123456789",
    "status": "success",
    "verification_data": {
      "pan": "ABCDE1234F",
      "name": "John Doe",
      "category": "Individual",
      "date_of_birth": "1990-01-01",
      "pan_status": "valid"
    }
  }
}
```

### **Bank Account Verification** - `POST /api/v1/kyc/bank/verify`

**Request:**
```jsonc
POST /api/v1/kyc/bank/verify
Authorization: Bearer pk_live_abc123def456...
{
  "bank_account": "1234567890",
  "ifsc": "SBIN0001234",
  "name": "John Doe"
}
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "ref_id": "ref_123456789",
    "status": "success",
    "verification_data": {
      "account_holder": "John Doe",
      "bank_name": "State Bank of India",
      "branch": "Mumbai Main",
      "account_status": "active",
      "ifsc": "SBIN0001234"
    }
  }
}
```

### **UPI Verification** - `POST /api/v1/kyc/upi/verify`

**Request:**
```jsonc
POST /api/v1/kyc/upi/verify
Authorization: Bearer pk_live_abc123def456...
{
  "upi_id": "john.doe@okaxis",
  "name": "John Doe"
}
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "ref_id": "ref_123456789",
    "status": "success",
    "verification_data": {
      "upi_id": "john.doe@okaxis",
      "account_holder": "John Doe",
      "vpa_status": "active",
      "bank_name": "Axis Bank"
    }
  }
}
```

### **Face Liveness Verification** - `POST /api/v1/kyc/face-liveness/verify`

**Request:**
```jsonc
POST /api/v1/kyc/face-liveness/verify
Authorization: Bearer pk_live_abc123def456...
{
  "image": "base64_encoded_image_data",
  "action": "blink"
}
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "ref_id": "ref_123456789",
    "status": "success",
    "verification_data": {
      "liveness_score": 0.98,
      "quality_score": 0.95,
      "face_match": true,
      "action_verified": true
    }
  }
}
```

### **Name Match Verification** - `POST /api/v1/kyc/name-match/verify`

**Request:**
```jsonc
POST /api/v1/kyc/name-match/verify
Authorization: Bearer pk_live_abc123def456...
{
  "name1": "John Doe",
  "name2": "John M. Doe"
}
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "ref_id": "ref_123456789",
    "status": "success",
    "verification_data": {
      "similarity_score": 0.85,
      "match": true,
      "confidence": "high"
    }
  }
}
```

### **KYC Session Status** - `GET /api/v1/kyc/session/{kycSessionId}`

**Request:**
```jsonc
GET /api/v1/kyc/session/kyc_session_123456789
Authorization: Bearer pk_live_abc123def456...
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "sessionId": "kyc_session_123456789",
    "userId": "user_12345",
    "status": "completed",
    "verifications": [
      {
        "type": "aadhaar",
        "status": "verified",
        "verifiedAt": "2025-01-15T10:35:00Z",
        "refId": "ref_123456789"
      },
      {
        "type": "pan",
        "status": "verified",
        "verifiedAt": "2025-01-15T10:36:00Z",
        "refId": "ref_123456790"
      }
    ],
    "createdAt": "2025-01-15T10:30:00Z",
    "completedAt": "2025-01-15T10:36:00Z"
  }
}
```

### **KYC Error Handling**

All KYC endpoints return standardized error responses:

```jsonc
{
  "success": false,
  "error": "Invalid PAN number format",
  "details": {
    "code": "INVALID_PAN",
    "message": "PAN number must be 10 characters long",
    "field": "pan"
  }
}
```

### **KYC Integration Notes**

- **Production Ready**: All endpoints use Cashfree's production API (`https://api.cashfree.com/verification`)
- **Stateless Design**: No session storage required, direct proxy to Cashfree
- **Authentication**: Uses Cashfree's RSA signature authentication
- **Rate Limiting**: Respects Cashfree's API rate limits
- **Error Handling**: Comprehensive error handling with detailed error codes
- **Compliance**: All verifications comply with RBI and FIU-IND guidelines

---

## 💸 **5. Transaction Initiation** - `POST /api/v1/transaction/create`

```jsonc
POST /api/v1/transaction/create
Authorization: Bearer pk_live_abc123def456...
{
  "sessionId": "sess_20250115_abc123",
  "quoteId": "quote_20250115_def456",
  "kycSessionId": "kyc_001",
  "asset": "USDC",
  "network": "polygon",
  "destinationAddress": "0x1234567890abcdef1234567890abcdef12345678"
}
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "transactionId": "txn_20250115_ghi789",
    "sessionId": "sess_20250115_abc123",
    "status": "pending_deposit",
    "depositAddress": {
      "network": "polygon",
      "address": "0x8e1234567890abcdef1234567890abcdef1234567",
      "minConfirmations": 12
    },
    "expectedAmount": "1000.00",
    "expiresAt": "2025-01-15T10:45:00Z",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

---

## 🔍 **6. Deposit Detection & Status Tracking**

### **Transaction Status** - `GET /api/v1/transaction/{transactionId}`

```jsonc
{
  "success": true,
  "data": {
    "transactionId": "txn_20250115_ghi789",
    "sessionId": "sess_20250115_abc123",
    "status": "deposit_confirmed",
    "kyc": {
      "status": "approved",
      "kycId": "cfkyc_d4e8f9a1b2c3"
    },
    "deposit": {
      "status": "confirmed",
      "txHash": "0xabc123def456...",
      "confirmations": 15,
      "amount": "1000.00",
      "confirmedAt": "2025-01-15T10:32:00Z"
    },
    "payout": {
      "status": "processing",
      "utr": null,
      "estimatedSettlement": "2025-01-15T10:35:00Z"
    },
    "financials": {
      "grossInr": 83650.00,
      "netInr": 82122.55,
      "fees": {
        "tds": 836.50,
        "platformFee": 585.55,
        "gst": 105.40
      }
    }
  }
}
```

### **Deposit Detection Webhook**

```jsonc
{
  "event": "deposit.detected",
  "sessionId": "sess_20250115_abc123",
  "transactionId": "txn_20250115_ghi789",
  "txHash": "0xabc123def456...",
  "amount": "1000.00",
  "confirmations": 1,
  "network": "polygon",
  "detectedAt": "2025-01-15T10:31:00Z"
}
```

---

## 💳 **7. INR Payout Engine** - `POST /api/v1/payout/initiate`

```jsonc
POST /api/v1/payout/initiate
Authorization: Bearer pk_live_abc123def456...
{
  "transactionId": "txn_20250115_ghi789",
  "channel": "upi",
  "destination": "john.doe@okaxis",
  "amount": 82122.55
}
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "payoutId": "payout_20250115_jkl012",
    "transactionId": "txn_20250115_ghi789",
    "status": "initiated",
    "channel": "upi",
    "destination": "john.doe@okaxis",
    "amount": 82122.55,
    "estimatedSettlement": "2025-01-15T10:35:00Z",
    "initiatedAt": "2025-01-15T10:33:00Z"
  }
}
```

### **Payout Settlement Webhook**

```jsonc
{
  "event": "payout.settled",
  "sessionId": "sess_20250115_abc123",
  "transactionId": "txn_20250115_ghi789",
  "payoutId": "payout_20250115_jkl012",
  "utr": "N225071234567890",
  "settledAt": "2025-01-15T10:35:00Z",
  "status": "completed"
}
```

---

## 🔒 **8. Webhook Security & Verification**

### **Webhook Signature Verification**

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### **Webhook Headers**

```jsonc
{
  "X-SPY-Signature": "sha256=abc123def456...",
  "X-SPY-Timestamp": "1642234567",
  "X-SPY-Event": "deposit.detected",
  "Content-Type": "application/json"
}
```

---

## 📱 **9. SDK Implementation**

### **TypeScript/JavaScript SDK**

```typescript
import axios, { AxiosInstance } from 'axios';

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
      }
    });
  }

  // Session Management
  async createSession(callbackUrl: string, metadata?: any) {
    const response = await this.client.post('/api/v1/session/create', {
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
  }) {
    const response = await this.client.get('/api/v1/quotes', { params });
    return response.data;
  }

  // KYC Management
  async createKycSession(params: {
    sessionId: string;
    userId: string;
    documentType: string;
    documentNumber: string;
    holderName: string;
  }) {
    const response = await this.client.post('/api/v1/kyc/session/create', params);
    return response.data;
  }

  async verifyAadhaar(params: {
    sessionId: string;
    aadhaarNumber: string;
    name: string;
    otp: string;
  }) {
    const response = await this.client.post('/api/v1/kyc/aadhaar-okyc', params);
    return response.data;
  }

  // Transaction Management
  async createTransaction(params: {
    sessionId: string;
    quoteId: string;
    kycSessionId: string;
    asset: string;
    network: string;
  }) {
    const response = await this.client.post('/api/v1/transaction/create', params);
    return response.data;
  }

  async getTransactionStatus(transactionId: string) {
    const response = await this.client.get(`/api/v1/transaction/${transactionId}`);
    return response.data;
  }

  // Payout Management
  async initiatePayout(params: {
    transactionId: string;
    channel: 'upi' | 'bank';
    destination: string;
    amount: number;
  }) {
    const response = await this.client.post('/api/v1/payout/initiate', params);
    return response.data;
  }
}

// Usage Example
const stablepay = new StablePay('pk_live_abc123def456...');

// Complete flow
async function completeOffRamp() {
  // 1. Create session
  const session = await stablepay.createSession('https://app.com/webhooks');
  
  // 2. Get quote
  const quote = await stablepay.getQuote({
    sessionId: session.data.sessionId,
    asset: 'USDC',
    network: 'polygon',
    amountUsd: 1000
  });
  
  // 3. Create KYC session
  const kyc = await stablepay.createKycSession({
    sessionId: session.data.sessionId,
    userId: 'user_123',
    documentType: 'aadhaar',
    documentNumber: '123456789012',
    holderName: 'John Doe'
  });
  
  // 4. Verify Aadhaar (after user provides OTP)
  const verification = await stablepay.verifyAadhaar({
    sessionId: kyc.data.kycSessionId,
    aadhaarNumber: '123456789012',
    name: 'John Doe',
    otp: '123456'
  });
  
  // 5. Create transaction
  const transaction = await stablepay.createTransaction({
    sessionId: session.data.sessionId,
    quoteId: quote.data.quoteId,
    kycSessionId: kyc.data.kycSessionId,
    asset: 'USDC',
    network: 'polygon'
  });
  
  // 6. Monitor status
  const status = await stablepay.getTransactionStatus(transaction.data.transactionId);
  
  // 7. Initiate payout
  const payout = await stablepay.initiatePayout({
    transactionId: transaction.data.transactionId,
    channel: 'upi',
    destination: 'john.doe@okaxis',
    amount: quote.data.data.breakdown.netInr
  });
}
```

### **Kotlin SDK (Android)**

```kotlin
class StablePay(
    private val apiKey: String,
    private val baseURL: String = "https://api.stablepay.global"
) {
    private val client = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .addHeader("Authorization", "Bearer $apiKey")
                .addHeader("Content-Type", "application/json")
                .build()
            chain.proceed(request)
        }
        .build()

    suspend fun createSession(callbackUrl: String, metadata: Map<String, Any>? = null): SessionResponse {
        val requestBody = mapOf(
            "callbackUrl" to callbackUrl,
            "metadata" to metadata
        )
        
        return client.post("$baseURL/api/v1/session/create", requestBody)
    }

    suspend fun getQuote(
        sessionId: String,
        asset: String,
        network: String,
        amountUsd: Double
    ): QuoteResponse {
        val params = mapOf(
            "sessionId" to sessionId,
            "asset" to asset,
            "network" to network,
            "amountUsd" to amountUsd.toString()
        )
        
        return client.get("$baseURL/api/v1/quotes", params)
    }

    // Additional methods for KYC, transactions, payouts...
}
```

---

## 🏛️ **10. Compliance & Regulatory Framework**

### **FIU-IND Compliance**

```typescript
// STR (Suspicious Transaction Report) Generation
interface STRData {
  transactionId: string;
  customerId: string;
  amount: number;
  source: string;
  destination: string;
  riskScore: number;
  suspiciousIndicators: string[];
  reportedAt: Date;
}

// CTR (Cash Transaction Report) for transactions > ₹10L
interface CTRData {
  transactionId: string;
  customerId: string;
  amount: number;
  transactionType: 'deposit' | 'payout';
  reportedAt: Date;
}

// 24-hour rule compliance
interface ComplianceLog {
  transactionId: string;
  cryptoAmount: number;
  fiatAmount: number;
  depositTime: Date;
  payoutTime: Date;
  timeDifference: number; // in hours
  compliant: boolean;
}
```

### **Tax Compliance Engine**

```typescript
// TDS Calculation (s.194Q)
function calculateTDS(grossAmount: number): number {
  return grossAmount * 0.01; // 1% TDS
}

// GST Calculation (18% on service fee)
function calculateGST(serviceFee: number): number {
  return serviceFee * 0.18;
}

// Form 26Q Generation
interface Form26QData {
  quarter: string;
  transactions: Array<{
    pan: string;
    amount: number;
    tdsAmount: number;
    date: Date;
  }>;
  totalTDS: number;
}
```

---

## 🔧 **11. Infrastructure & Deployment**

### **Docker Configuration**

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Security: Run as non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S stablepay -u 1001
USER stablepay

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

CMD ["npm", "start"]
```

### **Docker Compose for Development**

```yaml
version: '3.8'

services:
  stablepay-api:
    build: .
    container_name: stablepay-api-dev
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
    env_file:
      - .env.development
    volumes:
      - .:/app
      - /app/node_modules
    networks:
      - stablepay-network

  postgres:
    image: postgres:15-alpine
    container_name: stablepay-postgres
    environment:
      POSTGRES_DB: stablepay
      POSTGRES_USER: stablepay
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - stablepay-network

  redis:
    image: redis:7-alpine
    container_name: stablepay-redis
    ports:
      - "6379:6379"
    networks:
      - stablepay-network

networks:
  stablepay-network:
    driver: bridge

volumes:
  postgres-data:
```

### **Environment Configuration**

```bash
# .env.production
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@host:5432/stablepay

# Cashfree Production
CASHFREE_CLIENT_ID=your_client_id
CASHFREE_CLIENT_SECRET=your_client_secret
CASHFREE_PUBLIC_KEY=your_public_key
CASHFREE_KYC_BASE_URL=https://api.cashfree.com/verification

# Exchange Rate API
EXCHANGE_RATE_API_KEY=your_api_key

# Webhook Secrets
WEBHOOK_SECRET=your_webhook_secret

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# Monitoring
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=info
```

---

## 📊 **12. Monitoring & Analytics**

### **Health Check Endpoint**

```typescript
// GET /api/health
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabaseHealth(),
      cashfree: await checkCashfreeHealth(),
      exchangeRate: await checkExchangeRateHealth(),
      redis: await checkRedisHealth()
    },
    metrics: {
      activeSessions: await getActiveSessionsCount(),
      pendingTransactions: await getPendingTransactionsCount(),
      dailyVolume: await getDailyVolume()
    }
  };
  
  res.json(health);
});
```

### **Business Metrics Dashboard**

```typescript
// GET /api/v1/analytics/dashboard
interface DashboardMetrics {
  dailyVolume: {
    usd: number;
    inr: number;
    transactions: number;
  };
  kycMetrics: {
    totalSessions: number;
    completedSessions: number;
    successRate: number;
  };
  transactionMetrics: {
    pending: number;
    completed: number;
    failed: number;
    averageSettlementTime: number;
  };
  complianceMetrics: {
    strCount: number;
    ctrCount: number;
    complianceScore: number;
  };
}
```

---

## 🚀 **13. Getting Started Guide**

### **Quick Start (5 minutes)**

```bash
# 1. Clone and setup
git clone https://github.com/your-org/stablepay-platform
cd stablepay-platform

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.development
# Edit .env.development with your credentials

# 4. Start development server
npm run dev

# 5. Access documentation
open http://localhost:3001
```

### **Production Deployment**

```bash
# 1. Setup production environment
./setup-production.sh

# 2. Build and deploy with Docker
docker-compose -f docker-compose.prod.yml up -d

# 3. Run database migrations
npm run db:push

# 4. Verify deployment
curl http://your-domain.com/api/health
```

---

## 📋 **14. Compliance Checklist**

| Area | Implementation Status | Notes |
|------|---------------------|-------|
| **FIU-IND Registration** | ✅ Required | Register as reporting entity |
| **STR/CTR Filing** | ✅ Implemented | Automated via FINnet XML |
| **FEMA Compliance** | ✅ Implemented | 24-hour settlement rule |
| **TDS Collection** | ✅ Implemented | s.194Q with Form 26Q |
| **GST Compliance** | ✅ Implemented | GSTR-3B & GSTR-1 |
| **KYC Storage** | ✅ Implemented | 3-year retention |
| **Risk Monitoring** | ✅ Implemented | Velocity checks + analytics |
| **ISO 27001** | 🔄 In Progress | Security certification |
| **RBI Guidelines** | ✅ Implemented | Crypto-to-fiat compliance |

---

## 🎯 **Why This Design Scales**

1. **Microservices Architecture** - Each component can scale independently
2. **Event-Driven Design** - Webhooks enable real-time partner integration
3. **Multi-Network Support** - Easy to add new blockchain networks
4. **Compliance-First** - Built-in regulatory compliance from day one
5. **SDK Ecosystem** - Multiple language support for easy integration
6. **Real-Time Processing** - Live quotes and instant status updates
7. **Comprehensive KYC** - 6 verification methods for robust identity checks
8. **Production Ready** - Docker, monitoring, and health checks included

---

*This blueprint provides a complete foundation for building a production-ready stable-coin-to-INR off-ramp platform that complies with Indian regulations while offering excellent developer experience and scalability.* 