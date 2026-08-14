import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerWorkerApi } from "../worker-api";
import { registerBuildStream } from "../build-stream";
import { executeBuildSchedule, getStudioPreviewByToken } from "../buildforge-db";
import { createStudioPreviewDocument } from "../studio-preview";
import { sdk } from "./sdk";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerWorkerApi(app);
  registerBuildStream(app);
  app.get("/studio/preview/:token", async (req, res) => {
    try {
      const preview = await getStudioPreviewByToken(req.params.token);
      if (!preview) return res.status(404).send("Prévia não encontrada.");
      const html = createStudioPreviewDocument(preview);
      res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: https:; font-src https: data:; base-uri 'none'; form-action 'none'");
      return res.type("html").send(html);
    } catch {
      return res.status(500).send("Não foi possível gerar a prévia temporária.");
    }
  });
  app.post("/api/scheduled/build", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const result = await executeBuildSchedule(user.taskUid);
      return res.json({ ok: true, ...result });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString(), context: { url: req.originalUrl } });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
