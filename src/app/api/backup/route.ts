import { db } from "@/db";
import { projects, toolchain, webhooks } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Exports a JSON configuration snapshot (Phase 8 — backup). Secrets are excluded.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const userProjects = await db.select().from(projects).where(eq(projects.ownerId, user.id));
  const tools = await db.select().from(toolchain);
  const hooks = await db.select().from(webhooks).where(eq(webhooks.ownerId, user.id));

  const snapshot = {
    exportedAt: new Date().toISOString(),
    version: 1,
    account: { name: user.name, email: user.email, role: user.role },
    projects: userProjects.map((p) => ({
      name: p.name,
      framework: p.framework,
      language: p.language,
      source: p.source,
      repoUrl: p.repoUrl,
      branch: p.branch,
      status: p.status,
      healthScore: p.healthScore,
      versionName: p.versionName,
    })),
    toolchain: tools.map((t) => ({ tool: t.tool, version: t.version, state: t.state, required: t.required })),
    webhooks: hooks.map((w) => ({ url: w.url, label: w.label, events: w.events, active: w.active })),
    note: "Senhas, hashes e keystores são intencionalmente excluídos deste export.",
  };

  const body = JSON.stringify(snapshot, null, 2);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="buildforge-backup-${stamp}.json"`,
    },
  });
}
