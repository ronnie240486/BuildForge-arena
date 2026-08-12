import { pool } from "@/db";
import { hashPassword } from "@/lib/auth";
import { DEFAULT_TOOLCHAIN } from "@/lib/toolchain";

// Idempotent raw-SQL schema. Runs on server startup via instrumentation so the
// app works even against a brand-new database (CREATE ... IF NOT EXISTS).
const SCHEMA_SQL = `
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin','member'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE project_source AS ENUM ('github','zip','manual','clone'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE project_status AS ENUM ('ready','building','failed','needs_setup','archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE framework AS ENUM ('android','flutter','reactnative','unknown'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE build_target AS ENUM ('apk','aab','exe','appbundle','ipa'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE build_status AS ENUM ('queued','running','success','failed','canceled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tool_state AS ENUM ('installed','missing','required','optional'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE insight_severity AS ENUM ('info','warning','error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notif_type AS ENUM ('build','system','ai','security'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "role" user_role NOT NULL DEFAULT 'member',
  "avatar_color" text NOT NULL DEFAULT 'indigo',
  "github_user" text,
  "build_limit" integer NOT NULL DEFAULT 3,
  "builds_used" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "build_limit" integer NOT NULL DEFAULT 3;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "builds_used" integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "token" text NOT NULL UNIQUE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "source" project_source NOT NULL DEFAULT 'github',
  "repo_url" text,
  "branch" text NOT NULL DEFAULT 'main',
  "commit_sha" text,
  "framework" framework NOT NULL DEFAULT 'unknown',
  "language" text,
  "package_name" text,
  "min_sdk" integer,
  "target_sdk" integer,
  "version_name" text NOT NULL DEFAULT '1.0.0',
  "status" project_status NOT NULL DEFAULT 'ready',
  "detection" jsonb,
  "health_score" integer DEFAULT 100,
  "last_build_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "builds" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "target" build_target NOT NULL DEFAULT 'apk',
  "variant" text NOT NULL DEFAULT 'release',
  "status" build_status NOT NULL DEFAULT 'queued',
  "progress" integer NOT NULL DEFAULT 0,
  "log" text NOT NULL DEFAULT '',
  "summary" text,
  "duration_ms" integer,
  "cache_hit" boolean DEFAULT false,
  "parallel" boolean DEFAULT false,
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "artifacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "build_id" uuid NOT NULL REFERENCES "builds"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "type" build_target NOT NULL,
  "size_bytes" integer NOT NULL,
  "signed" boolean NOT NULL DEFAULT false,
  "real_data" text,
  "sha256" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "app_name" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "icon_data" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "web_url" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "ai_prompt" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "ai_generated" boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "generated_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "path" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "artifacts" ADD COLUMN IF NOT EXISTS "real_data" text;
ALTER TABLE "artifacts" ADD COLUMN IF NOT EXISTS "sha256" text;
ALTER TABLE "builds" ADD COLUMN IF NOT EXISTS "mode" text NOT NULL DEFAULT 'demo';
ALTER TABLE "builds" ADD COLUMN IF NOT EXISTS "worker_id" uuid;

CREATE TABLE IF NOT EXISTS "build_workers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "token" text NOT NULL UNIQUE,
  "os" text,
  "toolchain" jsonb,
  "last_seen" timestamptz,
  "online" boolean NOT NULL DEFAULT false,
  "builds_run" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ai_insights" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "build_id" uuid NOT NULL REFERENCES "builds"("id") ON DELETE CASCADE,
  "severity" insight_severity NOT NULL DEFAULT 'info',
  "title" text NOT NULL,
  "error_code" text,
  "explanation" text NOT NULL,
  "suggestion" text NOT NULL,
  "auto_fixable" boolean NOT NULL DEFAULT false,
  "applied" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "toolchain" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tool" text NOT NULL UNIQUE,
  "label" text NOT NULL,
  "version" text,
  "required" boolean NOT NULL DEFAULT true,
  "state" tool_state NOT NULL DEFAULT 'missing',
  "env" jsonb,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "signing_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "key_alias" text NOT NULL,
  "store_name" text NOT NULL,
  "store_path" text,
  "validity_years" integer NOT NULL DEFAULT 25,
  "configured" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "webhooks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "label" text,
  "events" jsonb NOT NULL DEFAULT '[]',
  "active" boolean NOT NULL DEFAULT true,
  "last_delivery" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" notif_type NOT NULL DEFAULT 'system',
  "title" text NOT NULL,
  "message" text NOT NULL,
  "read" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ai_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider" text NOT NULL DEFAULT 'anthropic',
  "api_key" text,
  "model" text,
  "enabled" boolean NOT NULL DEFAULT false,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "project_members" (
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" text NOT NULL DEFAULT 'contributor',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("project_id", "user_id")
);
`;

export async function ensureSchema() {
  await pool.query(SCHEMA_SQL);
}

export async function seedDefaults() {
  const { rows } = await pool.query("SELECT id FROM users WHERE email = $1", ["admin@buildforge.dev"]);
  if (rows.length === 0) {
    const hash = await hashPassword("admin123");
    await pool.query(
      "INSERT INTO users (name, email, password_hash, role, avatar_color, github_user, build_limit) VALUES ($1, $2, $3, 'admin', 'indigo', 'buildforge', -1)",
      ["Forge Admin", "admin@buildforge.dev", hash],
    );
  }

  const { rows: tc } = await pool.query("SELECT count(*)::int AS c FROM toolchain");
  if (tc[0].c === 0) {
    for (const t of DEFAULT_TOOLCHAIN) {
      await pool.query(
        "INSERT INTO toolchain (tool, label, version, required, state, env) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (tool) DO NOTHING",
        [t.tool, t.label, t.version, t.required, t.state, JSON.stringify(t.env ?? {})],
      );
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
