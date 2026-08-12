import { db } from "@/db";
import { builds, projects, artifacts, buildWorkers, notifications, aiInsights } from "@/db/schema";
import { authWorker } from "@/lib/worker-auth";
import { analyzeBuildLog } from "@/lib/engine";
import { eq, sql } from "drizzle-orm";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The worker posts the final result here, including the REAL binary (base64).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const worker = await authWorker(req);
  if (!worker) return Response.json({ error: "Invalid worker token" }, { status: 401 });
  const { id } = await params;

  const [b] = await db.select().from(builds).where(eq(builds.id, id)).limit(1);
  if (!b || b.workerId !== worker.id) return Response.json({ error: "Not your build" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid body" }, { status: 400 });

  const success = body.status === "success";
  const durationMs = typeof body.durationMs === "number" ? body.durationMs : null;
  const finalLog = typeof body.log === "string" ? body.log : "";

  await db
    .update(builds)
    .set({
      status: success ? "success" : "failed",
      progress: success ? 100 : 60,
      completedAt: new Date(),
      durationMs,
      summary: success ? "Build real concluído no worker externo." : body.summary || "Build real falhou no worker.",
      ...(finalLog ? { log: b.log + finalLog } : {}),
    })
    .where(eq(builds.id, id));

  const [project] = await db.select().from(projects).where(eq(projects.id, b.projectId)).limit(1);

  if (success && body.artifact?.dataBase64) {
    const raw = Buffer.from(String(body.artifact.dataBase64), "base64");
    const sha = createHash("sha256").update(raw).digest("hex");
    await db.insert(artifacts).values({
      buildId: id,
      name: String(body.artifact.name || "app-release.apk"),
      type: (body.artifact.type || b.target) as typeof artifacts.$inferInsert.type,
      sizeBytes: raw.length,
      signed: Boolean(body.artifact.signed),
      realData: raw.toString("base64"),
      sha256: sha,
    });
  }

  // On failure, analyze the REAL log and store an actionable AI insight.
  if (!success) {
    const fullLog = b.log + finalLog;
    const insight = analyzeBuildLog(fullLog);
    await db.insert(aiInsights).values({
      buildId: id,
      severity: insight.severity,
      title: insight.title,
      errorCode: insight.errorCode,
      explanation: insight.explanation,
      suggestion: insight.suggestion,
      autoFixable: insight.autoFixable,
    });
  }

  await db
    .update(projects)
    .set({ status: success ? "ready" : "failed", lastBuildAt: new Date() })
    .where(eq(projects.id, b.projectId));

  await db
    .update(buildWorkers)
    .set({ buildsRun: sql`${buildWorkers.buildsRun} + 1`, lastSeen: new Date() })
    .where(eq(buildWorkers.id, worker.id));

  await db.insert(notifications).values({
    userId: b.userId,
    type: "build",
    title: success ? "APK real pronto ✅" : "Build real falhou",
    message: success
      ? `${project?.name}: binário compilado e assinado no worker ${worker.name}.`
      : `${project?.name}: o worker ${worker.name} reportou falha.`,
  });

  return Response.json({ ok: true });
}
