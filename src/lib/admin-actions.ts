"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Exclui uma conta (não disponível na tela de Configurações, só aqui em Administração).
export async function deleteUser(userId: string) {
  const me = await requireAdmin();
  if (userId === me.id) return { error: "Você não pode excluir sua própria conta." };
  await db.delete(users).where(eq(users.id, userId));
  revalidatePath("/app/admin");
  return { ok: true };
}
