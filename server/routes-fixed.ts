import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.ts";
import { 
  insertPartnerSchema, 
  insertKycSessionSchema, 
  insertQuoteSchema, 
  insertTransactionSchema,
  insertWebhookEventSchema
} from "../shared/schema.ts";
import { z } from "zod";
import NodeRSA from "node-rsa";
import { createHash } from "crypto";
import https from "https";

// Cashfree RSA signature generation
function generateCashfreeSignature(clientId: string, publicKeyPem: string): string {
  try {
    // Create the data to encrypt: clientId + current unix timestamp
    const timestamp = Math.floor(Date.now() / 1000);
    const dataToEncrypt = `${clientId}.${timestamp}`;
    
    console.log('[CASHFREE] Generating signature for:', dataToEncrypt);
    console.log('[CASHFREE] Public key first 50 chars:', publicKeyPem.substring(0, 50));
    
    // Format the public key properly for NodeRSA
    let formattedKey = publicKeyPem.trim();
    
    // If it doesn't have PEM headers, add them
    if (!formattedKey.includes('-----BEGIN')) {
      formattedKey = `-----BEGIN PUBLIC KEY-----\n${formattedKey}\n-----END PUBLIC KEY-----`;
    }
    
    // Create RSA key from PEM
    const key = new NodeRSA();
    key.importKey(formattedKey, 'public');
    key.setOptions({ encryptionScheme: 'pkcs1_oaep' });
    
    // Encrypt the data
    const encrypted = key.encrypt(dataToEncrypt, 'base64');
    console.log('[CASHFREE] Signature generated successfully');
    
    return encrypted;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[CASHFREE] Error generating signature:', errorMessage);
    console.error('[CASHFREE] Error stack:', errorStack);
    // Don't throw error - let the API call proceed without signature
    console.log('[CASHFREE] Proceeding without signature');
    return '';
  }
}

