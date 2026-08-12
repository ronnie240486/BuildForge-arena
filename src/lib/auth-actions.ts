"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword, createSession, clearSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function loginAction(prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Email and password are required." };

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return { error: "No account found with that email." };
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: "Incorrect password." };

  await createSession(user.id);
  redirect("/app");
}

export async function registerAction(prevState: unknown, formData: FormData) {
  // Cadastro publico DESATIVADO por padrao. Somente admins criam usuarios
  // (em Configuracoes). Para reabrir, defina ALLOW_PUBLIC_SIGNUP=true no ambiente.
  if (process.env.ALLOW_PUBLIC_SIGNUP !== "true") {
    return { error: "Cadastro fechado. Peça a um administrador para criar sua conta." };
  }
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (name.length < 2) return { error: "Please enter your name." };
  if (!validateEmail(email)) return { error: "Please enter a valid email." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { error: "An account with this email already exists." };

  const colors = ["indigo", "emerald", "rose", "amber", "sky", "fuchsia"];
  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: await hashPassword(password),
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
    })
    .returning();

  await createSession(user.id);
  redirect("/app");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
