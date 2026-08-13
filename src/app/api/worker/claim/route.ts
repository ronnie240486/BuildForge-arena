import { db } from "@/db";
import { builds, projects, buildWorkers } from "@/db/schema";
import { authWorker } from "@/lib/worker-auth";
import { and, eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// A worker polls this endpoint to claim the next queued REAL build for the owner.
export async function POST(req: Request) {
  const worker = await authWorker(req);
  if (!worker) return Response.json({ error: "Invalid worker token" }, { status: 401 });

  // heartbeat
  const meta = await req.json().catch(() => ({}));
  await db
    .update(buildWorkers)
    .set({
      online: true,
      lastSeen: new Date(),
      os: meta.os ?? worker.os,
      toolchain: meta.toolchain ?? worker.toolchain,
    })
    .where(eq(buildWorkers.id, worker.id));

  // Find the oldest queued real build for a project owned by this worker's owner.
  const rows = await db
    .select({ build: builds, project: projects })
    .from(builds)
    .innerJoin(projects, eq(builds.projectId, projects.id))
    .where(and(eq(builds.status, "queued"), eq(builds.mode, "real"), eq(projects.ownerId, worker.ownerId)))
    .orderBy(asc(builds.createdAt))
    .limit(1);

  if (rows.length === 0) return Response.json({ job: null });

  const { build, project } = rows[0];
  // Atomically claim it.
  const claimed = await db
    .update(builds)
    .set({ status: "running", startedAt: new Date(), workerId: worker.id, progress: 5 })
    .where(and(eq(builds.id, build.id), eq(builds.status, "queued")))
    .returning();

  if (claimed.length === 0) return Response.json({ job: null }); // lost the race

  return Response.json({
    job: {
      buildId: build.id,
      target: build.target,
      variant: build.variant,
      project: {
        name: project.name,
        framework: project.framework,
        repoUrl: project.repoUrl,
        branch: project.branch,
        packageName: project.packageName,
        aiGenerated: project.aiGenerated,
        source: project.source,
        appName: project.appName,
        webUrl: project.webUrl,
      },
    },
  });
}
