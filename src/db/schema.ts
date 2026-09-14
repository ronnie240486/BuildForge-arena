import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

/* -------------------------------------------------------------------------- */
/*  Users & Sessions                                                           */
/* -------------------------------------------------------------------------- */

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "member"] }).default("member").notNull(),
  avatarColor: text("avatar_color").default("indigo").notNull(),
  githubUser: text("github_user"),
  githubToken: text("github_token"),
  // Teste grátis: quantos builds o usuário pode disparar. O admin define por conta.
  // Admins têm builds ilimitados. -1 = ilimitado.
  buildLimit: integer("build_limit").default(3).notNull(),
  buildsUsed: integer("builds_used").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  token: text("token").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Projects                                                                   */
/* -------------------------------------------------------------------------- */

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  source: text("source", { enum: ["github", "zip", "manual", "clone"] }).default("github").notNull(),
  repoUrl: text("repo_url"),
  branch: text("branch").default("main").notNull(),
  commitSha: text("commit_sha"),
  framework: text("framework", { enum: ["android", "flutter", "reactnative", "unknown", "web"] }).default("unknown").notNull(),
  language: text("language"), // kotlin / java / dart / typescript
  packageName: text("package_name"),
  minSdk: integer("min_sdk"),
  targetSdk: integer("target_sdk"),
  versionName: text("version_name").default("1.0.0").notNull(),
  status: text("status", { enum: ["ready", "building", "failed", "needs_setup", "archived"] }).default("ready").notNull(),
  // App metadata (para o APK): nome exibido e ícone (base64 png).
  appName: text("app_name"),
  iconData: text("icon_data"),
  // Site empacotado: URL do site que vira APK (WebView via Capacitor).
  webUrl: text("web_url"),
  // Projeto gerado por IA: guarda o prompt usado.
  aiPrompt: text("ai_prompt"),
  aiGenerated: integer("ai_generated", { mode: "boolean" }).default(false).notNull(),
  // Se este projeto foi recriado (ex.: "Recriar como Web") a partir de outro projeto.
  derivedFromProjectId: text("derived_from_project_id").references((): AnySQLiteColumn => projects.id, { onDelete: "set null" }),
  // detection result stored as JSON (deps, missing deps, warnings, files)
  detection: text("detection", { mode: "json" }).$type<ProjectDetection>(),
  healthScore: integer("health_score").default(100),
  lastBuildAt: integer("last_build_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

// Arquivos gerados pela IA (código-fonte do app criado por prompt).
export const generatedFiles = sqliteTable("generated_files", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Builds & Artifacts                                                         */
/* -------------------------------------------------------------------------- */

export const builds = sqliteTable("builds", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  target: text("target", { enum: ["apk", "aab", "exe", "appbundle", "ipa"] }).default("apk").notNull(),
  variant: text("variant").default("release").notNull(),
  status: text("status", { enum: ["queued", "running", "success", "failed", "canceled"] }).default("queued").notNull(),
  progress: integer("progress").default(0).notNull(),
  log: text("log").default("").notNull(),
  summary: text("summary"),
  durationMs: integer("duration_ms"),
  cacheHit: integer("cache_hit", { mode: "boolean" }).default(false),
  parallel: integer("parallel", { mode: "boolean" }).default(false),
  // "demo" = simulated in-app, "real" = delegated to an external worker.
  mode: text("mode").default("demo").notNull(),
  workerId: text("worker_id"),
  startedAt: integer("started_at", { mode: "timestamp_ms" }),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const artifacts = sqliteTable("artifacts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  buildId: text("build_id")
    .notNull()
    .references(() => builds.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type", { enum: ["apk", "aab", "exe", "appbundle", "ipa"] }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  signed: integer("signed", { mode: "boolean" }).default(false).notNull(),
  // When produced by a REAL worker, the actual binary is stored here (base64)
  // so it can be downloaded verbatim. NULL means it was a demo artifact.
  realData: text("real_data"),
  sha256: text("sha256"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Real build workers (external machines with the Android toolchain)          */
/* -------------------------------------------------------------------------- */

export const buildWorkers = sqliteTable("build_workers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  token: text("token").notNull().unique(),
  os: text("os"),
  toolchain: text("toolchain", { mode: "json" }).$type<Record<string, string>>(),
  lastSeen: integer("last_seen", { mode: "timestamp_ms" }),
  online: integer("online", { mode: "boolean" }).default(false).notNull(),
  buildsRun: integer("builds_run").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

/* -------------------------------------------------------------------------- */
/*  AI Insights (Phase 5)                                                      */
/* -------------------------------------------------------------------------- */

export const aiInsights = sqliteTable("ai_insights", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  buildId: text("build_id")
    .notNull()
    .references(() => builds.id, { onDelete: "cascade" }),
  severity: text("severity", { enum: ["info", "warning", "error"] }).default("info").notNull(),
  title: text("title").notNull(),
  errorCode: text("error_code"),
  explanation: text("explanation").notNull(),
  suggestion: text("suggestion").notNull(),
  autoFixable: integer("auto_fixable", { mode: "boolean" }).default(false).notNull(),
  applied: integer("applied", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Toolchain (Phase 3)                                                        */
/* -------------------------------------------------------------------------- */

export const toolchain = sqliteTable("toolchain", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tool: text("tool").notNull().unique(), // git, jdk, android-sdk, gradle, flutter, node
  label: text("label").notNull(),
  version: text("version"),
  required: integer("required", { mode: "boolean" }).default(true).notNull(),
  state: text("state", { enum: ["installed", "missing", "required", "optional"] }).default("missing").notNull(),
  env: text("env", { mode: "json" }).$type<Record<string, string>>(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Signing configs (Phase 6)                                                  */
/* -------------------------------------------------------------------------- */

export const signingConfigs = sqliteTable("signing_configs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  keyAlias: text("key_alias").notNull(),
  storeName: text("store_name").notNull(),
  storePath: text("store_path"),
  validityYears: integer("validity_years").default(25).notNull(),
  configured: integer("configured", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Webhooks (Phase 6)                                                         */
/* -------------------------------------------------------------------------- */

export const webhooks = sqliteTable("webhooks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  label: text("label"),
  events: text("events", { mode: "json" }).$type<string[]>().default([]).notNull(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  lastDelivery: integer("last_delivery", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Notifications (Phase 7)                                                    */
/* -------------------------------------------------------------------------- */

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["build", "system", "ai", "security"] }).default("system").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: integer("read", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

// Chaves de API de IA (global, configurada pelo admin). provider: anthropic/openai/google.
export const aiSettings = sqliteTable("ai_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  provider: text("provider").notNull().default("anthropic"),
  apiKey: text("api_key"),
  model: text("model"),
  enabled: integer("enabled", { mode: "boolean" }).default(false).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Backups — snapshots of account config (projects, toolchain, webhooks)      */
/* -------------------------------------------------------------------------- */

export const backups = sqliteTable("backups", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  snapshot: text("snapshot", { mode: "json" }).notNull(),
  sizeBytes: integer("size_bytes").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Scheduled builds ("Agendamentos")                                         */
/* -------------------------------------------------------------------------- */

export const buildSchedules = sqliteTable("build_schedules", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  target: text("target", { enum: ["apk", "aab", "exe", "appbundle", "ipa"] }).default("apk").notNull(),
  frequency: text("frequency", { enum: ["daily", "weekly", "monthly"] }).default("daily").notNull(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  lastRunAt: integer("last_run_at", { mode: "timestamp_ms" }),
  nextRunAt: integer("next_run_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Support tickets                                                           */
/* -------------------------------------------------------------------------- */

export const supportTickets = sqliteTable("support_tickets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status", { enum: ["open", "answered", "closed"] }).default("open").notNull(),
  reply: text("reply"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Public release links — temporary shareable download URLs for artifacts    */
/* -------------------------------------------------------------------------- */

export const releaseLinks = sqliteTable("release_links", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  artifactId: text("artifact_id")
    .notNull()
    .references(() => artifacts.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  channel: text("channel").default("direct").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
});

/* -------------------------------------------------------------------------- */
/*  Shared JSON shapes                                                         */
/* -------------------------------------------------------------------------- */

export interface ProjectDetection {
  framework: "android" | "flutter" | "reactnative" | "unknown" | "web";
  language: string;
  buildSystem: string;
  files: { path: string; role: string }[];
  dependencies: { name: string; version: string }[];
  missing: { name: string; reason: string }[];
  warnings: { code: string; message: string; blocking: boolean }[];
  detectedSdk: number | null;
}

export const projectMembers = sqliteTable(
  "project_members",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").default("contributor").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);
