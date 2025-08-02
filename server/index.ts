import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerEnhancedRoutes } from "./routes-enhanced";
import { setupVite, serveStatic } from "./vite";

const app = express();

const log = (message: string) => {
  const prefix = process.env.LOG_PREFIX || '[express]';
  console.log(`${new Date().toLocaleTimeString()} ${prefix} ${message}`);
};

// Enhanced CORS headers specifically for Postman compatibility
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Api-Key, User-Agent, Cache-Control, Pragma');
  res.header('Access-Control-Max-Age', '86400');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Add explicit Postman-friendly headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  
  // Handle preflight requests immediately
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
  });
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add comprehensive request logging to debug the issue
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`);
  
  // Special logging for any KYC requests
  if (req.path.includes('/kyc/')) {
    console.log(`[KYC-REQUEST] ${req.method} ${req.path}`);
  }
  
  // Critical logging for Aadhaar OTP requests
  if (req.path === '/api/v1/kyc/aadhaar/generate-otp') {
    console.log(`[CRITICAL] EXACT MATCH: ${req.method} ${req.path}`);
    console.log(`[CRITICAL] Headers:`, req.headers);
    console.log(`[CRITICAL] Body:`, req.body);
    console.log(`[CRITICAL] This request should hit the production route!`);
  }
  
  // Additional logging for all API requests
  if (req.path.startsWith('/api/')) {
    console.log(`[API-REQUEST] ${req.method} ${req.path}`);
  }
  
  next();
  });
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    // Block mock response patterns in production
    if (data && data.data && data.data.requestId) {
      const requestId = data.data.requestId;
      if (requestId.match(/^req_\d+_[a-z0-9]+$/)) {
        console.log(`[PRODUCTION-BLOCK] Intercepted mock response: ${requestId}`);
        console.log(`[PRODUCTION-BLOCK] Full response data:`, JSON.stringify(data, null, 2));
        return originalJson.call(this, {
          success: false,
          error: "PRODUCTION_MODE_ACTIVE",
          message: "Mock responses disabled - system using real Cashfree API integration only"
        });
      }
    }
    return originalJson.call(this, data);
  };
  next();
});

// Production mode headers - no mock responses allowed
app.use((req, res, next) => {
  res.header('X-Production-Mode', 'true');
  res.header('X-Cashfree-Integration', 'live');
  next();
});

// Add a simple test endpoint before all middleware
app.get('/test', (req, res) => {
  console.log('Test endpoint hit');
  res.send('Test OK');
});

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  console.log('Health endpoint hit');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Content-Type', 'application/json');
  
  res.json({
    success: true,
    message: "API is healthy",
    timestamp: new Date().toISOString()
  });
});

// Request logging middleware for API debugging
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    (req as any).startTime = Date.now();
    }
  next();
});
    
// Ensure API routes are properly handled
app.use('/api/*', (req, res, next) => {
    const originalJson = res.json;
    res.json = function(body) {
      if (req.path.startsWith('/api/')) {
        const logLine = `${req.method} ${req.path} ${res.statusCode} in ${Date.now() - (req as any).startTime}ms :: ${JSON.stringify(body).substring(0, 100)}${JSON.stringify(body).length > 100 ? '…' : ''}`;
        log(logLine);
      }
      return originalJson.call(this, body);
    };
  next();
});

(async () => {
  // Register API routes BEFORE setting up static serving
  const server = await registerEnhancedRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve on local port for development
  const port = parseInt(process.env.PORT || '4000', 10);
  server.listen(port, "0.0.0.0", () => {
    log(`🚀 StablePay API Server running on http://localhost:${port}`);
    log(`📋 API Health: http://localhost:${port}/api/health`);
    log(`📚 Documentation: http://localhost:${port}`);
  });
})();