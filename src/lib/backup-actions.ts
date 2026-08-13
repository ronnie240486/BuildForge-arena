"use server";

import { db } from "@/db";
import { backups, projects, toolchain, webhooks, notifications } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface BackupSnapshot {
  exportedAt: string;
  version: number;
  account: { name: string; email: string; role: string };
  projects: {
    name: string;
    framework: string;
    language: string | null;
    source: string;
    repoUrl: string | null;
    branch: string;
    status: string;
    healthScore: number | null;
    versionName: string;
  }[];
  toolchain: { tool: string; version: string | null; state: string; required: boolean }[];
  webhooks: { url: string; label: string | null; events: string[]; active: boolean }[];
  note: string;
}

async function buildSnapshot(user: { id: string; name: string; email: string; role: string }): Promise<BackupSnapshot> {
  const userProjects = await db.select().from(projects).where(eq(projects.ownerId, user.id));
  const tools = await db.select().from(toolchain);
  const hooks = await db.select().from(webhooks).where(eq(webhooks.ownerId, user.id));

  return {
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
    webhooks: hooks.map((w) => ({ url: w.url, label: w.label, events: (w.events as string[]) ?? [], active: w.active })),
    note: "Senhas, hashes e keystores são intencionalmente excluídos deste export.",
  };
}

// Cria um snapshot e guarda no histórico (Backups > Criar backup).
export async function createBackup(prevState: unknown, formData: FormData) {
  const me = await requireAdmin();
  const label = String(formData.get("label") || "").trim() || `Backup ${new Date().toLocaleDateString("pt-BR")}`;

  const snapshot = await buildSnapshot(me);
  const body = JSON.stringify(snapshot);

  await db.insert(backups).values({
    ownerId: me.id,
    label,
    snapshot,
    sizeBytes: Buffer.byteLength(body, "utf8"),
  });

  await db.insert(notifications).values({
    userId: me.id,
    type: "system",
    title: "Backup criado",
    message: `"${label}" salvo com ${snapshot.projects.length} projeto(s) e ${snapshot.webhooks.length} webhook(s).`,
  });

  revalidatePath("/app/backups");
  return { ok: true };
}

// Restaura um backup: reimporta projetos/webhooks que não existem mais, sem apagar o que já existe.
export async function restoreBackup(prevState: unknown, formData: FormData) {
  const me = await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return { error: "Backup inválido." };

  const [row] = await db.select().from(backups).where(eq(backups.id, id)).limit(1);
  if (!row || row.ownerId !== me.id) return { error: "Backup não encontrado." };

  const snap = row.snapshot as BackupSnapshot;
  const existing = await db.select().from(projects).where(eq(projects.ownerId, me.id));
  const existingNames = new Set(existing.map((p) => p.name));

  let restoredProjects = 0;
  for (const p of snap.projects ?? []) {
    if (existingNames.has(p.name)) continue;
    await db.insert(projects).values({
      ownerId: me.id,
      name: p.name,
      source: p.source as typeof projects.$inferSelect.source,
      repoUrl: p.repoUrl,
      branch: p.branch || "main",
      framework: p.framework as typeof projects.$inferSelect.framework,
      language: p.language,
      packageName: `dev.buildforge.${p.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      versionName: p.versionName || "1.0.0",
      status: "ready",
      healthScore: p.healthScore ?? 100,
    });
    restoredProjects++;
  }

  const existingHooks = await db.select().from(webhooks).where(eq(webhooks.ownerId, me.id));
  const existingUrls = new Set(existingHooks.map((w) => w.url));
  let restoredHooks = 0;
  for (const w of snap.webhooks ?? []) {
    if (existingUrls.has(w.url)) continue;
    await db.insert(webhooks).values({
      ownerId: me.id,
      url: w.url,
      label: w.label,
      events: w.events ?? [],
      active: w.active,
    });
    restoredHooks++;
  }

  await db.insert(notifications).values({
    userId: me.id,
    type: "system",
    title: "Backup restaurado",
    message: `${restoredProjects} projeto(s) e ${restoredHooks} webhook(s) restaurados de "${row.label}".`,
  });

  revalidatePath("/app/backups");
  revalidatePath("/app/projects");
  revalidatePath("/app/webhooks");
  return { ok: true, restoredProjects, restoredHooks };
}

export async function deleteBackup(prevState: unknown, formData: FormData) {
  const me = await requireAdmin();
  const id = String(formData.get("id") || "");
  await db.delete(backups).where(eq(backups.id, id));
  revalidatePath("/app/backups");
  return { ok: true };
}

export async function listBackups(ownerId: string) {
  return db.select().from(backups).where(eq(backups.ownerId, ownerId)).orderBy(desc(backups.createdAt));
}
