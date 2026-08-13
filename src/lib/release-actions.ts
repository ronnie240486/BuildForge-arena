"use server";

import { db } from "@/db";
import { projects, signingConfigs, notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

// Configura (ou gera) a chave de assinatura de um projeto. O motor de build
// (build-runner.ts) já lê signingConfigs.configured — aqui só escrevemos essa linha.
export async function configureSigningKey(prevState: unknown, formData: FormData) {
  const me = await requireUser();
  const projectId = String(formData.get("projectId") || "");
  const mode = String(formData.get("mode") || "generate"); // "generate" | "upload"
  const keyAlias = String(formData.get("keyAlias") || "release").trim() || "release";
  const storeName = String(formData.get("storeName") || "").trim();
  const validityYears = Math.max(1, Math.min(50, parseInt(String(formData.get("validityYears") || "25"), 10) || 25));

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project || project.ownerId !== me.id) return { error: "Projeto não encontrado." };

  const finalStoreName = storeName || (mode === "generate" ? `${keyAlias}-${randomBytes(4).toString("hex")}.jks` : storeName);
  if (mode === "upload" && !finalStoreName) return { error: "Informe o nome do arquivo da keystore enviada." };

  const [existing] = await db.select().from(signingConfigs).where(eq(signingConfigs.projectId, projectId)).limit(1);
  if (existing) {
    await db
      .update(signingConfigs)
      .set({ keyAlias, storeName: finalStoreName, validityYears, configured: true })
      .where(eq(signingConfigs.id, existing.id));
  } else {
    await db.insert(signingConfigs).values({
      projectId,
      keyAlias,
      storeName: finalStoreName,
      validityYears,
      configured: true,
    });
  }

  await db.insert(notifications).values({
    userId: me.id,
    type: "system",
    title: "Assinatura configurada",
    message: `${project.name}: chave "${keyAlias}" (${finalStoreName}) pronta para releases assinadas.`,
  });

  revalidatePath("/app/releases");
  revalidatePath(`/app/projects/${projectId}`);
  return { ok: true };
}

export async function saveVersionInfo(prevState: unknown, formData: FormData) {
  const me = await requireUser();
  const projectId = String(formData.get("projectId") || "");
  const versionName = String(formData.get("versionName") || "").trim();
  if (!versionName) return { error: "Informe uma versão (ex.: 1.0.1)." };

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project || project.ownerId !== me.id) return { error: "Projeto não encontrado." };

  await db.update(projects).set({ versionName }).where(eq(projects.id, projectId));
  revalidatePath("/app/releases");
  return { ok: true };
}
