"use server";

import { db } from "@/db";
import { releaseLinks, artifacts, builds, projects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

export async function generateReleaseLink(prevState: unknown, formData: FormData) {
  const me = await requireUser();
  const artifactId = String(formData.get("artifactId") || "");

  const [art] = await db.select().from(artifacts).where(eq(artifacts.id, artifactId)).limit(1);
  if (!art) return { error: "Artefato não encontrado." };
  const [build] = await db.select().from(builds).where(eq(builds.id, art.buildId)).limit(1);
  if (!build) return { error: "Build não encontrado." };
  const [project] = await db.select().from(projects).where(eq(projects.id, build.projectId)).limit(1);
  if (!project || project.ownerId !== me.id) return { error: "Sem permissão sobre esse artefato." };

  const token = randomBytes(20).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

  await db.insert(releaseLinks).values({ artifactId, token, expiresAt });

  revalidatePath("/app/artifacts");
  return { ok: true, token };
}

export async function revokeReleaseLink(id: string) {
  await requireUser();
  await db.delete(releaseLinks).where(eq(releaseLinks.id, id));
  revalidatePath("/app/artifacts");
}
