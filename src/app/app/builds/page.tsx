import { db } from "@/db";
import { builds, projects, artifacts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { inArray, desc, eq, sql } from "drizzle-orm";
import { LiveBuilds, type LiveBuild } from "@/components/live-builds";

export const dynamic = "force-dynamic";

export default async function BuildsPage() {
  const me = await requireUser();
  const myProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.ownerId, me.id));
  const ids = myProjects.map((p) => p.id);

  const rows = ids.length
    ? await db
        .select({
          id: builds.id,
          status: builds.status,
          progress: builds.progress,
          target: builds.target,
          variant: builds.variant,
          projectName: projects.name,
          framework: projects.framework,
          durationMs: builds.durationMs,
          createdAt: builds.createdAt,
          artifactCount: sql<number>`(select count(*)::int from ${artifacts} where ${artifacts.buildId} = ${builds.id})`,
        })
        .from(builds)
        .innerJoin(projects, eq(builds.projectId, projects.id))
        .where(inArray(builds.projectId, ids))
        .orderBy(desc(builds.createdAt))
        .limit(40)
    : [];

  const initial: LiveBuild[] = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <LiveBuilds initial={initial} />
    </div>
  );
}
