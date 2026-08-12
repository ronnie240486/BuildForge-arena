import { promisify } from "node:util";
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { Request, Response } from "express";
import { clientSessions, type User, users } from "../drizzle/schema";
import { getDb } from "./db";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "bf_client_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function hashClientPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyClientPassword(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function safeUser(row: typeof users.$inferSelect): User {
  const { passwordHash: _passwordHash, role, buildLimit, buildsUsed, avatarColor, ...user } = row;
  return { ...user, role, buildLimit, buildsUsed, avatarColor };
}

function setClientCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_TTL_MS });
}

function clearClientCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
}

function readCookie(req: Request) {
  const match = req.headers.cookie?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

async function createClientSession(userId: number, res: Response) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const rawToken = randomBytes(32).toString("base64url");
  await db.insert(clientSessions).values({ userId, tokenHash: tokenHash(rawToken), expiresAt: new Date(Date.now() + SESSION_TTL_MS) });
  setClientCookie(res, rawToken);
}

export async function registerClient(input: { name: string; email: string; password: string; res: Response }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const email = normalizeEmail(input.email);
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) throw new Error("Já existe uma conta com este e-mail.");
  const passwordHash = await hashClientPassword(input.password);
  const [result] = await db.insert(users).values({ openId: `local:${randomUUID()}`, name: input.name.trim(), email, loginMethod: "email_password", passwordHash, role: "member", lastSignedIn: new Date() });
  await createClientSession(Number(result.insertId), input.res);
  const created = await db.select().from(users).where(eq(users.id, Number(result.insertId))).limit(1);
  return created[0] ? safeUser(created[0]) : null;
}

export async function loginClient(input: { email: string; password: string; res: Response }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const rows = await db.select().from(users).where(eq(users.email, normalizeEmail(input.email))).limit(1);
  const user = rows[0];
  if (!user?.passwordHash || !(await verifyClientPassword(input.password, user.passwordHash))) throw new Error("E-mail ou senha inválidos.");
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
  await createClientSession(user.id, input.res);
  return safeUser(user);
}

export async function logoutClient(req: Request, res: Response) {
  const token = readCookie(req);
  const db = await getDb();
  if (token && db) await db.delete(clientSessions).where(eq(clientSessions.tokenHash, tokenHash(token)));
  clearClientCookie(res);
}

export async function authenticateClientSession(req: Request): Promise<User | null> {
  const token = readCookie(req);
  if (!token) return null;
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ user: users, session: clientSessions }).from(clientSessions).innerJoin(users, eq(clientSessions.userId, users.id)).where(and(eq(clientSessions.tokenHash, tokenHash(token)), gt(clientSessions.expiresAt, new Date()))).limit(1);
  const row = rows[0];
  if (!row) return null;
  await db.update(clientSessions).set({ lastSeenAt: new Date() }).where(eq(clientSessions.id, row.session.id));
  return safeUser(row.user);
}
