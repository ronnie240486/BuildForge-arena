import { db } from "@/db";
import { projects, builds } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      framework: projects.framework,
      language: projects.language,
      source: projects.source,
      repoUrl: projects.repoUrl,
      status: projects.status,
      healthScore: projects.healthScore,
      createdAt: projects.createdAt,
      buildCount: sql<number>`(select count(*)::int from ${builds} where ${builds.projectId} = ${projects.id})`,
    })
    .from(projects)
    .where(eq(projects.ownerId, user.id))
    .orderBy(desc(projects.createdAt));

  return Response.json({ projects: rows });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { repoUrl?: string; name?: string; branch?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const repoUrl = String(body.repoUrl || "").trim();
  if (!repoUrl) return Response.json({ error: "repoUrl is required" }, { status: 400 });

  const { detectFramework, healthFromDetection } = await import("@/lib/engine");
  const detection = detectFramework(repoUrl, body.name || repoUrl);

  const [project] = await db
    .insert(projects)
    .values({
      ownerId: user.id,
      name: body.name || repoUrl.split("/").pop()?.replace(/\.git$/, "") || "project",
      repoUrl,
      branch: body.branch || "main",
      source: "github",
      framework: detection.framework,
      language: detection.language,
      detection,
      healthScore: healthFromDetection(detection),
      status: detection.warnings.some((w) => w.blocking) ? "needs_setup" : "ready",
    })
    .returning();

  return Response.json({ project }, { status: 201 });
}
