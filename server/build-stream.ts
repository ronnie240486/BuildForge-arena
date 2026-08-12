import type { Express } from "express";
import { and, asc, eq, gt } from "drizzle-orm";
import { buildLogs, builds, projects } from "../drizzle/schema";
import { getDb } from "./db";
import { createContext } from "./_core/context";

export function registerBuildStream(app: Express) {
  app.get("/api/builds/:buildId/stream", async (req, res) => {
    const buildId = Number(req.params.buildId);
    if (!Number.isInteger(buildId) || buildId <= 0) return res.status(400).json({ error: "Build inválido." });
    const ctx = await createContext({ req, res } as never);
    if (!ctx.user) return res.status(401).json({ error: "Autenticação necessária." });
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Banco de dados indisponível." });
    const [build] = await db.select({ id: builds.id, status: builds.status, progress: builds.progress, ownerId: projects.ownerId, summary: builds.summary }).from(builds).innerJoin(projects, eq(builds.projectId, projects.id)).where(eq(builds.id, buildId)).limit(1);
    if (!build || (ctx.user.role !== "admin" && build.ownerId !== ctx.user.id)) return res.status(404).json({ error: "Build não encontrado." });

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    let lastSequence = 0;
    let closed = false;
    const send = async () => {
      if (closed) return;
      const [current] = await db.select({ status: builds.status, progress: builds.progress, summary: builds.summary }).from(builds).where(eq(builds.id, buildId)).limit(1);
      const logs = await db.select({ sequence: buildLogs.sequence, level: buildLogs.level, message: buildLogs.message, createdAt: buildLogs.createdAt }).from(buildLogs).where(and(eq(buildLogs.buildId, buildId), gt(buildLogs.sequence, lastSequence))).orderBy(asc(buildLogs.sequence)).limit(100);
      if (logs.length) lastSequence = logs[logs.length - 1].sequence;
      res.write(`event: build\ndata: ${JSON.stringify({ build: current, logs })}\n\n`);
    };
    try {
      await send();
    } catch (error) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : "Falha ao ler logs." })}\n\n`);
    }
    const keepAlive = setInterval(() => { if (!closed) res.write(": keep-alive\n\n"); }, 15_000);
    const interval = setInterval(() => { void send().catch(() => undefined); }, 2_000);
    req.on("close", () => { closed = true; clearInterval(interval); clearInterval(keepAlive); res.end(); });
  });
}
