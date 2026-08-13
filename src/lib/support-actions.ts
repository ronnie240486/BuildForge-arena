"use server";

import { db } from "@/db";
import { supportTickets, notifications, users } from "@/db/schema";
import { requireUser, requireAdmin } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createTicket(prevState: unknown, formData: FormData) {
  const me = await requireUser();
  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();
  if (subject.length < 3) return { error: "Informe um assunto." };
  if (message.length < 10) return { error: "Descreva melhor o problema (mín. 10 caracteres)." };

  await db.insert(supportTickets).values({ ownerId: me.id, subject, message });

  const [admin] = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
  if (admin) {
    await db.insert(notifications).values({
      userId: admin.id,
      type: "system",
      title: "Novo chamado de suporte",
      message: `${me.name}: "${subject}"`,
    });
  }

  revalidatePath("/app/support");
  return { ok: true };
}

// Admin responde e fecha/mantém aberto o chamado.
export async function replyTicket(prevState: unknown, formData: FormData) {
  const me = await requireAdmin();
  const id = String(formData.get("id") || "");
  const reply = String(formData.get("reply") || "").trim();
  const status = String(formData.get("status") || "answered") as "open" | "answered" | "closed";
  if (!id) return { error: "Chamado inválido." };

  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id)).limit(1);
  if (!ticket) return { error: "Chamado não encontrado." };

  await db.update(supportTickets).set({ reply, status, updatedAt: new Date() }).where(eq(supportTickets.id, id));

  await db.insert(notifications).values({
    userId: ticket.ownerId,
    type: "system",
    title: `Chamado respondido: ${ticket.subject}`,
    message: reply.slice(0, 140),
  });

  revalidatePath("/app/support");
  return { ok: true };
}
