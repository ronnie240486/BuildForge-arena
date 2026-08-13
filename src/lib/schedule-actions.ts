"use server";

import { db } from "@/db";
import { buildSchedules, projects, notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function nextRunFrom(frequency: "daily" | "weekly" | "monthly", from = new Date()) {
  const d = new Date(from);
  if (frequency === "daily") d.setDate(d.getDate() + 1);
  else if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

export async function createSchedule(prevState: unknown, formData: FormData) {
  const me = await requireUser();
  const projectId = String(formData.get("projectId") || "");
  const target = String(formData.get("target") || "apk") as "apk" | "aab" | "exe" | "appbundle";
  const frequency = String(formData.get("frequency") || "daily") as "daily" | "weekly" | "monthly";

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project || project.ownerId !== me.id) return { error: "Projeto não encontrado." };

  await db.insert(buildSchedules).values({
    ownerId: me.id,
    projectId,
    target,
    frequency,
    nextRunAt: nextRunFrom(frequency),
  });

  await db.insert(notifications).values({
    userId: me.id,
    type: "system",
    title: "Agendamento criado",
    message: `${project.name}: build ${target.toUpperCase()} ${frequency === "daily" ? "diário" : frequency === "weekly" ? "semanal" : "mensal"}.`,
  });

  revalidatePath("/app/schedules");
  return { ok: true };
}

export async function toggleSchedule(id: string) {
  await requireUser();
  const [row] = await db.select().from(buildSchedules).where(eq(buildSchedules.id, id)).limit(1);
  if (!row) return;
  await db.update(buildSchedules).set({ active: !row.active }).where(eq(buildSchedules.id, id));
  revalidatePath("/app/schedules");
}

export async function deleteSchedule(id: string) {
  await requireUser();
  await db.delete(buildSchedules).where(eq(buildSchedules.id, id));
  revalidatePath("/app/schedules");
}

// Marca uma execução manual: registra lastRunAt e calcula o próximo horário.
// (Dispare o build de verdade pela tela de Builds/Projeto — isto só atualiza o agendamento.)
export async function markScheduleRun(id: string) {
  await requireUser();
  const [row] = await db.select().from(buildSchedules).where(eq(buildSchedules.id, id)).limit(1);
  if (!row) return;
  await db
    .update(buildSchedules)
    .set({ lastRunAt: new Date(), nextRunAt: nextRunFrom(row.frequency) })
    .where(eq(buildSchedules.id, id));
  revalidatePath("/app/schedules");
}
