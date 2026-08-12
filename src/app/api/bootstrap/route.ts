import { db } from "@/db";
import { users, toolchain } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { DEFAULT_TOOLCHAIN } from "@/lib/toolchain";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Idempotent bootstrap: ensures a demo admin user and the default toolchain exist.
export async function POST() {
  const results: string[] = [];

  const [existing] = await db.select().from(users).where(eq(users.email, "admin@buildforge.dev")).limit(1);
  if (!existing) {
    await db.insert(users).values({
      name: "Forge Admin",
      email: "admin@buildforge.dev",
      passwordHash: await hashPassword("admin123"),
      role: "admin",
      avatarColor: "indigo",
      githubUser: "buildforge",
    });
    results.push("created admin user");
  } else {
    results.push("admin user already exists");
  }

  for (const tool of DEFAULT_TOOLCHAIN) {
    const [row] = await db.select().from(toolchain).where(eq(toolchain.tool, tool.tool)).limit(1);
    if (!row) {
      await db.insert(toolchain).values(tool);
    }
  }
  results.push("toolchain synced");

  return Response.json({ ok: true, results });
}

export async function GET() {
  return POST();
}
