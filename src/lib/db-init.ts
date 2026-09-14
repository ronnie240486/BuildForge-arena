import { client } from "@/db";
import { hashPassword } from "@/lib/auth";
import { DEFAULT_TOOLCHAIN } from "@/lib/toolchain";

// Idempotent raw-SQL schema (SQLite/libsql). Runs on server startup via
// instrumentation so the app works even against a brand-new database file
// (CREATE TABLE IF NOT EXISTS). Enum-like columns are plain TEXT — SQLite has
// no CREATE TYPE — and every column that used to be bolted on later via
// ALTER TABLE (in the old Postgres schema) is folded directly into the table
// definition here, since a fresh SQLite file has no legacy rows to migrate.
const CREATE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "users" (
    "id" text PRIMARY KEY,
    "name" text NOT NULL,
    "email" text NOT NULL UNIQUE,
    "password_hash" text NOT NULL,
    "role" text NOT NULL DEFAULT 'member',
    "avatar_color" text NOT NULL DEFAULT 'indigo',
    "github_user" text,
    "github_token" text,
    "build_limit" integer NOT NULL DEFAULT 3,
    "builds_used" integer NOT NULL DEFAULT 0,
    "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS "sessions" (
    "id" text PRIMARY KEY,
    "token" text NOT NULL UNIQUE,
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "expires_at" integer NOT NULL,
    "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS "projects" (
    "id" text PRIMARY KEY,
    "owner_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "description" text,
    "source" text NOT NULL DEFAULT 'github',
    "repo_url" text,
    "branch" text NOT NULL DEFAULT 'main',
    "commit_sha" text,
    "framework" text NOT NULL DEFAULT 'unknown',
    "language" text,
    "package_name" text,
    "min_sdk" integer,
    "target_sdk" integer,
    "version_name" text NOT NULL DEFAULT '1.0.0',
    "status" text NOT NULL DEFAULT 'ready',
    "app_name" text,
    "icon_data" text,
    "web_url" text,
    "ai_prompt" text,
    "ai_generated" integer NOT NULL DEFAULT 0,
    "derived_from_project_id" text REFERENCES "projects"("id"),
    "detection" text,
    "health_score" integer DEFAULT 100,
    "last_build_at" integer,
    "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS "generated_files" (
    "id" text PRIMARY KEY,
    "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "path" text NOT NULL,
    "content" text NOT NULL,
    "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS "builds" (
    "id" text PRIMARY KEY,
    "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "target" text NOT NULL DEFAULT 'apk',
    "variant" text NOT NULL DEFAULT 'release',
    "status" text NOT NULL DEFAULT 'queued',
    "progress" integer NOT NULL DEFAULT 0,
    "log" text NOT NULL DEFAULT '',
    "summary" text,
    "duration_ms" integer,
    "cache_hit" integer DEFAULT 0,
    "parallel" integer DEFAULT 0,
    "mode" text NOT NULL DEFAULT 'demo',
    "worker_id" text,
    "started_at" integer,
    "completed_at" integer,
    "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS "artifacts" (
    "id" text PRIMARY KEY,
    "build_id" text NOT NULL REFERENCES "builds"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "type" text NOT NULL,
    "size_bytes" integer NOT NULL,
    "signed" integer NOT NULL DEFAULT 0,
    "real_data" text,
    "sha256" text,
    "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS "build_workers" (
    "id" text PRIMARY KEY,
    "owner_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "token" text NOT NULL UNIQUE,
    "os" text,
    "toolchain" text,
    "last_seen" integer,
    "online" integer NOT NULL DEFAULT 0,
    "builds_run" integer NOT NULL DEFAULT 0,
    "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS "ai_insights" (
    "id" text PRIMARY KEY,
    "build_id" text NOT NULL REFERENCES "builds"("id") ON DELETE CASCADE,
    "severity" text NOT NULL DEFAULT 'info',
    "title" text NOT NULL,
    "error_code" text,
    "explanation" text NOT NULL,
    "suggestion" text NOT NULL,
    "auto_fixable" integer NOT NULL DEFAULT 0,
    "applied" integer NOT NULL DEFAULT 0,
    "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS "toolchain" (
    "id" text PRIMARY KEY,
    "tool" text NOT NULL UNIQUE,
    "label" text NOT NULL,
    "version" text,
    "required" integer NOT NULL DEFAULT 1,
    "state" text NOT NULL DEFAULT 'missing',
    "env" text,
    "updated_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS "signing_configs" (
    "id" text PRIMARY KEY,
    "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "key_alias" text NOT NULL,
    "store_name" text NOT NULL,
    "store_path" text,
    "validity_years" integer NOT NULL DEFAULT 25,
    "configured" integer NOT NULL DEFAULT 0,
    "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS "webhooks" (
    "id" text PRIMARY KEY,
    "owner_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "url" text NOT NULL,
    "label" text,
    "events" text NOT NULL DEFAULT '[]',
    "active" integer NOT NULL DEFAULT 1,
    "last_delivery" integer,
    "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS "notifications" (
    "id" text PRIMARY KEY,
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "type" text NOT NULL DEFAULT 'system',
    "title" text NOT NULL,
    "message" text NOT NULL,
    "read" integer NOT NULL DEFAULT 0,
    "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS "ai_settings" (
    "id" text PRIMARY KEY,
    "provider" text NOT NULL DEFAULT 'anthropic',
    "api_key" text,
    "model" text,
    "enabled" integer NOT NULL DEFAULT 0,
    "updated_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS "backups" (
    "id" text PRIMARY KEY,
    "owner_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "label" text NOT NULL,
    "snapshot" text NOT NULL,
    "size_bytes" integer NOT NULL DEFAULT 0,
    "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS "build_schedules" (
    "id" text PRIMARY KEY,
    "owner_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "target" text NOT NULL DEFAULT 'apk',
    "frequency" text NOT NULL DEFAULT 'daily',
    "active" integer NOT NULL DEFAULT 1,
    "last_run_at" integer,
    "next_run_at" integer NOT NULL,
    "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS "support_tickets" (
    "id" text PRIMARY KEY,
    "owner_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "subject" text NOT NULL,
    "message" text NOT NULL,
    "status" text NOT NULL DEFAULT 'open',
    "reply" text,
    "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000),
    "updated_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS "release_links" (
    "id" text PRIMARY KEY,
    "artifact_id" text NOT NULL REFERENCES "artifacts"("id") ON DELETE CASCADE,
    "token" text NOT NULL UNIQUE,
    "channel" text NOT NULL DEFAULT 'direct',
    "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000),
    "expires_at" integer
  )`,
  `CREATE TABLE IF NOT EXISTS "project_members" (
    "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "role" text NOT NULL DEFAULT 'contributor',
    "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000),
    PRIMARY KEY ("project_id", "user_id")
  )`,
];

// Adiciona uma coluna a uma tabela ja existente, se ela ainda nao existir.
// SQLite nao suporta "ALTER TABLE ADD COLUMN IF NOT EXISTS" — usado para
// evoluir o schema em bancos ja criados (a tabela nova ja nasce com a coluna
// via CREATE_STATEMENTS; isso so importa para bancos criados antes dela).
async function ensureColumn(table: string, column: string, addColumnDdl: string) {
  const res = await client.execute(
    `SELECT 1 FROM pragma_table_info('${table}') WHERE name = '${column}'`,
  );
  if (res.rows.length === 0) {
    await client.execute(`ALTER TABLE "${table}" ADD COLUMN ${addColumnDdl}`);
  }
}

export async function ensureSchema() {
  for (const statement of CREATE_STATEMENTS) {
    await client.execute(statement);
  }
  await ensureColumn(
    "projects",
    "derived_from_project_id",
    `"derived_from_project_id" text REFERENCES "projects"("id")`,
  );
}

export async function seedDefaults() {
  const adminName = process.env.ADMIN_NAME || "Forge Admin";
  const adminEmail = process.env.ADMIN_EMAIL || "admin@buildforge.dev";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const existing = await client.execute({
    sql: "SELECT id FROM users WHERE email = ?",
    args: [adminEmail],
  });
  if (existing.rows.length === 0) {
    const hash = await hashPassword(adminPassword);
    await client.execute({
      sql: "INSERT INTO users (id, name, email, password_hash, role, avatar_color, github_user, build_limit) VALUES (?, ?, ?, ?, 'admin', 'indigo', 'buildforge', -1)",
      args: [crypto.randomUUID(), adminName, adminEmail, hash],
    });
  }

  const toolchainCount = await client.execute("SELECT count(*) AS c FROM toolchain");
  const count = Number(toolchainCount.rows[0]?.c ?? 0);
  if (count === 0) {
    for (const tool of DEFAULT_TOOLCHAIN) {
      await client.execute({
        sql: "INSERT INTO toolchain (id, tool, label, version, required, state, env) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (tool) DO NOTHING",
        args: [
          crypto.randomUUID(),
          tool.tool,
          tool.label,
          tool.version ?? null,
          tool.required ? 1 : 0,
          tool.state,
          JSON.stringify(tool.env ?? {}),
        ],
      });
    }
  }
}

export async function ensureReady() {
  try {
    await ensureSchema();
    await seedDefaults();
    console.log("[db-init] schema + demo data ready");
  } catch (e) {
    console.error("[db-init] ensureReady failed:", e);
  }
}
