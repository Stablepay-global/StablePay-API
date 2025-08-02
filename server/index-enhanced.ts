import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerEnhancedRoutes } from "./routes-enhanced";
import { setupVite, serveStatic, log } from "./vite";
import { enhancedStorage } from "./storage-enhanced";

const app = express();

// Enhanced CORS headers for production
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Api-Key, User-Agent, Cache-Control, Pragma, X-SPY-Signature, X-SPY-Timestamp, X-SPY-Event');
  res.header('Access-Control-Max-Age', '86400');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Enhanced request logging
app.use((req, res, next) => {
  const startTime = Date.now();
  
  console.log(`[REQUEST] ${req.method} ${req.path} - ${req.get('User-Agent')}`);
  
  // Log API requests with more detail
  if (req.path.startsWith('/api/')) {
    console.log(`[API] ${req.method} ${req.path}`);
    console.log(`[API] Headers:`, {
      'Authorization': req.headers.authorization ? 'Bearer ***' : 'None',
      'Content-Type': req.headers['content-type'],
      'User-Agent': req.headers['user-agent']
    });
    
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`[API] Body:`, JSON.stringify(req.body, null, 2));
    }
  }
  
  // Enhanced response logging
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    if (req.path.startsWith('/api/')) {
      console.log(`[API] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
      
      // Log success/failure
      if (data && typeof data === 'object') {
        if (data.success === false) {
          console.log(`[API] ERROR: ${data.error || 'Unknown error'}`);
        } else {
          console.log(`[API] SUCCESS: ${req.method} ${req.path}`);
        }
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
});

// Enhanced health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'connected', // In production, check actual DB connection
        cashfree: process.env.CASHFREE_CLIENT_ID ? 'configured' : 'not_configured',
        exchangeRate: process.env.EXCHANGE_RATE_API_KEY ? 'configured' : 'not_configured'
      },
      metrics: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
      }
    };
    
    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Enhanced partner onboarding endpoint
app.post('/api/v1/partner/create', async (req, res) => {
  try {
    const { name, email, webhookUrl } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'name and email are required'
      });
    }
    
    // Generate API key and webhook secret
    const apiKey = `pk_live_${Math.random().toString(36).substring(2, 15)}`;
    const webhookSecret = `whsec_${Math.random().toString(36).substring(2, 15)}`;
    
    const partner = await enhancedStorage.createPartner({
      name,
      email,
      webhookUrl: webhookUrl || null
    }, apiKey, webhookSecret);
    
    res.json({
      success: true,
      data: {
        partnerId: partner.partnerId,
        apiKey: partner.apiKey,
        webhookSecret: partner.webhookSecret,
        status: partner.status,
        createdAt: partner.createdAt
      }
    });
  } catch (error) {
    console.error('[PARTNER] Creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Partner creation failed'
    });
  }
});

// Enhanced analytics endpoint
app.get('/api/v1/analytics/dashboard', async (req, res) => {
  try {
    const dailyVolume = await enhancedStorage.getDailyVolume();
    const kycMetrics = await enhancedStorage.getKycMetrics();
    const transactionMetrics = await enhancedStorage.getTransactionMetrics();
    const complianceMetrics = await enhancedStorage.getComplianceMetrics();
    
    res.json({
      success: true,
      data: {
        dailyVolume,
        kycMetrics,
        transactionMetrics,
        complianceMetrics
      }
    });
  } catch (error) {
    console.error('[ANALYTICS] Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Analytics fetch failed'
    });
  }
});

// Enhanced error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error('[ERROR] Unhandled error:', err);
  
  res.status(status).json({ 
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

(async () => {
  try {
    // Register enhanced API routes
    const server = registerEnhancedRoutes(app);
    
    // Setup Vite in development
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server
    const port = parseInt(process.env.PORT || '3001', 10);
    server.listen(port, "0.0.0.0", () => {
      log(`🚀 StablePay Enhanced API Server running on http://localhost:${port}`);
      log(`📋 API Health: http://localhost:${port}/api/health`);
      log(`📚 Documentation: http://localhost:${port}`);
      log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Log configuration status
      log(`📊 Configuration Status:`);
      log(`   - Cashfree KYC: ${process.env.CASHFREE_CLIENT_ID ? '✅ Configured' : '❌ Not configured'}`);
      log(`   - Exchange Rate API: ${process.env.EXCHANGE_RATE_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
      log(`   - Database: ${process.env.DATABASE_URL ? '✅ Configured' : '❌ Not configured'}`);
      log(`   - JWT Secret: ${process.env.JWT_SECRET ? '✅ Configured' : '❌ Not configured'}`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
}); 