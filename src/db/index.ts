import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { resolveDatabaseUrl } from "@/lib/db-path";

const globalForDb = globalThis as typeof globalThis & {
  __arenaLibsqlClient?: Client;
};

export const client =
  globalForDb.__arenaLibsqlClient ??
  createClient({ url: resolveDatabaseUrl() });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaLibsqlClient = client;
}

export const db = drizzle(client);
