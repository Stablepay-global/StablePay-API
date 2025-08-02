import { InlineConfig, createLogger, createServer as createViteServer } from "vite";
import type { Express } from "express";
import { createServer, type Server } from "http";
import viteConfig from "../vite.config";
import path from "path";
import fs from "fs";
import express from "express";

export const setupVite = async (app: Express, server: Server) => {
const viteLogger = createLogger();
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const template = await vite.transformIndexHtml(url, "");
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e: any) {
      !e.server && vite.ssrFixStacktrace(e);
      next(e);
    }
  });
};

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html only for non-API routes
  app.use((req, res, next) => {
    // Don't catch API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    // Serve index.html for all other routes (SPA routing)
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