// External API helpers
async function getUsdInrRate(): Promise<number> {
  try {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY || '1075803d0988da5d5738dba4';
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`);
    const data = await response.json();
    
    if (data.result === 'success') {
      return data.conversion_rates?.INR || 83.40;
    } else {
      console.error("Exchange rate API error:", data.error_type);
      return 83.40;
    }
  } catch (error) {
    console.error("Error fetching USD-INR rate:", error);
    return 83.40;
  }
}

async function callKycApi(endpoint: string, data: any): Promise<any> {
  try {
    // For production, integrate with your KYC service provider
    // This simulates the KYC API responses for testing
    const kycApiKey = process.env.KYC_API_KEY || "demo_key";
    
    if (endpoint === 'digilocker/fetch') {
      return {
        success: true,
        data: {
          requestId: data.requestId,
          documents: {
            aadhaar: {
              name: "John Doe",
              aadhaar: "XXXX-XXXX-1234",
              dateOfBirth: "1990-01-01",
              address: "123 Main St, Mumbai, MH 400001"
            }
          },
          status: "verified"
        }
      };
    }
    
    if (endpoint === 'pan') {
      return {
        success: true,
        data: {
          panNumber: data.panNumber,
          name: "John Doe",
          status: "valid",
          category: "Individual"
        }
      };
    }
    
    return { success: false, error: "Unknown endpoint" };
  } catch (error) {
    console.error("Error calling KYC API:", error);
    return { success: false, error: "External API error" };
  }
}

// Name matching utility function
function normalizeAndMatchName(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;
  
  // Normalize names by removing extra spaces, converting to lowercase, and removing special characters
  const normalize = (name: string) => 
    name.toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
  
  const normalized1 = normalize(name1);
  const normalized2 = normalize(name2);
  
  // Check for exact match
  if (normalized1 === normalized2) return true;
  
  // Check for partial match (at least 70% similarity)
  const similarity = calculateSimilarity(normalized1, normalized2);
  return similarity >= 0.7;
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

async function callCashfreeKycApi(verificationType: string, formData: any): Promise<any> {
  try {
    const clientId = process.env.CASHFREE_CLIENT_ID;
    const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
    const publicKeyPem = process.env.CASHFREE_PUBLIC_KEY;
    
    console.log(`[CASHFREE] Live API call for ${verificationType}`);
    console.log(`[CASHFREE] Client ID available: ${!!clientId}`);
    console.log(`[CASHFREE] Client Secret available: ${!!clientSecret}`);
    console.log(`[CASHFREE] Public Key available: ${!!publicKeyPem}`);
    
    if (!clientId || !clientSecret) {
      console.error(`[CASHFREE] CRITICAL: Missing credentials for ${verificationType}`);
      
      // For localhost development, return mock responses
      if (process.env.NODE_ENV === 'development') {
        console.log(`[CASHFREE] Using mock response for development environment`);
        return getMockCashfreeResponse(verificationType, formData);
      }
      
      throw new Error('Cashfree credentials not configured - cannot make API call');
    }
    
    // Generate signature if public key is available
    let signature = '';
    if (publicKeyPem && clientId) {
      signature = generateCashfreeSignature(clientId, publicKeyPem);
    }
    
    const baseUrl = process.env.CASHFREE_KYC_BASE_URL || 'https://api.cashfree.com/verification';
    console.log(`[CASHFREE] Base URL: ${baseUrl}`);
    
    // Map verification types to Cashfree endpoints
    const endpointMap: Record<string, string> = {
      'aadhaar-generate-otp': '/offline-aadhaar/otp',
      'aadhaar-submit-otp': '/offline-aadhaar/verify',
      'pan': '/pan',
      'face-liveness': '/face-liveness',
      'name-match': '/name-match'
      // UPI and Bank are handled by Surepass only
    };

    
    const endpoint = endpointMap[verificationType];
    if (!endpoint) {
      throw new Error(`Unknown verification type: ${verificationType}`);
    }
    
    const url = `${baseUrl}${endpoint}`;
    console.log(`[CASHFREE] Making API call to: ${url}`);
    console.log(`[CASHFREE] Request data:`, JSON.stringify(formData, null, 2));
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Id': clientId,
      'X-Client-Secret': clientSecret
    };
    
    // Add signature if available
    if (signature) {
      headers['X-Cf-Signature'] = signature;
      console.log('[CASHFREE] Added RSA signature to request');
    }
    
    console.log(`[CASHFREE] Request headers:`, JSON.stringify(headers, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(formData)
    });
    
    console.log(`[CASHFREE] Response status: ${response.status}`);
    console.log(`[CASHFREE] Response status text: ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`[CASHFREE] Raw response:`, responseText);
    console.log(`[CASHFREE] First 100 chars:`, responseText.substring(0, 100));
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError: unknown) {
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      console.error(`[CASHFREE] JSON parse error:`, errorMessage);
      console.error(`[CASHFREE] Response was not valid JSON:`, responseText);
      // Check if the response is an HTML error page (common when IP is not whitelisted)
      if (responseText.trim().startsWith('<')) {
        throw new Error(`Cashfree API returned HTML error page instead of JSON. This usually indicates an IP whitelist issue. Current IP needs to be whitelisted in Cashfree dashboard.`);
      }
      
      throw new Error(`Invalid JSON response from Cashfree: ${errorMessage}. Response: ${responseText.substring(0, 200)}`);
    }
    
    console.log(`[CASHFREE] Response status: ${response.status}`);
    console.log(`[CASHFREE] Response headers:`, JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    console.log(`[CASHFREE] Response data:`, JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      console.error(`[CASHFREE] API error: ${result.message || result.error_msg}`);
      console.error(`[CASHFREE] Full error response:`, JSON.stringify(result, null, 2));
      throw new Error(`Cashfree API error: ${result.message || result.error_msg || 'Unknown error'}`);
    }

    console.log(`[CASHFREE] ${verificationType} verification successful`);
    
    // Check if the response contains a mock pattern
    if (result.ref_id && result.ref_id.match(/^req_\d+_[a-z0-9]+$/)) {
      console.error(`[CASHFREE] ERROR: API returned mock response pattern: ${result.ref_id}`);
      throw new Error(`Cashfree API returned mock response - not real API call`);
    }
    
    return {
      status: 'SUCCESS',
      data: result
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error(`[CASHFREE] Network error for ${verificationType}:`, errorMessage);
    console.error(`[CASHFREE] Error details:`, errorStack);
    
    // For development mode, return mock response
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CASHFREE] Development mode - returning mock response for ${verificationType}`);
      return getMockCashfreeResponse(verificationType, formData);
    }
    
    // For production, re-throw the error
    throw error;
  }
}

function getMockCashfreeResponse(verificationType: string, formData: any): any {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  
  switch (verificationType) {
    case 'aadhaar-generate-otp':
      return {
        status: 'SUCCESS',
        data: {
          ref_id: `mock_${timestamp}_${randomId}`,
          message: 'OTP sent successfully (mock)',
          otp_sent: true
        }
      };
    
    case 'aadhaar-submit-otp':
      return {
        status: 'SUCCESS',
        data: {
          ref_id: formData.ref_id || `mock_${timestamp}_${randomId}`,
          verified: true,
          name: 'Mock User',
          aadhaar_number: 'XXXX-XXXX-1234',
          date_of_birth: '1990-01-01',
          address: 'Mock Address, Mock City'
        }
      };
    
    case 'pan':
      return {
        status: 'SUCCESS',
        data: {
          ref_id: `mock_${timestamp}_${randomId}`,
          verified: true,
          name: 'Mock User',
          pan_number: formData.pan_number || 'MOCK1234P',
          category: 'Individual'
        }
      };
    
    // No 'upi' case here; UPI is handled by Surepass only
    default:
      return {
        status: 'SUCCESS',
        data: {
          ref_id: `mock_${timestamp}_${randomId}`,
          verified: true,
          message: `Mock ${verificationType} verification successful`
        }
      };
  }
}

// Generate unique IDs
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateApiKey(environment: 'production' = 'production'): string {
  // Always use production prefix
  const prefix = 'pk_live_';
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${prefix}${randomPart}`;
}

