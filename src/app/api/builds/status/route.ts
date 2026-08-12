import { db } from "@/db";
import { builds, projects, artifacts } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, desc, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Lightweight polling endpoint: returns current status/progress of the user's
// builds so lists/pages can update in real time without a full page refresh.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const myProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.ownerId, user.id));
  const ids = myProjects.map((p) => p.id);
  if (!ids.length) return Response.json({ builds: [] });

  const rows = await db
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
    .limit(40);

  return Response.json({ builds: rows });
}
