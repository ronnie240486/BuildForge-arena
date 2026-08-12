import type { Express, Request } from "express";
import { appendWorkerLog, claimBuildForWorker, completeWorkerBuild, heartbeatWorker, uploadWorkerArtifact } from "./buildforge-db";

function readWorkerToken(request: Request) {
  const authorization = request.header("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim();
  const bodyToken = typeof request.body?.token === "string" ? request.body.token : "";
  return bodyToken.trim();
}

function sendError(res: Parameters<Express["post"]>[1] extends (req: any, res: infer R) => any ? R : never, error: unknown) {
  const message = error instanceof Error ? error.message : "Operação de worker inválida.";
  res.status(message.includes("inválido") || message.includes("não está atribuído") ? 401 : 400).json({ error: message });
}

export function registerWorkerApi(app: Express) {
  app.post("/api/worker/heartbeat", async (req, res) => {
    try {
      const token = readWorkerToken(req);
      if (!token) return res.status(401).json({ error: "Token de worker ausente." });
      const activeBuilds = typeof req.body?.activeBuilds === "number" ? req.body.activeBuilds : undefined;
      return res.json(await heartbeatWorker({ token, activeBuilds }));
    } catch (error) {
      return sendError(res as never, error);
    }
  });

  app.post("/api/worker/claim", async (req, res) => {
    try {
      const token = readWorkerToken(req);
      if (!token) return res.status(401).json({ error: "Token de worker ausente." });
      return res.json(await claimBuildForWorker(token));
    } catch (error) {
      return sendError(res as never, error);
    }
  });

  app.post("/api/worker/log", async (req, res) => {
    try {
      const token = readWorkerToken(req);
      const { buildId, sequence, level, message, progress } = req.body ?? {};
      if (!token || !Number.isInteger(buildId) || !Number.isInteger(sequence) || typeof level !== "string" || typeof message !== "string") return res.status(400).json({ error: "Payload de log inválido." });
      await appendWorkerLog({ token, buildId, sequence, level, message, progress: typeof progress === "number" ? progress : undefined });
      return res.json({ success: true });
    } catch (error) {
      return sendError(res as never, error);
    }
  });

  app.post("/api/worker/complete", async (req, res) => {
    try {
      const token = readWorkerToken(req);
      const { buildId, status, summary, appliedFixIds, artifactId } = req.body ?? {};
      if (!token || !Number.isInteger(buildId) || !["succeeded", "failed", "cancelled"].includes(status)) return res.status(400).json({ error: "Payload de conclusão inválido." });
      await completeWorkerBuild({ token, buildId, status, summary: typeof summary === "string" ? summary : undefined, appliedFixIds: Array.isArray(appliedFixIds) ? appliedFixIds.filter((id) => Number.isInteger(id)).slice(0, 3) : undefined, artifactId: Number.isInteger(artifactId) ? artifactId : undefined });
      return res.json({ success: true });
    } catch (error) {
      return sendError(res as never, error);
    }
  });

  app.post("/api/worker/artifact", async (req, res) => {
    try {
      const token = readWorkerToken(req);
      const { buildId, type, filename, contentType, contentBase64 } = req.body ?? {};
      if (!token || !Number.isInteger(buildId) || !["apk", "aab", "log"].includes(type) || typeof filename !== "string" || typeof contentType !== "string" || typeof contentBase64 !== "string") return res.status(400).json({ error: "Payload de artefato inválido." });
      return res.json(await uploadWorkerArtifact({ token, buildId, type, filename, contentType, contentBase64 }));
    } catch (error) {
      return sendError(res as never, error);
    }
  });
}
