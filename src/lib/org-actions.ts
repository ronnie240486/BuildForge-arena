"use server";

import { db } from "@/db";
import { projects, projectMembers, users, notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function addProjectMember(prevState: unknown, formData: FormData) {
  const me = await requireUser();
  const projectId = String(formData.get("projectId") || "");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "contributor");

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project || project.ownerId !== me.id) return { error: "Projeto não encontrado." };

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return { error: "Nenhum usuário com esse email. Crie a conta em Administração primeiro." };
  if (user.id === project.ownerId) return { error: "O dono do projeto já tem acesso total." };

  const [existing] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
    .limit(1);
  if (existing) return { error: "Esse usuário já é membro do projeto." };

  await db.insert(projectMembers).values({ projectId, userId: user.id, role });

  await db.insert(notifications).values({
    userId: user.id,
    type: "system",
    title: "Você foi adicionado a um projeto",
    message: `${me.name} te adicionou a "${project.name}" como ${role}.`,
  });

  revalidatePath("/app/organizations");
  return { ok: true };
}

export async function removeProjectMember(projectId: string, userId: string) {
  const me = await requireUser();
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project || project.ownerId !== me.id) return { error: "Sem permissão." };
  await db.delete(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
  revalidatePath("/app/organizations");
  return { ok: true };
}

export async function updateProjectMemberRole(projectId: string, userId: string, role: string) {
  const me = await requireUser();
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project || project.ownerId !== me.id) return { error: "Sem permissão." };
  await db
    .update(projectMembers)
    .set({ role })
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
  revalidatePath("/app/organizations");
  return { ok: true };
}
