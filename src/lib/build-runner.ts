import { db } from "@/db";
import { builds, projects, artifacts, aiInsights, signingConfigs, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { planBuild } from "@/lib/engine";
import type { ProjectDetection } from "@/db/schema";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// In-memory registry ensures only one simulation runs per build, even across
// concurrent SSE connections on the same server instance.
const runners = new Map<string, Promise<void>>();

export function executeBuild(buildId: string): Promise<void> {
  const existing = runners.get(buildId);
  if (existing) return existing;
  const p = (async () => {
    try {
      await runSimulation(buildId);
    } catch (err) {
      console.error("[build-runner] simulation failed", err);
      await db
        .update(builds)
        .set({ status: "failed", completedAt: new Date(), summary: "Internal simulation error." })
        .where(eq(builds.id, buildId));
    } finally {
      runners.delete(buildId);
    }
  })();
  runners.set(buildId, p);
  return p;
}

async function runSimulation(buildId: string) {
  const [build] = await db.select().from(builds).where(eq(builds.id, buildId)).limit(1);
  if (!build) return;
  if (["success", "failed", "canceled"].includes(build.status)) return;

  const [project] = await db.select().from(projects).where(eq(projects.id, build.projectId)).limit(1);
  if (!project) return;
  const [sig] = await db.select().from(signingConfigs).where(eq(signingConfigs.projectId, project.id)).limit(1);

  const plan = planBuild({
    framework: project.framework,
    target: build.target,
    variant: build.variant,
    language: project.language ?? "",
    detection: (project.detection as ProjectDetection | null) ?? null,
    signingConfigured: sig?.configured ?? false,
    cacheHit: build.cacheHit ?? false,
  });

  const startedAt = build.startedAt ?? new Date();
  await db.update(builds).set({ status: "running", startedAt }).where(eq(builds.id, buildId));

  let log = "";
  for (const frame of plan.frames) {
    log += frame.line + "\n";
    await db.update(builds).set({ log, progress: frame.progress }).where(eq(builds.id, buildId));
    await sleep(frame.delayMs);
  }

  const completedAt = new Date();
  await db
    .update(builds)
    .set({
      status: plan.outcome,
      progress: plan.outcome === "success" ? 100 : 60,
      summary: plan.summary,
      durationMs: plan.durationMs,
      completedAt,
      log,
    })
    .where(eq(builds.id, buildId));

  await db
    .update(projects)
    .set({ status: plan.outcome === "success" ? "ready" : "failed", lastBuildAt: completedAt })
    .where(eq(projects.id, project.id));

  if (plan.outcome === "success") {
    for (const a of plan.artifacts) {
      await db.insert(artifacts).values({
        buildId,
        name: a.name,
        type: a.type,
        sizeBytes: a.sizeBytes,
        signed: a.signed,
      });
    }
  } else if (plan.outcome === "failed" && plan.scenario) {
    const ins = plan.scenario.insight;
    await db.insert(aiInsights).values({
      buildId,
      severity: ins.severity,
      title: ins.title,
      errorCode: plan.scenario.code,
      explanation: ins.explanation,
      suggestion: ins.suggestion,
      autoFixable: ins.autoFixable,
    });
  }

  await db.insert(notifications).values({
    userId: build.userId,
    type: "build",
    title: plan.outcome === "success" ? "Build concluído" : "Build falhou",
    message:
      plan.outcome === "success"
        ? `${build.target.toUpperCase()} ${build.variant} de ${project.name}: ${plan.artifacts.length} artefato(s) gerado(s).`
        : `${build.target.toUpperCase()} ${build.variant} de ${project.name}: ${plan.scenario?.insight.title}.`,
  });
}
