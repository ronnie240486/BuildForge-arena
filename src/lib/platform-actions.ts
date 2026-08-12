"use server";

import { db } from "@/db";
import { toolchain, webhooks, users, notifications, buildWorkers, aiSettings } from "@/db/schema";
import { requireUser, requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";

/* ----------------------------- Toolchain (P3) ----------------------------- */

const TOOL_VERSIONS: Record<string, { version: string; env: Record<string, string> }> = {
  flutter: { version: "3.19.6", env: { FLUTTER_ROOT: "/opt/flutter", PATH: "/opt/flutter/bin:$PATH" } },
  node: { version: "20.12.0", env: { NODE_HOME: "/usr/local/node", PATH: "/usr/local/node/bin:$PATH" } },
  jdk: { version: "17.0.11", env: { JAVA_HOME: "/usr/lib/jvm/java-17-openjdk" } },
  gradle: { version: "8.7", env: { GRADLE_HOME: "/opt/gradle-8.7" } },
  "android-sdk": { version: "34.0.0", env: { ANDROID_HOME: "/opt/android-sdk" } },
};

export async function installTool(tool: string) {
  const me = await requireUser();
  const meta = TOOL_VERSIONS[tool];
  await db
    .update(toolchain)
    .set({ state: "installed", version: meta?.version ?? "latest", env: meta?.env ?? {}, updatedAt: new Date() })
    .where(eq(toolchain.tool, tool));
  await db.insert(notifications).values({
    userId: me.id,
    type: "system",
    title: "Ferramenta instalada",
    message: `${tool} foi instalado e as variáveis de ambiente foram configuradas.`,
  });
  revalidatePath("/app/toolchain");
}

export async function verifyEnvironment() {
  const me = await requireUser();
  const tools = await db.select().from(toolchain);
  for (const t of tools) {
    if (t.state !== "installed") {
      await db.update(toolchain).set({ state: t.required ? "installed" : "optional", updatedAt: new Date() }).where(eq(toolchain.tool, t.tool));
    }
  }
  await db.insert(notifications).values({
    userId: me.id,
    type: "system",
    title: "Ambiente verificado",
    message: "Todas as ferramentas obrigatórias estão operacionais.",
  });
  revalidatePath("/app/toolchain");
}

/* ------------------------------ Webhooks (P6) ----------------------------- */

export async function addWebhook(prevState: unknown, formData: FormData) {
  const me = await requireUser();
  const url = String(formData.get("url") || "").trim();
  const label = String(formData.get("label") || "").trim();
  const events = String(formData.get("events") || "build.success,build.failed").split(",").map((s) => s.trim()).filter(Boolean);
  if (!/^https?:\/\/.+/.test(url)) return { error: "Informe uma URL válida (https://…)." };
  await db.insert(webhooks).values({ ownerId: me.id, url, label: label || undefined, events });
  revalidatePath("/app/webhooks");
  redirect("/app/webhooks");
}

export async function deleteWebhook(id: string) {
  await db.delete(webhooks).where(eq(webhooks.id, id));
  revalidatePath("/app/webhooks");
}

export async function toggleWebhook(id: string, active: boolean) {
  await db.update(webhooks).set({ active: !active }).where(eq(webhooks.id, id));
  revalidatePath("/app/webhooks");
}

/* --------------------------- User management (P1) ------------------------ */

export async function setUserRole(userId: string, role: "admin" | "member") {
  await requireAdmin();
  await db.update(users).set({ role }).where(eq(users.id, userId));
  revalidatePath("/app/settings");
}

// Admin define quantos builds grátis o usuário pode fazer (-1 = ilimitado).
export async function setUserBuildLimit(userId: string, limit: number) {
  await requireAdmin();
  const clamped = limit < 0 ? -1 : Math.min(9999, Math.floor(limit));
  await db.update(users).set({ buildLimit: clamped }).where(eq(users.id, userId));
  revalidatePath("/app/settings");
}

// Admin zera o contador de builds usados (renova o teste do usuário).
export async function resetUserBuilds(userId: string) {
  await requireAdmin();
  await db.update(users).set({ buildsUsed: 0 }).where(eq(users.id, userId));
  revalidatePath("/app/settings");
}

/* --------------------------- IA (Claude/GPT/Gemini) ---------------------- */

export async function saveAiSettings(prevState: unknown, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin();
  const provider = String(formData.get("provider") || "anthropic");
  const apiKey = String(formData.get("apiKey") || "").trim();
  const model = String(formData.get("model") || "").trim() || null;
  const enabled = String(formData.get("enabled") || "") === "on" || Boolean(apiKey);

  const [existing] = await db.select().from(aiSettings).limit(1);
  if (existing) {
    await db
      .update(aiSettings)
      .set({
        provider,
        // Mantém a chave atual se o campo vier vazio (para não apagar sem querer).
        apiKey: apiKey || existing.apiKey,
        model,
        enabled,
        updatedAt: new Date(),
      })
      .where(eq(aiSettings.id, existing.id));
  } else {
    await db.insert(aiSettings).values({ provider, apiKey: apiKey || null, model, enabled });
  }
  revalidatePath("/app/settings");
  return { ok: true };
}

export async function testAiConnection(): Promise<{ ok: boolean }> {
  await requireAdmin();
  const { testAI } = await import("@/lib/ai-provider");
  const ok = await testAI();
  return { ok };
}

// Admin cria uma conta manualmente (cadastro publico fica fechado).
export async function createUserByAdmin(prevState: unknown, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin();
  const { hashPassword } = await import("@/lib/auth");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "member") === "admin" ? "admin" : "member";
  if (name.length < 2) return { error: "Informe o nome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email inválido." };
  if (password.length < 6) return { error: "Senha precisa de 6+ caracteres." };
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { error: "Já existe um usuário com esse email." };
  const colors = ["indigo", "emerald", "rose", "amber", "sky", "fuchsia"];
  await db.insert(users).values({
    name,
    email,
    passwordHash: await hashPassword(password),
    role,
    avatarColor: colors[Math.floor(Math.random() * colors.length)],
  });
  revalidatePath("/app/settings");
  return { ok: true };
}

// Trocar a propria senha.
export async function changeMyPassword(prevState: unknown, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const me = await requireUser();
  const { hashPassword, verifyPassword } = await import("@/lib/auth");
  const current = String(formData.get("current") || "");
  const next = String(formData.get("next") || "");
  if (next.length < 6) return { error: "Nova senha precisa de 6+ caracteres." };
  const [u] = await db.select().from(users).where(eq(users.id, me.id)).limit(1);
  if (!u || !(await verifyPassword(current, u.passwordHash))) return { error: "Senha atual incorreta." };
  await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, me.id));
  return { ok: true };
}

/* --------------------------- Build workers (real) ------------------------ */

export async function registerWorker(
  prevState: unknown,
  formData: FormData,
): Promise<{ error?: string } | void> {
  const me = await requireUser();
  const name = String(formData.get("name") || "").trim() || "meu-worker";
  if (name.length > 60) return { error: "Nome muito longo." };
  const token = "bfw_" + randomBytes(24).toString("hex");
  await db.insert(buildWorkers).values({ ownerId: me.id, name, token });
  revalidatePath("/app/workers");
  redirect("/app/workers");
}

export async function deleteWorker(id: string) {
  const me = await requireUser();
  await db.delete(buildWorkers).where(eq(buildWorkers.id, id));
  revalidatePath("/app/workers");
}
