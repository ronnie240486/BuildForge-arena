import { db } from "@/db";
import { buildWorkers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function authWorker(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const [worker] = await db.select().from(buildWorkers).where(eq(buildWorkers.token, token)).limit(1);
  return worker ?? null;
}