// Add a top-level sandbox flag
const IS_SANDBOX = false;
console.log('IS_SANDBOX:', IS_SANDBOX);

export function registerRoutes(app: Express): Server {

  const httpServer = createServer(app);

  // Middleware to extract and validate API key
  const authenticateApiKey = async (req: Request, res: Response, next: Function) => {
  // UPI verification endpoint (Surepass)
  app.post('/api/v1/kyc/upi/verify', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId, upiId, name } = req.body;
      if (!sessionId || !upiId || !name) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'sessionId, upiId, and name are required',
          message: 'Missing required fields',
        });
      }

      // Surepass API call
      const surepassToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTczNjE2OTM0MywianRpIjoiYjk4ZDJlNTctNzQyNy00ZmMzLTkyMzctMjVjOGI1ODRjNDQyIiwidHlwZSI6ImFjY2VzcyIsImlkZW50aXR5IjoiZGV2LnN0YWJsZXBheUBzdXJlcGFzcy5pbyIsIm5iZiI6MTczNjE2OTM0MywiZXhwIjoyMzY2ODg5MzQzLCJlbWFpbCI6InN0YWJsZXBheUBzdXJlcGFzcy5pbyIsInRlbmFudF9pZCI6Im1haW4iLCJ1c2VyX2NsYWltcyI6eyJzY29wZXMiOlsidXNlciJdfX0.gwdII-K1wWVxCTIpawz-qyfvBWlYxKHsraRoXXO3Kf0';
      const response = await fetch('https://kyc-api.surepass.app/api/v1/upi-verification/vpa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${surepassToken}`
        },
        body: JSON.stringify({ vpa: upiId, name })
      });

      // Only read the response body once
      const surepassData = await response.json();
      console.log('[UPI][Surepass] Response:', surepassData);

      if (response.ok && surepassData.success) {
        res.json({
          success: true,
          data: {
            sessionId,
            upiId,
            name,
            verified: surepassData.data && surepassData.data.status === 'active',
            upiStatus: surepassData.data && surepassData.data.status,
            surepassResponse: surepassData.data
          },
          error: null
        });
      } else {
        // Log error details but do not re-read the body
        console.error('[UPI][ERROR] Surepass verification failed:', {
          status: response.status,
          statusText: response.statusText,
          surepassData
        });
        res.status(400).json({
          success: false,
          data: null,
          error: 'UPI verification failed',
          message: surepassData.message || 'Verification failed',
          surepassResponse: surepassData,
          status: response.status,
          statusText: response.statusText
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        data: null,
        error: 'UPI verification service error',
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header required. Format: Bearer <api_key>'
      });
    }
    
    const apiKey = authHeader.substring(7);
    const partner = await storage.getPartnerByApiKey(apiKey);
    
    if (!partner) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }
    
    (req as any).partner = partner;
    next();
  };

  // Partner creation endpoint (no auth required)
  app.post('/api/v1/partner/create', async (req, res) => {
    if (IS_SANDBOX) {
      const { name, email, webhookUrl } = req.body;
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          error: 'name and email are required',
          message: 'Missing name or email in request body',
          data: null
        });
      }
      res.json({
        success: true,
        data: {
          partnerId: `mock_partner_${Math.floor(Math.random() * 1000000)}`,
          apiKey: `mock_api_key_${Math.floor(Math.random() * 1000000)}`,
          name,
          email,
          status: 'active',
          environment: 'sandbox',
          createdAt: new Date().toISOString()
        },
        error: null
      });
      return;
    }
    try {
      const result = insertPartnerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Invalid input',
          message: 'Validation failed',
          details: result.error.issues
        });
      }

      const { name, email, webhookUrl } = result.data;
      
      // Generate unique IDs
      const partnerId = `partner_${generateId()}`;
      const apiKey = generateApiKey('production'); // Always generate production keys
      const environment = 'production';
      
      const partner = await storage.createPartner({
        name,
        email,
        webhookUrl: webhookUrl || undefined
      });

      res.json({
        success: true,
        data: {
          partnerId: partner.partnerId,
          apiKey: partner.apiKey,
          name: partner.name,
          email: partner.email,
          status: partner.status,
          environment,
          createdAt: partner.createdAt
        },
        error: null
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('Error creating partner:', errorMessage, errorStack);
      res.status(500).json({
        success: false,
        data: null,
        error: 'Internal server error',
        message: errorMessage,
        stack: errorStack
      });
    }
  });

  // KYC Session Creation
  app.post('/api/v1/kyc/session/create', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const partner = (req as any).partner;
      const { userId, documentType, documentNumber, holderName } = req.body;
      
      if (!userId || !documentType || !documentNumber) {
        return res.status(400).json({
          success: false,
          error: 'userId, documentType, and documentNumber are required'
        });
      }

      const sessionId = `kyc_${generateId()}`;
      
      try {
        const session = await storage.createKycSession({
          partnerId: partner.partnerId,
          userId,
          customerRef: userId, // Use userId as customerRef if not provided
          documentType,
          documentNumber,
          holderName: holderName || null
        });
        res.json({
          success: true,
          data: {
            sessionId: session.sessionId,
            userId: session.userId,
            documentType: session.documentType,
            status: session.status,
            createdAt: session.createdAt
          },
          error: null
        });
      } catch (dbError) {
        // Return DB error in response for debugging (full stack if available)
        return res.status(500).json({
          success: false,
          error: 'DB error',
          details: dbError instanceof Error ? { message: dbError.message, stack: dbError.stack } : dbError
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: errorMessage,
        stack: errorStack
      });
    }
  });

  // Aadhaar OKYC endpoint
  app.post('/api/v1/kyc/aadhaar-okyc', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId, aadhaarNumber, name, otp } = req.body;
      
      if (!sessionId || !aadhaarNumber || !otp) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, aadhaarNumber, and otp are required'
        });
      }

      // Get session
      const session = await storage.getKycSessionById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'KYC session not found'
        });
      }

      // Call Cashfree API for Aadhaar verification
      const verificationResult = await callCashfreeKycApi('aadhaar-submit-otp', {
        ref_id: `cashfree_${generateId()}`,
        otp,
        aadhaar_number: aadhaarNumber
      });

      if (verificationResult.status === 'SUCCESS') {
        // Update session with verification data
        await storage.updateKycSession(sessionId, {
          status: 'completed',
          aadhaarVerified: true,
          aadhaarName: verificationResult.data.name || name,
          verifiedName: verificationResult.data.name || name,
          verificationData: verificationResult.data
        });

        res.json({
          success: true,
          data: {
            sessionId,
            verified: true,
            aadhaar: {
              verified: true,
              name: verificationResult.data.name || name,
              number: 'XXXX-XXXX-' + aadhaarNumber.slice(-4)
            },
            completedAt: new Date().toISOString()
          },
          error: null
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Aadhaar verification failed',
          details: verificationResult.data
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error in Aadhaar verification:', errorMessage);
      res.status(500).json({
        success: false,
        error: 'Verification service error',
        message: errorMessage
      });
    }
  });

  // Alias for Aadhaar verification: /api/v1/kyc/aadhaar/verify
  app.post('/api/v1/kyc/aadhaar/verify', authenticateApiKey, (req, res, next) => {
    req.url = '/api/v1/kyc/aadhaar-okyc';
    next();
  });
  // Alias for Aadhaar OTP generation: /api/v1/kyc/aadhaar/generate-otp
  if (!(app._router.stack as any[]).some((r: any) => r.route && r.route.path === '/api/v1/kyc/aadhaar/generate-otp')) {
    app.post('/api/v1/kyc/aadhaar/generate-otp', authenticateApiKey, (req, res) => {
      const { aadhaar_number } = req.body;
      if (!aadhaar_number) {
        return res.status(400).json({
          success: false,
          error: 'aadhaar_number is required',
          message: 'Missing aadhaar_number in request body',
          data: null
        });
      }
      // Mock response
      res.json({
        success: true,
        data: {
          refId: `mock_ref_${Math.floor(Math.random() * 1000000)}`,
          maskedMobile: 'XXXX-XXX-1234',
          message: 'OTP sent successfully to registered mobile number (mock)'
        },
        error: null
      });
    });
  }
  // Alias for PAN verification: /api/v1/kyc/pan/verify
  if (!(app._router.stack as any[]).some((r: any) => r.route && r.route.path === '/api/v1/kyc/pan/verify')) {
    app.post('/api/v1/kyc/pan/verify', authenticateApiKey, (req, res) => {
      const { pan_number, name } = req.body;
      if (!pan_number || !name) {
        return res.status(400).json({
          success: false,
          error: 'pan_number and name are required',
          message: 'Missing pan_number or name in request body',
          data: null
        });
      }
      res.json({
        success: true,
        data: {
          panNumber: pan_number,
          name,
          status: 'valid',
          category: 'Individual',
          message: 'PAN verified successfully (mock)'
        },
        error: null
      });
    });
  }
  // Alias for UPI verification: /api/v1/kyc/upi/verify
  if (!(app._router.stack as any[]).some((r: any) => r.route && r.route.path === '/api/v1/kyc/upi/verify')) {
    app.post('/api/v1/kyc/upi/verify', authenticateApiKey, (req, res) => {
      const { upi_id, name } = req.body;
      if (!upi_id || !name) {
        return res.status(400).json({
          success: false,
          error: 'upi_id and name are required',
          message: 'Missing upi_id or name in request body',
          data: null
        });
      }
      res.json({
        success: true,
        data: {
          upiId: upi_id,
          name,
          verified: true,
          upiStatus: 'active',
          message: 'UPI verified successfully (mock)'
        },
        error: null
      });
    });
  }
  // Alias for Bank verification: /api/v1/kyc/bank/verify
  if (!(app._router.stack as any[]).some((r: any) => r.route && r.route.path === '/api/v1/kyc/bank/verify')) {
    app.post('/api/v1/kyc/bank/verify', authenticateApiKey, (req, res) => {
      const { account_number, ifsc, name } = req.body;
      if (!account_number || !ifsc || !name) {
        return res.status(400).json({
          success: false,
          error: 'account_number, ifsc, and name are required',
          message: 'Missing account_number, ifsc, or name in request body',
          data: null
        });
      }
      res.json({
        success: true,
        data: {
          accountNumber: account_number,
          ifsc,
          name,
          verified: true,
          accountStatus: 'active',
          bankName: 'Mock Bank',
          message: 'Bank account verified successfully (mock)'
        },
        error: null
      });
    });
  }
  // Alias for Face Liveness verification: /api/v1/kyc/face-liveness/verify
  if (!(app._router.stack as any[]).some((r: any) => r.route && r.route.path === '/api/v1/kyc/face-liveness/verify')) {
    app.post('/api/v1/kyc/face-liveness/verify', authenticateApiKey, (req, res) => {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({
          success: false,
          error: 'image is required',
          message: 'Missing image in request body',
          data: null
        });
      }
      res.json({
        success: true,
        data: {
          livenessScore: 0.99,
          qualityScore: 0.95,
          faceMatch: true,
          actionVerified: true,
          verificationId: `mock_face_${Math.floor(Math.random() * 1000000)}`,
          message: 'Face liveness verified successfully (mock)'
        },
        error: null
      });
    });
  }
  // Alias for Name Match verification: /api/v1/kyc/name-match/verify
  if (!(app._router.stack as any[]).some((r: any) => r.route && r.route.path === '/api/v1/kyc/name-match/verify')) {
    app.post('/api/v1/kyc/name-match/verify', authenticateApiKey, (req, res) => {
      const { name1, name2 } = req.body;
      if (!name1 || !name2) {
        return res.status(400).json({
          success: false,
          error: 'name1 and name2 are required',
          message: 'Missing name1 or name2 in request body',
          data: null
        });
      }
      res.json({
        success: true,
        data: {
          name1,
          name2,
          match: name1.toLowerCase() === name2.toLowerCase(),
          message: 'Name match verification completed (mock)'
        },
        error: null
      });
    });
  }

  // Quote generation endpoint
  app.post('/api/v1/quote', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { token, network, amount, targetChain, targetToken } = req.body;
      
      if (!token || !network || !amount) {
        return res.status(400).json({
          success: false,
          error: 'token, network, and amount are required'
        });
      }

      // Get live USD-INR rate
      const fxRate = await getUsdInrRate();
      const usdAmount = parseFloat(amount);
      
      // Calculate fees (same as before)
      const markupPct = 0.5; // 0.5%
      const grossINR = usdAmount * fxRate;
      const commission = grossINR * (markupPct / 100);
      const gstAmount = commission * 0.18; // 18% GST on commission
      const tdsAmount = grossINR * 0.01; // 1% TDS
      const netINR = grossINR - commission - gstAmount - tdsAmount;

      const quoteReference = `quote_${generateId()}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      const quote = await storage.createQuote({
        token,
        network,
        amount: amount.toString(),
        targetChain: targetChain || null,
        targetToken: targetToken || null,
        fxRate,
        markupPct,
        grossINR,
        commission,
        gstAmount,
        tdsAmount,
        estimatedINR: netINR,
        expiresAt
      });

      res.json({
        success: true,
        data: {
          quoteReference: quote.quoteReference,
          usdAmount,
          fxRate,
          grossINR,
          commission,
          gstAmount,
          tdsAmount,
          netINR,
          expiresAt: quote.expiresAt,
          depositAddress: "0x742d35Cc6634C0532925a3b8D6Ac6E7CD3E4AE9F"
        },
        error: null
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('Error generating quote:', errorMessage, errorStack);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: errorMessage,
        stack: errorStack
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'API is healthy',
      timestamp: new Date().toISOString()
    });
  });

  // Generate Postman collection
  app.get('/api/v1/postman/collection', (req: Request, res: Response) => {
    // Force environment to production by default
    const environment = req.query.environment as string || 'production';
    const baseUrl = environment === 'production' 
      ? 'http://localhost:4000' 
      : 'http://localhost:4000';

    const collection = {
      info: {
        name: `StablePay API - ${environment.charAt(0).toUpperCase() + environment.slice(1)}`,
        description: `Complete StablePay API collection for ${environment} environment`,
        version: "1.0.0"
      },
      variable: [
        {
          key: "baseUrl",
          value: baseUrl,
          type: "string"
        },
        {
          key: "apiKey",
          value: "",
          type: "string"
        }
      ],
      item: [
        {
          name: "Create Partner",
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Test Company",
                email: "test@company.com",
                webhookUrl: "https://webhook.site/your-unique-url"
              }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/api/v1/partner/create",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "partner", "create"]
            }
          }
        },
        {
          name: "Create KYC Session",
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              },
              {
                key: "Authorization",
                value: "Bearer {{apiKey}}"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                userId: "user_123",
                documentType: "aadhaar",
                documentNumber: "123456789012",
                holderName: "John Doe"
              }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/api/v1/kyc/session/create",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "kyc", "session", "create"]
            }
          }
        }
      ]
    };

    res.json(collection);
  });

  // Global error handler (must be last)
  app.use((err: Error, req: Request, res: Response, next: Function) => {
    console.error('[GLOBAL ERROR HANDLER]', err);
    res.status((err as any).status || 500).json({
      success: false,
      error: err.message || 'Internal server error',
      stack: err.stack || undefined
    });
  });

  return httpServer;
}
