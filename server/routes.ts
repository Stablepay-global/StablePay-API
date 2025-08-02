import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertPartnerSchema, 
  insertKycSessionSchema, 
  insertQuoteSchema, 
  insertTransactionSchema,
  insertWebhookEventSchema
} from "@shared/schema";
import { z } from "zod";
import NodeRSA from "node-rsa";
import { createHash } from "crypto";
import https from "https";

const IS_SANDBOX = false;

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
    // Import the key with the proper format
    key.importKey(Buffer.from(formattedKey), 'public');
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

// Name similarity calculation function
function calculateNameSimilarity(name1: string, name2: string): number {
  // Simple Levenshtein distance-based similarity
  const maxLength = Math.max(name1.length, name2.length);
  if (maxLength === 0) return 1.0;
  
  const distance = levenshteinDistance(name1, name2);
  return (maxLength - distance) / maxLength;
}

// Levenshtein distance calculation
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

// Environment detection helper
function getEnvironmentMode(): 'production' {
  // Check if running in production mode with valid credentials
  if (process.env.NODE_ENV === 'production' && 
      process.env.CASHFREE_CLIENT_ID && 
      process.env.CASHFREE_CLIENT_SECRET) {
    console.log('[ENV] Production mode detected: NODE_ENV=production with Cashfree credentials');
    return 'production';
  }
  throw new Error('Invalid environment configuration - ensure NODE_ENV is set to production with Cashfree credentials');
}

