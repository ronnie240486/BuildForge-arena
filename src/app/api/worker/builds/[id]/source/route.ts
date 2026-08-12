import { db } from "@/db";
import { builds, projects, generatedFiles } from "@/db/schema";
import { authWorker } from "@/lib/worker-auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Retorna os arquivos gerados por IA de um projeto (para o worker montar localmente).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const worker = await authWorker(req);
  if (!worker) return Response.json({ error: "Invalid worker token" }, { status: 401 });
  const { id } = await params;

  const [b] = await db.select().from(builds).where(eq(builds.id, id)).limit(1);
  if (!b || b.workerId !== worker.id) return Response.json({ error: "Not your build" }, { status: 403 });

  const [project] = await db.select().from(projects).where(eq(projects.id, b.projectId)).limit(1);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const files = await db.select().from(generatedFiles).where(eq(generatedFiles.projectId, project.id));

  return Response.json({
    appName: project.appName || project.name,
    packageName: project.packageName,
    iconData: project.iconData || null,
    webUrl: project.webUrl || null,
    files: files.map((f) => ({ path: f.path, content: f.content })),
  });
}
