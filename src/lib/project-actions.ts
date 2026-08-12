"use server";

import { db } from "@/db";
import { projects, builds, aiInsights, notifications, signingConfigs, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { detectFramework, healthFromDetection, applyAutoFix } from "@/lib/engine";
import type { ProjectDetection } from "@/db/schema";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function githubName(url: string) {
  const m = url.match(/github\.com[/:]([^/]+)\/([^/.?#]+)/i);
  if (m) return `${m[2]}`;
  return url.split("/").filter(Boolean).pop()?.replace(/\.git$/, "") || "imported-project";
}

export async function createProject(prevState: unknown, formData: FormData) {
  const me = await requireUser();
  const source = String(formData.get("source") || "github");
  const repoUrl = String(formData.get("repoUrl") || "").trim();
  const branch = String(formData.get("branch") || "main").trim() || "main";
  const customName = String(formData.get("name") || "").trim();
  // For ZIP uploads we only receive metadata (name + size), never the binary —
  // this keeps the Server Action body tiny and avoids the payload-size limit.
  const zipName = String(formData.get("zipName") || "").trim();

  let name = customName;
  let url: string | null = null;
  let detection: ProjectDetection;

  if (source === "zip") {
    if (!zipName) return { error: "Selecione um arquivo .zip para enviar." };
    if (!/\.zip$/i.test(zipName)) return { error: "O arquivo precisa ter a extensão .zip." };
    name = name || zipName.replace(/\.zip$/i, "");
    detection = detectFramework(name, zipName);
  } else {
    if (!repoUrl) return { error: "Informe a URL do repositório." };
    if (!/^https?:\/\/.+|^git@.+:.+/.test(repoUrl)) {
      return { error: "URL inválida. Use https://github.com/usuario/repo ou git@github.com:…." };
    }
    name = name || githubName(repoUrl);
    url = repoUrl;
    detection = detectFramework(repoUrl, name);
  }

  const [project] = await db
    .insert(projects)
    .values({
      ownerId: me.id,
      name,
      source: source as typeof projects.$inferSelect.source,
      repoUrl: url,
      branch,
      framework: detection.framework,
      language: detection.language,
      packageName: `dev.buildforge.${name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      minSdk: detection.detectedSdk ? Math.max(21, detection.detectedSdk - 6) : 21,
      targetSdk: detection.detectedSdk ?? 34,
      detection,
      healthScore: healthFromDetection(detection),
      status: detection.warnings.some((w) => w.blocking) ? "needs_setup" : "ready",
    })
    .returning();

  await db.insert(notifications).values({
    userId: me.id,
    type: "system",
    title: "Projeto importado",
    message: `${name} foi adicionado como ${detection.framework} (${detection.language}).`,
  });

  redirect(`/app/projects/${project.id}`);
}

// Cria um projeto que empacota um SITE (URL) em APK — via Capacitor (WebView).
export async function createSiteApp(prevState: unknown, formData: FormData) {
  const me = await requireUser();
  const url = String(formData.get("url") || "").trim();
  const name = String(formData.get("name") || "").trim();
  if (!/^https?:\/\/.+\..+/.test(url)) return { error: "Informe uma URL válida (ex.: https://seusite.com)." };

  let host = "site";
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch {}
  const appName = name || host.split(".")[0];

  const [project] = await db
    .insert(projects)
    .values({
      ownerId: me.id,
      name: appName,
      description: "Site empacotado em APK: " + url,
      source: "manual",
      framework: "android",
      language: "WebView (Capacitor)",
      packageName: "com.buildforge." + appName.toLowerCase().replace(/[^a-z0-9]/g, ""),
      appName,
      webUrl: url,
      minSdk: 24,
      targetSdk: 34,
      status: "ready",
      detection: {
        framework: "android",
        language: "WebView (Capacitor)",
        buildSystem: "Capacitor + Gradle",
        files: [{ path: "capacitor.config.json", role: "aponta para o site" }],
        dependencies: [{ name: "@capacitor/android", version: "latest" }],
        missing: [],
        warnings: [],
        detectedSdk: 34,
      },
    })
    .returning();

  await db.insert(notifications).values({
    userId: me.id,
    type: "system",
    title: "Site pronto para virar APK",
    message: `${appName} (${url}) foi criado. Configure o ícone e dispare um build real.`,
  });

  redirect(`/app/projects/${project.id}`);
}

export async function deleteProject(projectId: string) {
  const me = await requireUser();
  await db.delete(projects).where(eq(projects.id, projectId));
  revalidatePath("/app/projects");
  revalidatePath("/app");
  redirect("/app/projects");
}

export async function startBuild(projectId: string, formData: FormData) {
  const me = await requireUser();
  const target = String(formData.get("target") || "apk") as "apk" | "aab" | "exe" | "appbundle";
  const variant = String(formData.get("variant") || "release");
  const mode = String(formData.get("mode") || "demo") === "real" ? "real" : "demo";

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return { error: "Projeto não encontrado." };

  // Cota de teste grátis: admins têm builds ilimitados; membros têm um limite
  // definido pelo admin (buildLimit). -1 = ilimitado.
  if (me.role !== "admin" && me.buildLimit !== -1 && me.buildsUsed >= me.buildLimit) {
    return {
      error: `Você atingiu o limite de ${me.buildLimit} build(s) do teste grátis. Peça ao administrador para liberar mais.`,
    };
  }

  // Real builds normally clone the repo. If there's no repoUrl, the worker can
  // still build a LOCAL folder via `--project <path>` — so we allow it and just
  // note it in the log.
  const realNeedsLocal = mode === "real" && !project.repoUrl;

  const [build] = await db
    .insert(builds)
    .values({
      projectId,
      userId: me.id,
      target,
      variant,
      status: "queued",
      progress: 0,
      log:
        mode === "real"
          ? realNeedsLocal
            ? "[buildforge] Build real LOCAL: rode o worker com --project <caminho_do_seu_projeto>.\n[buildforge] Aguardando um worker reivindicar este job…\n"
            : "[buildforge] Aguardando um worker externo reivindicar este job…\n"
          : "",
      cacheHit: mode === "demo" && Math.random() < 0.35,
      mode,
    })
    .returning();

  await db
    .update(projects)
    .set({ status: "building", lastBuildAt: new Date() })
    .where(eq(projects.id, projectId));

  // Consome 1 do saldo de builds (exceto admins/ilimitado).
  if (me.role !== "admin" && me.buildLimit !== -1) {
    await db.update(users).set({ buildsUsed: sql`${users.buildsUsed} + 1` }).where(eq(users.id, me.id));
  }

  await db.insert(notifications).values({
    userId: me.id,
    type: "build",
    title: mode === "real" ? "Build REAL enfileirado" : "Build iniciado",
    message:
      mode === "real"
        ? `${target.toUpperCase()} ${variant} de ${project.name} aguardando worker com toolchain Android.`
        : `${target.toUpperCase()} ${variant} de ${project.name} na fila.`,
  });

  redirect(`/app/builds/${build.id}`);
}

export async function applyFix(buildId: string) {
  const me = await requireUser();
  const [build] = await db.select().from(builds).where(eq(builds.id, buildId)).limit(1);
  if (!build) return { error: "Build não encontrado." };
  const [project] = await db.select().from(projects).where(eq(projects.id, build.projectId)).limit(1);
  if (!project) return { error: "Projeto não encontrado." };

  const pending = await db
    .select()
    .from(aiInsights)
    .where(eq(aiInsights.buildId, buildId))
    .orderBy(desc(aiInsights.severity))
    .limit(1);

  const insight = pending.find((i) => i.autoFixable && !i.applied && i.errorCode);
  if (!insight || !insight.errorCode) return { error: "Nenhuma correção automática disponível para este build." };

  const fixed = applyAutoFix(project.detection as ProjectDetection | null, insight.errorCode);
  if (!fixed) return { error: "Não foi possível aplicar a correção." };

  await db
    .update(aiInsights)
    .set({ applied: true })
    .where(eq(aiInsights.id, insight.id));

  await db
    .update(projects)
    .set({
      detection: fixed.detection,
      healthScore: healthFromDetection(fixed.detection),
      status: "ready",
    })
    .where(eq(projects.id, project.id));

  await db.insert(notifications).values({
    userId: me.id,
    type: "ai",
    title: "Correção aplicada pela IA",
    message: `${fixed.note} Rebuilde o projeto para validar.`,
  });

  revalidatePath(`/app/builds/${buildId}`);
  revalidatePath(`/app/projects/${project.id}`);
  redirect(`/app/projects/${project.id}`);
}

// Salva nome de exibição e ícone (base64) do app.
export async function saveAppIdentity(prevState: unknown, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const me = await requireUser();
  const projectId = String(formData.get("projectId") || "");
  const appName = String(formData.get("appName") || "").trim();
  const iconData = String(formData.get("iconData") || "").trim(); // data URL base64

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project || project.ownerId !== me.id) return { error: "Projeto não encontrado." };

  if (iconData && iconData.length > 3_000_000) return { error: "Ícone muito grande (máx ~2MB)." };

  await db
    .update(projects)
    .set({
      appName: appName || project.appName,
      ...(iconData ? { iconData } : {}),
    })
    .where(eq(projects.id, projectId));

  revalidatePath(`/app/projects/${projectId}`);
  return { ok: true };
}

export async function cancelBuild(buildId: string) {
  await db.update(builds).set({ status: "canceled", completedAt: new Date() }).where(eq(builds.id, buildId));
  revalidatePath(`/app/builds/${buildId}`);
}

// Delete a single build (and its artifacts/insights via cascade).
export async function deleteBuild(buildId: string) {
  const me = await requireUser();
  const [b] = await db.select().from(builds).where(eq(builds.id, buildId)).limit(1);
  if (!b) return;
  const [p] = await db.select().from(projects).where(eq(projects.id, b.projectId)).limit(1);
  if (!p || p.ownerId !== me.id) return;
  await db.delete(builds).where(eq(builds.id, buildId));
  revalidatePath("/app/builds");
  revalidatePath(`/app/projects/${b.projectId}`);
}

// Bulk cleanup: remove all failed/canceled builds of the current user.
export async function clearFailedBuilds() {
  const me = await requireUser();
  const myProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.ownerId, me.id));
  const ids = myProjects.map((p) => p.id);
  if (!ids.length) return;
  await db
    .delete(builds)
    .where(and(inArray(builds.projectId, ids), inArray(builds.status, ["failed", "canceled"])));
  revalidatePath("/app/builds");
}

// Apply an AI fix directly from the project's analysis panel (before building).
export async function applyProjectFix(prevState: unknown, formData: FormData) {
  const me = await requireUser();
  const projectId = String(formData.get("projectId") || "");
  const code = String(formData.get("code") || "");
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return { error: "Projeto não encontrado." };

  const fixed = applyAutoFix(project.detection as ProjectDetection | null, code);
  if (!fixed) return { error: "Esta correção precisa ser feita no seu worker/PC (veja a sugestão)." };

  await db
    .update(projects)
    .set({
      detection: fixed.detection,
      healthScore: healthFromDetection(fixed.detection),
      status: "ready",
    })
    .where(eq(projects.id, projectId));

  await db.insert(notifications).values({
    userId: me.id,
    type: "ai",
    title: "Correção aplicada pela IA",
    message: `${fixed.note} O projeto está pronto para compilar.`,
  });

  revalidatePath(`/app/projects/${projectId}`);
  return { ok: true as const };
}