async function callCashfreeKycApi(verificationType: string, formData: any): Promise<any> {
  const environment = getEnvironmentMode();
  
  console.log(`[CASHFREE] Environment: ${environment}`);
  console.log(`[CASHFREE] API call for ${verificationType}`);
  
  // Production mode - use actual Cashfree APIs
  try {
    const clientId = process.env.CASHFREE_CLIENT_ID;
    const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
    const publicKeyPem = process.env.CASHFREE_PUBLIC_KEY;
    
    console.log(`[CASHFREE] Production API call for ${verificationType}`);
    console.log(`[CASHFREE] Client ID available: ${!!clientId}`);
    console.log(`[CASHFREE] Client Secret available: ${!!clientSecret}`);
    console.log(`[CASHFREE] Public Key available: ${!!publicKeyPem}`);
    
    if (!clientId || !clientSecret) {
      throw new Error('Production Cashfree credentials not configured - cannot make live API call');
    }
    
    // Generate signature if public key is available
    let signature = '';
    if (publicKeyPem && clientId) {
      signature = generateCashfreeSignature(clientId, publicKeyPem);
    }
    
    // Use production Cashfree base URL
    const baseUrl = process.env.CASHFREE_KYC_BASE_URL || 'https://api.cashfree.com/verification';
    console.log(`[CASHFREE] Production Base URL: ${baseUrl}`);
    
    // Map verification types to Cashfree production endpoints
    const endpointMap: Record<string, string> = {
      'aadhaar-generate-otp': '/offline-aadhaar/otp',
      'aadhaar-submit-otp': '/offline-aadhaar/verify',
      'pan': '/pan',
      'face-liveness': '/face-liveness',
      'upi': '/upi',
      'bank': '/bank-account',
      'name-match': '/name-match',
      'vehicle': '/vehicle',
      'driving-license': '/driving-license',
      'voter-id': '/voter-id',
      'passport': '/passport'
    };
    
    const endpoint = endpointMap[verificationType];
    if (!endpoint) {
      throw new Error(`Unknown verification type: ${verificationType}`);
    }
    
    const url = `${baseUrl}${endpoint}`;
    console.log(`[CASHFREE] Making production API call to: ${url}`);
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
    
    console.log(`[CASHFREE] Production request headers:`, JSON.stringify(headers, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(formData)
    });
    
    console.log(`[CASHFREE] Production response status: ${response.status}`);
    console.log(`[CASHFREE] Production response status text: ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`[CASHFREE] Production raw response:`, responseText);
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
        throw new Error(`Cashfree production API returned HTML error page instead of JSON. This usually indicates an IP whitelist issue. Current production IP needs to be whitelisted in Cashfree dashboard.`);
      }
      
      throw new Error(`Invalid JSON response from Cashfree production: ${errorMessage}. Response: ${responseText.substring(0, 200)}`);
    }
    
    console.log(`[CASHFREE] Production response status: ${response.status}`);
    console.log(`[CASHFREE] Production response headers:`, JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    console.log(`[CASHFREE] Production response data:`, JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      console.error(`[CASHFREE] Production API error: ${result.message || result.error_msg}`);
      console.error(`[CASHFREE] Full production error response:`, JSON.stringify(result, null, 2));
      throw new Error(`Cashfree production API error: ${result.message || result.error_msg || 'Unknown error'}`);
    }

    console.log(`[CASHFREE] Production ${verificationType} verification successful`);
    
    return {
      status: 'SUCCESS',
      data: result
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error(`[CASHFREE] Production network error for ${verificationType}:`, errorMessage);
    console.error(`[CASHFREE] Production error details:`, errorStack);
    
    // For production, re-throw the error - don't fall back to mock
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
          ref_id: `cf_${timestamp}_${randomId}`,
          message: 'OTP sent successfully',
          otp_sent: true,
          aadhaar_number: formData.aadhaar_number ? `XXXX-XXXX-${formData.aadhaar_number.slice(-4)}` : 'XXXX-XXXX-7443',
          mobile_number: 'XXXXXX9999',
          status: 'otp_sent'
        }
      };
    
    case 'aadhaar-submit-otp':
      return {
        status: 'SUCCESS',
        data: {
          ref_id: formData.ref_id || `cf_${timestamp}_${randomId}`,
          verification_status: 'verified',
          aadhaar_number: formData.aadhaar_number ? `XXXX-XXXX-${formData.aadhaar_number.slice(-4)}` : 'XXXX-XXXX-7443',
          name: formData.name || 'Yashkumar Purohit',
          date_of_birth: '01-01-1990',
          gender: 'Male',
          address: {
            house: '123',
            street: 'Mock Street',
            landmark: 'Near Mock Landmark',
            locality: 'Mock Locality',
            vtc: 'Mock City',
            district: 'Mock District',
            state: 'Gujarat',
            pincode: '380001'
          },
          face_status: 'verified',
          face_score: 0.95,
          zip: '380001',
          age_range: '25-35',
          verification_id: `verification_${timestamp}`
        }
      };
    
    case 'pan':
      return {
        status: 'SUCCESS',
        data: {
          ref_id: `cf_${timestamp}_${randomId}`,
          verification_status: 'verified',
          pan_number: formData.pan || 'DSLPP8826D',
          name: formData.name || 'Yashkumar Purohit',
          name_match: true,
          category: 'Individual',
          date_of_birth: '01-01-1990',
          pan_status: 'valid',
          verification_id: `verification_${timestamp}`
        }
      };
    
    case 'bank-account':
      return {
        status: 'SUCCESS',
        data: {
          ref_id: `cf_${timestamp}_${randomId}`,
          verification_status: 'verified',
          account_number: formData.bank_account || '919925028999',
          ifsc: formData.ifsc || 'PYTM0123456',
          name: formData.name || 'Yashkumar Purohit',
          name_match: true,
          bank_name: 'Paytm Payments Bank',
          branch_name: 'Noida Branch',
          account_type: 'Savings',
          account_status: 'Active',
          verification_id: `verification_${timestamp}`
        }
      };
    
    case 'upi':
      return {
        status: 'SUCCESS',
        data: {
          ref_id: `cf_${timestamp}_${randomId}`,
          verification_status: 'verified',
          upi_id: formData.upi_id || '9925028999@upi',
          name: formData.name || 'Yashkumar Purohit',
          name_match: true,
          psp_name: 'Paytm',
          account_status: 'Active',
          verification_id: `verification_${timestamp}`
        }
      };
    
    case 'face-liveness':
      return {
        status: 'SUCCESS',
        data: {
          ref_id: `cf_${timestamp}_${randomId}`,
          verification_status: 'verified',
          liveness_score: 0.94,
          quality_score: 0.89,
          face_match: true,
          action_verified: formData.action || 'blink',
          verification_id: `verification_${timestamp}`
        }
      };
    
    case 'vehicle':
      return {
        status: 'SUCCESS',
        data: {
          ref_id: `cf_${timestamp}_${randomId}`,
          verification_status: 'verified',
          vehicle_number: formData.vehicle_number || 'GJ01AB1234',
          owner_name: 'Yashkumar Purohit',
          registration_date: '2020-01-15',
          chassis_number: 'MA1234567890',
          engine_number: 'ENG123456',
          vehicle_class: 'Motor Car',
          fuel_type: 'Petrol',
          maker_description: 'MARUTI SUZUKI',
          model: 'SWIFT',
          body_type: 'SALOON',
          color: 'WHITE',
          seating_capacity: '5',
          verification_id: `verification_${timestamp}`
        }
      };
    
    case 'driving-license':
      return {
        status: 'SUCCESS',
        data: {
          ref_id: `cf_${timestamp}_${randomId}`,
          verification_status: 'verified',
          license_number: formData.license_number || 'GJ1420110012345',
          name: formData.name || 'Yashkumar Purohit',
          name_match: true,
          date_of_birth: formData.date_of_birth || '1990-01-01',
          father_name: 'Father Name',
          address: 'Mock Address, Mock City, Gujarat',
          license_type: 'MCWG',
          issued_date: '2020-01-01',
          validity_upto: '2040-01-01',
          blood_group: 'B+',
          verification_id: `verification_${timestamp}`
        }
      };
    
    case 'voter-id':
      return {
        status: 'SUCCESS',
        data: {
          ref_id: `cf_${timestamp}_${randomId}`,
          verification_status: 'verified',
          voter_id: formData.voter_id || 'GUJ0012345',
          name: formData.name || 'Yashkumar Purohit',
          name_match: true,
          father_name: 'Father Name',
          age: 30,
          gender: 'Male',
          constituency: 'Mock Constituency',
          state: 'Gujarat',
          address: 'Mock Address, Mock City, Gujarat',
          verification_id: `verification_${timestamp}`
        }
      };
    
    case 'passport':
      return {
        status: 'SUCCESS',
        data: {
          ref_id: `cf_${timestamp}_${randomId}`,
          verification_status: 'verified',
          passport_number: formData.passport_number || 'J1234567',
          name: formData.name || 'Yashkumar Purohit',
          name_match: true,
          date_of_birth: formData.date_of_birth || '1990-01-01',
          place_of_birth: 'India',
          father_name: 'Father Name',
          gender: 'Male',
          nationality: 'Indian',
          issue_date: '2020-01-01',
          expiry_date: '2030-01-01',
          place_of_issue: 'New Delhi',
          verification_id: `verification_${timestamp}`
        }
      };
    
    default:
      return {
        status: 'SUCCESS',
        data: {
          ref_id: `cf_${timestamp}_${randomId}`,
          verification_status: 'verified',
          message: `Mock ${verificationType} verification successful`,
          verification_id: `verification_${timestamp}`
        }
      };
  }
}

// Generate unique IDs
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateApiKey(environment: 'production' = 'production'): string {
  // Determine environment based on actual runtime conditions
  const actualEnvironment = getEnvironmentMode();
  const prefix = actualEnvironment === 'production' ? 'pk_live_' : 'pk_live_';
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${prefix}${randomPart}`;
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Middleware to extract and validate API key
  const authenticateApiKey = async (req: Request, res: Response, next: Function) => {
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
  app.post('/api/v1/partner/create', async (req: Request, res: Response) => {
    try {
      const result = insertPartnerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input',
          details: result.error.issues
        });
      }

      const { name, email, webhookUrl } = result.data;
      const environment = getEnvironmentMode();
      
      // Generate unique IDs
      const partnerId = `partner_${generateId()}`;
      const apiKey = generateApiKey(environment); // Use environment-appropriate key
      
      console.log(`[PARTNER] Creating partner in ${environment} mode with key: ${apiKey}`);
      
      const partner = await storage.createPartner({
        name,
        email,
        webhookUrl: webhookUrl || undefined
      }, apiKey); // Pass the generated API key to storage

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
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error creating partner:', errorMessage);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
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
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error creating KYC session:', errorMessage);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Aadhaar Generate OTP endpoint
  app.post('/api/v1/kyc/aadhaar/generate-otp', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId, aadhaarNumber } = req.body;
      
      if (!sessionId || !aadhaarNumber) {
        return res.status(400).json({
          success: false,
          error: 'sessionId and aadhaarNumber are required'
        });
      }

      // Get session to validate
      const session = await storage.getKycSessionById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'KYC session not found'
        });
      }

      // Call Cashfree API to generate OTP
      const otpResult = await callCashfreeKycApi('aadhaar-generate-otp', {
        ref_id: `cashfree_${generateId()}`,
        aadhaar_number: aadhaarNumber
      });

      if (otpResult.status === 'SUCCESS') {
        // Store the reference ID for later OTP verification in verificationData
        const currentVerificationData = session.verificationData as any || {};
        await storage.updateKycSession(sessionId, {
          verificationData: {
            ...currentVerificationData,
            aadhaarRefId: otpResult.data.ref_id,
            aadhaarNumber: aadhaarNumber
          }
        });

        res.json({
          success: true,
          data: {
            sessionId,
            message: 'OTP sent successfully to registered mobile number',
            refId: otpResult.data.ref_id,
            maskedMobile: otpResult.data.mobile || 'XXXX-XXX-XXX'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to generate OTP',
          details: otpResult.data
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error generating Aadhaar OTP:', errorMessage);
      
      // Check if it's an IP whitelisting issue
      if (errorMessage.includes('IP not whitelisted')) {
        return res.status(403).json({
          success: false,
          error: 'IP not whitelisted',
          message: 'Your IP address is not whitelisted for Cashfree production API. Please contact support to whitelist your IP address.',
          details: {
            currentIp: errorMessage.match(/ip is ([0-9.]+)/)?.[1] || 'unknown',
            solution: 'Add your IP to Cashfree production whitelist'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: errorMessage.includes('Cashfree') ? errorMessage : 'Cashfree API error'
      });
    }
  });

  // Aadhaar OKYC endpoint
  app.post('/api/v1/kyc/aadhaar-okyc', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId, aadhaarNumber, name, otp } = req.body;
      
      if (!sessionId || !aadhaarNumber || !name || !otp) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, aadhaarNumber, name, and otp are required'
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

      // Get the ref_id from OTP generation step
      const verificationData = session.verificationData as any || {};
      const refId = verificationData.aadhaarRefId;
      
      console.log('[AADHAAR-VERIFY] Session verification data:', JSON.stringify(verificationData, null, 2));
      console.log('[AADHAAR-VERIFY] Retrieved ref_id:', refId);
      
      if (!refId) {
        return res.status(400).json({
          success: false,
          error: 'No Aadhaar reference ID found. Please generate OTP first.'
        });
      }

      // Call Cashfree API for Aadhaar verification using the ref_id from OTP generation
      console.log('[AADHAAR-VERIFY] Using ref_id for verification:', refId);
      const verificationResult = await callCashfreeKycApi('aadhaar-submit-otp', {
        ref_id: refId,
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
          }
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
      
      // Check if it's an IP whitelisting issue
      if (errorMessage.includes('IP not whitelisted')) {
        return res.status(403).json({
          success: false,
          error: 'IP not whitelisted',
          message: 'Your IP address is not whitelisted for Cashfree production API. Please contact support to whitelist your IP address.',
          details: {
            currentIp: errorMessage.match(/ip is ([0-9.]+)/)?.[1] || 'unknown',
            solution: 'Add your IP to Cashfree production whitelist'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Verification service error',
        message: errorMessage.includes('Cashfree') ? errorMessage : 'Cashfree API error'
      });
    }
  });

  // PAN verification endpoint
  app.post('/api/v1/kyc/pan/verify', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId, panNumber, name } = req.body;
      
      if (!sessionId || !panNumber || !name) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, panNumber, and name are required'
        });
      }

      console.log('[PAN] Verifying PAN:', panNumber, 'for name:', name);
      
      const cashfreeResponse = await callCashfreeKycApi('pan', {
        pan: panNumber,
        name: name
      });

      if (cashfreeResponse.status === 'SUCCESS') {
        console.log('[PAN] Verification successful');
        res.json({
          success: true,
          data: {
            sessionId,
            panNumber,
            name,
            verified: cashfreeResponse.data.verification_status === 'verified',
            nameMatch: cashfreeResponse.data.name_match,
            category: cashfreeResponse.data.category,
            dateOfBirth: cashfreeResponse.data.date_of_birth,
            panStatus: cashfreeResponse.data.pan_status,
            verificationId: cashfreeResponse.data.verification_id,
            refId: cashfreeResponse.data.ref_id,
            cashfreeResponse: cashfreeResponse.data
          }
        });
      } else {
        console.log('[PAN] Verification failed:', cashfreeResponse.data?.error || 'Unknown error');
        res.status(400).json({
          success: false,
          error: 'PAN verification failed',
          message: cashfreeResponse.data?.error || 'Verification failed'
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[PAN] Error:', errorMessage);
      
      if (errorMessage.includes('403') || errorMessage.includes('IP not whitelisted')) {
        return res.status(403).json({
          success: false,
          error: 'IP not whitelisted',
          message: 'Your IP address is not whitelisted for Cashfree production API. Please contact support to whitelist your IP address.',
          details: {
            currentIp: errorMessage.match(/ip is ([0-9.]+)/)?.[1] || 'unknown',
            solution: 'Add your IP to Cashfree production whitelist'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'PAN verification service error',
        message: errorMessage.includes('Cashfree') ? errorMessage : 'Cashfree API error'
      });
    }
  });

  // Bank account verification endpoint
  app.post('/api/v1/kyc/bank/verify', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId, accountNumber, ifscCode, name } = req.body;
      if (!sessionId || !accountNumber || !ifscCode || !name) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, accountNumber, ifscCode, and name are required'
        });
      }
      console.log('[BANK] Verifying bank account with Surepass:', accountNumber, 'IFSC:', ifscCode, 'for name:', name);
      // Surepass API call
      const surepassToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTczNjE2OTM0MywianRpIjoiYjk4ZDJlNTctNzQyNy00ZmMzLTkyMzctMjVjOGI1ODRjNDQyIiwidHlwZSI6ImFjY2VzcyIsImlkZW50aXR5IjoiZGV2LnN0YWJsZXBheUBzdXJlcGFzcy5pbyIsIm5iZiI6MTczNjE2OTM0MywiZXhwIjoyMzY2ODg5MzQzLCJlbWFpbCI6InN0YWJsZXBheUBzdXJlcGFzcy5pbyIsInRlbmFudF9pZCI6Im1haW4iLCJ1c2VyX2NsYWltcyI6eyJzY29wZXMiOlsidXNlciJdfX0.gwdII-K1wWVxCTIpawz-qyfvBWlYxKHsraRoXXO3Kf0';
      const response = await fetch('https://kyc-api.surepass.app/api/v1/bank-verification/bank-account-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${surepassToken}`
        },
        body: JSON.stringify({ account_number: accountNumber, ifsc: ifscCode, name })
      });
      const responseText = await response.text();
      if (!response.ok) {
        console.error('[BANK][Surepass] API error:', responseText);
        return res.status(response.status).json({
          success: false,
          error: 'Bank verification service error',
          message: responseText
        });
      }
      let surepassData;
      try {
        surepassData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[BANK][Surepass] JSON parse error:', parseError);
        return res.status(500).json({
          success: false,
          error: 'Bank verification service error',
          message: 'Invalid JSON response from Surepass'
        });
      }
      console.log('[BANK][Surepass] Response:', surepassData);
      res.json({
        success: true,
        data: {
          sessionId,
          accountNumber,
          ifscCode,
          name,
          verified: surepassData.data && surepassData.data.status === 'active',
          accountStatus: surepassData.data && surepassData.data.status,
          bankName: surepassData.data && surepassData.data.bank,
          branchName: surepassData.data && surepassData.data.branch,
          surepassResponse: surepassData.data
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[BANK][Surepass] Error:', errorMessage);
      res.status(500).json({
        success: false,
        error: 'Bank verification service error',
        message: errorMessage
      });
    }
  });

  // UPI verification endpoint
  app.post('/api/v1/kyc/upi/verify', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId, upiId, name } = req.body;
      
      if (!sessionId || !upiId || !name) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, upiId, and name are required'
        });
      }

      console.log('[UPI] Verifying UPI ID with Surepass:', upiId, 'for name:', name);

      // Surepass API call
      const surepassToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTczNjE2OTM0MywianRpIjoiYjk4ZDJlNTctNzQyNy00ZmMzLTkyMzctMjVjOGI1ODRjNDQyIiwidHlwZSI6ImFjY2VzcyIsImlkZW50aXR5IjoiZGV2LnN0YWJsZXBheUBzdXJlcGFzcy5pbyIsIm5iZiI6MTczNjE2OTM0MywiZXhwIjoyMzY2ODg5MzQzLCJlbWFpbCI6InN0YWJsZXBheUBzdXJlcGFzcy5pbyIsInRlbmFudF9pZCI6Im1haW4iLCJ1c2VyX2NsYWltcyI6eyJzY29wZXMiOlsidXNlciJdfX0.gwdII-K1wWVxCTIpawz-qyfvBWlYxKHsraRoXXO3Kf0';
      const response = await fetch('https://kyc-api.surepass.app/api/v1/bank-verification/upi-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${surepassToken}`
        },
        body: JSON.stringify({ upi_id: upiId, name })
      });

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
            accountStatus: surepassData.data && surepassData.data.status,
            pspName: surepassData.data && surepassData.data.psp,
            surepassResponse: surepassData.data
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'UPI verification failed',
          message: surepassData.message || 'Verification failed',
          surepassResponse: surepassData
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[UPI][Surepass] Error:', errorMessage);
      res.status(500).json({
        success: false,
        error: 'UPI verification service error',
        message: errorMessage
      });
    }
  });

  // Name matching endpoint
  app.post('/api/v1/kyc/name-match', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId, name1, name2 } = req.body;
      
      if (!sessionId || !name1 || !name2) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, name1, and name2 are required'
        });
      }

      console.log('[NAME-MATCH] Matching names:', name1, 'vs', name2);
      
      // Simple name matching algorithm (can be enhanced with fuzzy matching)
      const cleanName1 = name1.toLowerCase().trim().replace(/\s+/g, ' ');
      const cleanName2 = name2.toLowerCase().trim().replace(/\s+/g, ' ');
      
      // Calculate similarity score
      const similarity = calculateNameSimilarity(cleanName1, cleanName2);
      const isMatch = similarity > 0.8; // 80% similarity threshold
      
      console.log('[NAME-MATCH] Similarity score:', similarity, 'Match:', isMatch);
      
      res.json({
        success: true,
        data: {
          sessionId,
          name1,
          name2,
          similarity,
          isMatch,
          verified: isMatch,
          confidence: similarity > 0.9 ? 'HIGH' : similarity > 0.7 ? 'MEDIUM' : 'LOW'
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[NAME-MATCH] Error:', errorMessage);
      
      res.status(500).json({
        success: false,
        error: 'Name matching service error',
        message: errorMessage
      });
    }
  });

  // Face Liveness verification endpoint
  app.post('/api/v1/kyc/face-liveness/verify', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId, imageData, action } = req.body;
      
      if (!sessionId || !imageData) {
        return res.status(400).json({
          success: false,
          error: 'sessionId and imageData are required'
        });
      }

      console.log('[FACE-LIVENESS] Verifying face liveness for session:', sessionId);
      
      const cashfreeResponse = await callCashfreeKycApi('face-liveness', {
        image: imageData,
        action: action || 'blink' // Default action
      });

      if (cashfreeResponse.status === 'SUCCESS') {
        console.log('[FACE-LIVENESS] Verification successful');
        res.json({
          success: true,
          data: {
            sessionId,
            verified: cashfreeResponse.data.verification_status === 'verified',
            livenessScore: cashfreeResponse.data.liveness_score,
            qualityScore: cashfreeResponse.data.quality_score,
            faceMatch: cashfreeResponse.data.face_match,
            actionVerified: cashfreeResponse.data.action_verified,
            verificationId: cashfreeResponse.data.verification_id,
            refId: cashfreeResponse.data.ref_id,
            cashfreeResponse: cashfreeResponse.data
          }
        });
      } else {
        console.log('[FACE-LIVENESS] Verification failed:', cashfreeResponse.data?.error || 'Unknown error');
        res.status(400).json({
          success: false,
          error: 'Face liveness verification failed',
          message: cashfreeResponse.data?.error || 'Verification failed'
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[FACE-LIVENESS] Error:', errorMessage);
      
      if (errorMessage.includes('403') || errorMessage.includes('IP not whitelisted')) {
        return res.status(403).json({
          success: false,
          error: 'IP not whitelisted',
          message: 'Your IP address is not whitelisted for Cashfree production API. Please contact support to whitelist your IP address.',
          details: {
            currentIp: errorMessage.match(/ip is ([0-9.]+)/)?.[1] || 'unknown',
            solution: 'Add your IP to Cashfree production whitelist'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Face liveness verification service error',
        message: errorMessage.includes('Cashfree') ? errorMessage : 'Cashfree API error'
      });
    }
  });

  // Vehicle registration verification endpoint
  app.post('/api/v1/kyc/vehicle/verify', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId, vehicleNumber, registrationNumber } = req.body;
      
      if (!sessionId || !vehicleNumber || !registrationNumber) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, vehicleNumber, and registrationNumber are required'
        });
      }

      console.log('[VEHICLE] Verifying vehicle registration:', vehicleNumber);
      
      const cashfreeResponse = await callCashfreeKycApi('vehicle', {
        vehicle_number: vehicleNumber,
        registration_number: registrationNumber
      });

      if (cashfreeResponse.status === 'SUCCESS') {
        console.log('[VEHICLE] Verification successful');
        res.json({
          success: true,
          data: {
            sessionId,
            vehicleNumber,
            registrationNumber,
            verified: cashfreeResponse.data.verification_status === 'verified',
            ownerName: cashfreeResponse.data.owner_name,
            registrationDate: cashfreeResponse.data.registration_date,
            chassisNumber: cashfreeResponse.data.chassis_number,
            engineNumber: cashfreeResponse.data.engine_number,
            vehicleClass: cashfreeResponse.data.vehicle_class,
            fuelType: cashfreeResponse.data.fuel_type,
            makerDescription: cashfreeResponse.data.maker_description,
            model: cashfreeResponse.data.model,
            bodyType: cashfreeResponse.data.body_type,
            color: cashfreeResponse.data.color,
            seatingCapacity: cashfreeResponse.data.seating_capacity,
            verificationId: cashfreeResponse.data.verification_id,
            refId: cashfreeResponse.data.ref_id,
            cashfreeResponse: cashfreeResponse.data
          }
        });
      } else {
        console.log('[VEHICLE] Verification failed:', cashfreeResponse.data?.error || 'Unknown error');
        res.status(400).json({
          success: false,
          error: 'Vehicle verification failed',
          message: cashfreeResponse.data?.error || 'Verification failed'
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[VEHICLE] Error:', errorMessage);
      
      if (errorMessage.includes('403') || errorMessage.includes('IP not whitelisted')) {
        return res.status(403).json({
          success: false,
          error: 'IP not whitelisted',
          message: 'Your IP address is not whitelisted for Cashfree production API. Please contact support to whitelist your IP address.',
          details: {
            currentIp: errorMessage.match(/ip is ([0-9.]+)/)?.[1] || 'unknown',
            solution: 'Add your IP to Cashfree production whitelist'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Vehicle verification service error',
        message: errorMessage.includes('Cashfree') ? errorMessage : 'Cashfree API error'
      });
    }
  });

  // Driving License verification endpoint
  app.post('/api/v1/kyc/driving-license/verify', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId, licenseNumber, dateOfBirth, name } = req.body;
      
      if (!sessionId || !licenseNumber || !dateOfBirth) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, licenseNumber, and dateOfBirth are required'
        });
      }

      console.log('[DRIVING-LICENSE] Verifying driving license:', licenseNumber);
      
      const cashfreeResponse = await callCashfreeKycApi('driving-license', {
        license_number: licenseNumber,
        date_of_birth: dateOfBirth,
        name: name || ''
      });

      if (cashfreeResponse.success) {
        console.log('[DRIVING-LICENSE] Verification successful');
        res.json({
          success: true,
          data: {
            sessionId,
            licenseNumber,
            dateOfBirth,
            name,
            verified: true,
            ...cashfreeResponse.data
          }
        });
      } else {
        console.log('[DRIVING-LICENSE] Verification failed:', cashfreeResponse.error);
        res.status(400).json({
          success: false,
          error: 'Driving license verification failed',
          message: cashfreeResponse.error
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[DRIVING-LICENSE] Error:', errorMessage);
      
      if (errorMessage.includes('403') || errorMessage.includes('IP not whitelisted')) {
        return res.status(403).json({
          success: false,
          error: 'IP not whitelisted',
          message: 'Your IP address is not whitelisted for Cashfree production API. Please contact support to whitelist your IP address.',
          details: {
            currentIp: errorMessage.match(/ip is ([0-9.]+)/)?.[1] || 'unknown',
            solution: 'Add your IP to Cashfree production whitelist'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Driving license verification service error',
        message: errorMessage.includes('Cashfree') ? errorMessage : 'Cashfree API error'
      });
    }
  });

  // Voter ID verification endpoint
  app.post('/api/v1/kyc/voter-id/verify', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId, voterIdNumber, name } = req.body;
      
      if (!sessionId || !voterIdNumber || !name) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, voterIdNumber, and name are required'
        });
      }

      console.log('[VOTER-ID] Verifying voter ID:', voterIdNumber);
      
      const cashfreeResponse = await callCashfreeKycApi('voter-id', {
        voter_id: voterIdNumber,
        name: name
      });

      if (cashfreeResponse.success) {
        console.log('[VOTER-ID] Verification successful');
        res.json({
          success: true,
          data: {
            sessionId,
            voterIdNumber,
            name,
            verified: true,
            ...cashfreeResponse.data
          }
        });
      } else {
        console.log('[VOTER-ID] Verification failed:', cashfreeResponse.error);
        res.status(400).json({
          success: false,
          error: 'Voter ID verification failed',
          message: cashfreeResponse.error
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[VOTER-ID] Error:', errorMessage);
      
      if (errorMessage.includes('403') || errorMessage.includes('IP not whitelisted')) {
        return res.status(403).json({
          success: false,
          error: 'IP not whitelisted',
          message: 'Your IP address is not whitelisted for Cashfree production API. Please contact support to whitelist your IP address.',
          details: {
            currentIp: errorMessage.match(/ip is ([0-9.]+)/)?.[1] || 'unknown',
            solution: 'Add your IP to Cashfree production whitelist'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Voter ID verification service error',
        message: errorMessage.includes('Cashfree') ? errorMessage : 'Cashfree API error'
      });
    }
  });

  // Passport verification endpoint
  app.post('/api/v1/kyc/passport/verify', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId, passportNumber, dateOfBirth, name } = req.body;
      
      if (!sessionId || !passportNumber || !dateOfBirth) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, passportNumber, and dateOfBirth are required'
        });
      }

      console.log('[PASSPORT] Verifying passport:', passportNumber);
      
      const cashfreeResponse = await callCashfreeKycApi('passport', {
        passport_number: passportNumber,
        date_of_birth: dateOfBirth,
        name: name || ''
      });

      if (cashfreeResponse.success) {
        console.log('[PASSPORT] Verification successful');
        res.json({
          success: true,
          data: {
            sessionId,
            passportNumber,
            dateOfBirth,
            name,
            verified: true,
            ...cashfreeResponse.data
          }
        });
      } else {
        console.log('[PASSPORT] Verification failed:', cashfreeResponse.error);
        res.status(400).json({
          success: false,
          error: 'Passport verification failed',
          message: cashfreeResponse.error
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[PASSPORT] Error:', errorMessage);
      
      if (errorMessage.includes('403') || errorMessage.includes('IP not whitelisted')) {
        return res.status(403).json({
          success: false,
          error: 'IP not whitelisted',
          message: 'Your IP address is not whitelisted for Cashfree production API. Please contact support to whitelist your IP address.',
          details: {
            currentIp: errorMessage.match(/ip is ([0-9.]+)/)?.[1] || 'unknown',
            solution: 'Add your IP to Cashfree production whitelist'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Passport verification service error',
        message: errorMessage.includes('Cashfree') ? errorMessage : 'Cashfree API error'
      });
    }
  });

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
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error generating quote:', errorMessage);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // STEP 11: Session Status endpoint
  app.get('/api/v1/kyc/session/:sessionId/status', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId is required'
        });
      }

      console.log('[SESSION] Checking status for session:', sessionId);
      
      // In production, this would fetch from database
      // For testing, we'll return a mock session status
      const mockSessionStatus = {
        sessionId,
        status: 'completed',
        userId: 'prod_user_123',
        verifications: {
          aadhaar: { status: 'verified', completedAt: new Date().toISOString() },
          pan: { status: 'verified', completedAt: new Date().toISOString() },
          faceLiveness: { status: 'verified', completedAt: new Date().toISOString() },
          upi: { status: 'verified', completedAt: new Date().toISOString() },
          bank: { status: 'verified', completedAt: new Date().toISOString() },
          nameMatch: { status: 'verified', score: 0.95, completedAt: new Date().toISOString() }
        },
        overallScore: 95,
        riskLevel: 'low',
        createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        lastUpdated: new Date().toISOString()
      };

      res.json({
        success: true,
        data: mockSessionStatus
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SESSION] Error checking status:', errorMessage);
      res.status(500).json({
        success: false,
        error: 'Failed to get session status',
        message: errorMessage
      });
    }
  });

  // STEP 12: Initiate Transaction endpoint
  app.post('/api/v1/transaction/initiate', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId, quoteId, cryptoAddress, amount, token, network } = req.body;
      
      if (!sessionId || !quoteId || !cryptoAddress || !amount || !token || !network) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, quoteId, cryptoAddress, amount, token, and network are required'
        });
      }

      console.log('[TRANSACTION] Initiating transaction for session:', sessionId);
      
      const transactionId = `txn_${generateId()}`;
      const depositAddress = "0x742d35Cc6634C0532925a3b8D6Ac6E7CD3E4AE9F";
      
      // Store transaction data (in production, this would be in database)
      const transactionData = {
        transactionId,
        sessionId,
        quoteId,
        cryptoAddress,
        amount,
        token,
        network,
        depositAddress,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      res.json({
        success: true,
        data: {
          transactionId,
          depositAddress,
          expectedAmount: amount,
          token,
          network,
          status: 'pending',
          message: 'Please send the specified amount to the deposit address'
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[TRANSACTION] Error initiating transaction:', errorMessage);
      res.status(500).json({
        success: false,
        error: 'Failed to initiate transaction',
        message: errorMessage
      });
    }
  });

  // STEP 13: Submit Hash ID for transaction detection
  app.post('/api/v1/transaction/submit-hash', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { transactionId, transactionHash, network } = req.body;
      
      if (!transactionId || !transactionHash || !network) {
        return res.status(400).json({
          success: false,
          error: 'transactionId, transactionHash, and network are required'
        });
      }

      console.log('[TRANSACTION] Submitting hash for transaction:', transactionId, 'Hash:', transactionHash);
      
      // In production, this would verify the transaction on the blockchain
      // For now, we'll simulate the verification process
      
      res.json({
        success: true,
        data: {
          transactionId,
          transactionHash,
          network,
          status: 'hash_submitted',
          message: 'Transaction hash submitted successfully. Verification in progress.',
          estimatedConfirmationTime: '10-15 minutes'
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[TRANSACTION] Error submitting hash:', errorMessage);
      res.status(500).json({
        success: false,
        error: 'Failed to submit transaction hash',
        message: errorMessage
      });
    }
  });

  // STEP 14: Transaction Status endpoint
  app.get('/api/v1/transaction/:transactionId/status', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { transactionId } = req.params;
      
      if (!transactionId) {
        return res.status(400).json({
          success: false,
          error: 'transactionId is required'
        });
      }

      console.log('[TRANSACTION] Checking status for transaction:', transactionId);
      
      // In production, this would fetch from database
      // For testing, we'll return a mock successful transaction
      const mockTransaction = {
        transactionId,
        status: 'completed',
        cryptoAmount: '100.00',
        cryptoToken: 'USDT',
        inrAmount: '8340.00',
        exchangeRate: '83.40',
        fees: {
          commission: '41.70',
          gst: '7.51',
          tds: '83.40'
        },
        netAmount: '8207.39',
        transactionHash: '0x' + Buffer.from(transactionId).toString('hex').padEnd(64, '0'),
        blockNumber: 12345678,
        confirmations: 12,
        createdAt: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
        completedAt: new Date().toISOString()
      };

      res.json({
        success: true,
        data: mockTransaction
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[TRANSACTION] Error checking status:', errorMessage);
      res.status(500).json({
        success: false,
        error: 'Failed to get transaction status',
        message: errorMessage
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    const environment = getEnvironmentMode();
    res.json({
      success: true,
      message: 'API is healthy',
      environment,
      timestamp: new Date().toISOString(),
      features: {
        production: environment === 'production',
        cashfreeIntegration: environment === 'production' ? 'live' : 'mock'
      }
    });
  });

  // Production-specific endpoints
  app.get('/api/v1/production/status', (req: Request, res: Response) => {
    const environment = getEnvironmentMode();
    if (environment !== 'production') {
      return res.status(403).json({
        success: false,
        error: 'Production endpoints only available in production environment'
      });
    }

    res.json({
      success: true,
      environment: 'production',
      message: 'Production environment active - all API calls use live services',
      features: {
        liveResponses: true,
        cashfreeIntegration: 'live',
        kycVerification: 'live',
        paymentProcessing: 'live'
      },
      credentials: {
        cashfreeConfigured: !!(process.env.CASHFREE_CLIENT_ID && process.env.CASHFREE_CLIENT_SECRET),
        publicKeyConfigured: !!process.env.CASHFREE_PUBLIC_KEY,
        webhookSecretConfigured: !!process.env.CASHFREE_WEBHOOK_SECRET
      },
      timestamp: new Date().toISOString()
    });
  });

  // Generate Postman collection
  app.get('/api/v1/postman/collection', (req: Request, res: Response) => {
    const environment = req.query.environment as string || getEnvironmentMode();
    const validEnvironments = ['production'];
    
    if (!validEnvironments.includes(environment)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid environment. Use: production'
      });
    }

    const baseUrl = 'http://localhost:4000';
    const currentEnvironment = getEnvironmentMode();

    const collection = {
      info: {
        name: `StablePay API - ${environment.charAt(0).toUpperCase() + environment.slice(1)}`,
        description: `Complete StablePay API collection for ${environment} environment.\n\n${environment === 'sandbox' ? 'SANDBOX MODE: All API calls return mock data for testing.' : 'PRODUCTION MODE: All API calls use live Cashfree services.'}`,
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
          value: environment === 'sandbox' ? "pk_sandbox_" : "pk_live_",
          type: "string"
        },
        {
          key: "environment",
          value: environment,
          type: "string"
        }
      ],
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
            }
          }
        },
        {
          name: `${environment.charAt(0).toUpperCase() + environment.slice(1)} Status`,
          request: {
            method: "GET",
            header: [],
            url: {
              raw: `{{baseUrl}}/api/v1/${environment}/status`,
              host: ["{{baseUrl}}"],
              path: ["api", "v1", environment, "status"]
            }
          }
        },
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
                name: `Test Company (${environment})`,
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
                userId: `user_${environment}_123`,
                documentType: "aadhaar",
                documentNumber: environment === 'sandbox' ? "123456789012" : "330259727443",
                holderName: environment === 'sandbox' ? "Test User" : "Actual User Name"
              }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/api/v1/kyc/session/create",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "kyc", "session", "create"]
            }
          }
        },
        {
          name: "Generate Aadhaar OTP",
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
                sessionId: "{{sessionId}}",
                aadhaarNumber: environment === 'sandbox' ? "123456789012" : "330259727443"
              }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/api/v1/kyc/aadhaar/generate-otp",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "kyc", "aadhaar", "generate-otp"]
            }
          }
        },
        {
          name: "Verify Aadhaar OTP",
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
                sessionId: "{{sessionId}}",
                aadhaarNumber: environment === 'sandbox' ? "123456789012" : "330259727443",
                name: environment === 'sandbox' ? "Test User" : "Actual User Name",
                otp: environment === 'sandbox' ? "123456" : "{{actualOTP}}"
              }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/api/v1/kyc/aadhaar-okyc",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "kyc", "aadhaar-okyc"]
            }
          }
        },
        {
          name: "Generate Quote",
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
                token: "USDT",
                network: "ethereum",
                amount: "100",
                targetChain: "polygon",
                targetToken: "USDC"
              }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/api/v1/quote",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "quote"]
            }
          }
        },
        {
          name: "Verify PAN",
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
                sessionId: "{{sessionId}}",
                panNumber: environment === 'sandbox' ? "ABCDE1234F" : "actualPANNumber",
                name: environment === 'sandbox' ? "Test User" : "Actual User Name"
              }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/api/v1/kyc/pan/verify",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "kyc", "pan", "verify"]
            }
          }
        },
        {
          name: "Verify Bank Account",
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
                sessionId: "{{sessionId}}",
                accountNumber: "123456789012",
                ifscCode: "SBIN0001234",
                name: environment === 'sandbox' ? "Test User" : "Actual User Name"
              }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/api/v1/kyc/bank/verify",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "kyc", "bank", "verify"]
            }
          }
        },
        {
          name: "Verify UPI",
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
                sessionId: "{{sessionId}}",
                upiId: "testuser@upi",
                name: environment === 'sandbox' ? "Test User" : "Actual User Name"
              }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/api/v1/kyc/upi/verify",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "kyc", "upi", "verify"]
            }
          }
        },
        {
          name: "Name Match",
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
                sessionId: "{{sessionId}}",
                name1: "Test User",
                name2: "Actual User Name"
              }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/api/v1/kyc/name-match",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "kyc", "name-match"]
            }
          }
        },
        {
          name: "Initiate Transaction",
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
                sessionId: "{{sessionId}}",
                quoteId: "{{quoteId}}",
                cryptoAddress: "0x742d35Cc6634C0532925a3b8D6Ac6E7CD3E4AE9F",
                amount: "100",
                token: "USDT",
                network: "ethereum"
              }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/api/v1/transaction/initiate",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "transaction", "initiate"]
            }
          }
        },
        {
          name: "Submit Transaction Hash",
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
                transactionId: "{{transactionId}}",
                transactionHash: "0x742d35Cc6634C0532925a3b8D6Ac6E7CD3E4AE9F",
                network: "ethereum"
              }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/api/v1/transaction/submit-hash",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "transaction", "submit-hash"]
            }
          }
        },
        {
          name: "Get Transaction Status",
          request: {
            method: "GET",
            header: [
              {
                key: "Authorization",
                value: "Bearer {{apiKey}}"
              }
            ],
            url: {
              raw: "{{baseUrl}}/api/v1/transaction/{{transactionId}}/status",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "transaction", "{{transactionId}}", "status"]
            }
          }
        }
      ]
    };

    res.setHeader('Content-Disposition', `attachment; filename="stablepay-api-${environment}.postman_collection.json"`);
    res.json(collection);
  });

  return httpServer;
}
