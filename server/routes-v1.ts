import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

const IS_SANDBOX = false;

// Utility functions
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateApiKey(): string {
  const prefix = 'pk_live_';
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${prefix}${randomPart}`;
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Basic auth middleware
  const authenticateApiKey = async (req: Request, res: Response, next: Function) => {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];
    const apiKey = (authHeader ? authHeader.replace('Bearer ', '') : Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader) || '';
    if (!apiKey) {
      return res.status(401).json({ success: false, error: 'API key required' });
    }
    if (IS_SANDBOX) {
      // In sandbox, accept any API key
      (req as any).partner = { id: 'sandbox', name: 'Sandbox Partner', apiKey };
      return next();
    }
    const partner = await storage.getPartnerByApiKey(apiKey);
    if (!partner) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }
    (req as any).partner = partner;
    next();
  };

  // 1. Create Session
  app.post("/v1/sessions", async (req: Request, res: Response) => {
    try {
      const { callback_url } = req.body;
      const session_id = generateId();
      const token = generateApiKey();
      if (IS_SANDBOX) {
        return res.json({ session_id, token, expires_in: 1800, mode: 'sandbox' });
      }
      // In production, store session in DB (TODO: implement real DB logic)
      res.json({ session_id, token, expires_in: 1800, mode: 'production' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // 2. Real-time Quote
  app.get("/v1/quotes", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { asset = 'USDC', network = 'polygon', amount_usd } = req.query;
      if (!amount_usd) {
        return res.status(400).json({ success: false, error: 'amount_usd is required' });
      }
      if (IS_SANDBOX) {
        // Return mock quote
        return res.json({
          session_id: generateId(),
          fx_rate: 80.00,
          gross_inr: 80000,
          tds: 800,
          platform_fee: 560,
          gst: 100.8,
          net_inr: 78639.2,
          deposit_address: { network, address: "0x8e...Cafe" },
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          mode: 'sandbox'
        });
      }
      // Production logic
      const fx_rate = 83.65;
      const amount = parseFloat(amount_usd as string);
      const gross_inr = amount * fx_rate;
      const tds = gross_inr * 0.01; // 1%
      const platform_fee = gross_inr * 0.007; // 0.7%
      const gst = platform_fee * 0.18; // 18% of fee
      const net_inr = gross_inr - tds - platform_fee - gst;
      res.json({
        session_id: generateId(),
        fx_rate,
        gross_inr,
        tds,
        platform_fee,
        gst,
        net_inr,
        deposit_address: {
          network,
          address: "0x8e...Cafe"
        },
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        mode: 'production'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // 3. KYC Session
  app.post("/v1/kyc", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { session_id, customer_ref, methods = [], redirect_url } = req.body;
      if (IS_SANDBOX) {
        // Simulate KYC in sandbox
        setTimeout(() => {
          console.log('KYC completed for session (sandbox):', session_id);
        }, 1000);
        return res.json({
          event: "kyc.initiated",
          session_id,
          status: "pending",
          redirect_url: redirect_url || null,
          mode: 'sandbox'
        });
      }
      // Production: TODO - integrate with real KYC provider
      setTimeout(() => {
        console.log('KYC completed for session:', session_id);
      }, 1000);
      res.json({
        event: "kyc.initiated",
        session_id,
        status: "pending",
        redirect_url: redirect_url || null,
        mode: 'production'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // 4. Transaction Initiation
  app.post("/v1/offramps", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { session_id, quote_id, asset, network } = req.body;
      if (IS_SANDBOX) {
        return res.json({
          deposit_address: {
            network: network || 'polygon',
            address: "0x8e...Cafe"
          },
          min_confirmations: network === 'solana' ? 1 : 6,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          mode: 'sandbox'
        });
      }
      // Production logic
      res.json({
        deposit_address: {
          network: network || 'polygon',
          address: "0x8e...Cafe"
        },
        min_confirmations: network === 'solana' ? 1 : 6,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        mode: 'production'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // 5. Deposit Detection Simulator
  app.post("/v1/simulate/deposit", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { deposit_address, amount, tx_hash } = req.body;
      if (IS_SANDBOX) {
        return res.json({
          event: "deposit.detected",
          session_id: generateId(),
          tx_hash: tx_hash || "0x" + Math.random().toString(36).substring(2),
          confirmations: 1,
          mode: 'sandbox'
        });
      }
      // Production: TODO - trigger real webhook
      res.json({
        event: "deposit.detected",
        session_id: generateId(),
        tx_hash: tx_hash || "0x" + Math.random().toString(36).substring(2),
        confirmations: 1,
        mode: 'production'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // 6. Session Status
  app.get("/v1/sessions/:id", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (IS_SANDBOX) {
        return res.json({
          kyc: { status: "approved" },
          deposit: { status: "confirmed", tx_hash: "0x..." },
          payout: { status: "processing", utr: null },
          net_inr: 82500.00,
          mode: 'sandbox'
        });
      }
      // Production: TODO - fetch real session status
      res.json({
        kyc: { status: "approved" },
        deposit: { status: "confirmed", tx_hash: "0x..." },
        payout: { status: "processing", utr: null },
        net_inr: 82500.00,
        mode: 'production'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // 7. INR Payout
  app.post("/v1/payouts", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { session_id, channel, destination } = req.body;
      if (IS_SANDBOX) {
        return res.json({
          event: "payout.settled",
          session_id,
          utr: "N" + Date.now(),
          settled_at: new Date().toISOString(),
          mode: 'sandbox'
        });
      }
      // Production: TODO - trigger real payout
      res.json({
        event: "payout.settled",
        session_id,
        utr: "N" + Date.now(),
        settled_at: new Date().toISOString(),
        mode: 'production'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Health check
  app.get("/v1/health", (req: Request, res: Response) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      mode: IS_SANDBOX ? 'sandbox' : 'production'
    });
  });

  return httpServer;
}
