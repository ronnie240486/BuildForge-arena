import { db } from "@/db";
import { builds } from "@/db/schema";
import { authWorker } from "@/lib/worker-auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// The worker streams log chunks + progress here as the real build runs.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const worker = await authWorker(req);
  if (!worker) return Response.json({ error: "Invalid worker token" }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const chunk = String(body.log ?? "");
  const progress = typeof body.progress === "number" ? Math.min(99, Math.max(0, body.progress)) : undefined;

  const [b] = await db.select().from(builds).where(eq(builds.id, id)).limit(1);
  if (!b || b.workerId !== worker.id) return Response.json({ error: "Not your build" }, { status: 403 });

  await db
    .update(builds)
    .set({
      log: b.log + chunk,
      ...(progress !== undefined ? { progress } : {}),
    })
    .where(eq(builds.id, id));

  return Response.json({ ok: true });
}
