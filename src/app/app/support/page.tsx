import { db } from "@/db";
import { supportTickets, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { SupportClient, type TicketRow } from "@/components/support-client";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const me = await requireUser();
  const isAdmin = me.role === "admin";

  const rows = isAdmin
    ? await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt))
    : await db.select().from(supportTickets).where(eq(supportTickets.ownerId, me.id)).orderBy(desc(supportTickets.createdAt));

  const ownerIds = [...new Set(rows.map((r) => r.ownerId))];
  const owners = ownerIds.length ? await db.select().from(users) : [];
  const ownerMap = new Map(owners.map((u) => [u.id, u.name]));

  const tickets: TicketRow[] = rows.map((t) => ({
    id: t.id,
    ownerName: ownerMap.get(t.ownerId) ?? "?",
    subject: t.subject,
    message: t.message,
    status: t.status,
    reply: t.reply,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Suporte</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {isAdmin ? "Acompanhe e responda os chamados dos usuários." : "Abra um chamado e acompanhe as respostas."}
        </p>
      </div>
      <SupportClient tickets={tickets} isAdmin={isAdmin} />
    </div>
  );
}
