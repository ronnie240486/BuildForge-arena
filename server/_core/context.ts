import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { authenticateClientSession } from "../client-auth";
import { getUserByOpenId } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function resolvePersistedOAuthUser(
  user: User | null,
  lookup: (openId: string) => Promise<User | undefined> = getUserByOpenId,
): Promise<User | null> {
  if (!user?.openId) return user;
  return (await lookup(user.openId)) ?? user;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
    user = await resolvePersistedOAuthUser(user);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  if (!user) {
    user = await authenticateClientSession(opts.req);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
