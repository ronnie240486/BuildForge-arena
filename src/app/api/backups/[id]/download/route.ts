import { db } from "@/db";
import { backups } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [row] = await db.select().from(backups).where(eq(backups.id, id)).limit(1);
  if (!row || row.ownerId !== user.id) return new Response("Backup not found", { status: 404 });

  const body = JSON.stringify(row.snapshot, null, 2);
  const stamp = row.createdAt.toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="buildforge-backup-${stamp}.json"`,
    },
  });
}
