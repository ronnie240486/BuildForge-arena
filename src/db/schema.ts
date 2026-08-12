import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/*  Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const userRole = pgEnum("user_role", ["admin", "member"]);

export const projectSource = pgEnum("project_source", [
  "github",
  "zip",
  "manual",
  "clone",
]);

export const projectStatus = pgEnum("project_status", [
  "ready",
  "building",
  "failed",
  "needs_setup",
  "archived",
]);

export const framework = pgEnum("framework", [
  "android",
  "flutter",
  "reactnative",
  "unknown",
]);

export const buildTarget = pgEnum("build_target", [
  "apk",
  "aab",
  "exe",
  "appbundle",
  "ipa",
]);

export const buildStatus = pgEnum("build_status", [
  "queued",
  "running",
  "success",
  "failed",
  "canceled",
]);

export const toolState = pgEnum("tool_state", [
  "installed",
  "missing",
  "required",
  "optional",
]);

export const insightSeverity = pgEnum("insight_severity", [
  "info",
  "warning",
  "error",
]);

export const notifType = pgEnum("notif_type", [
  "build",
  "system",
  "ai",
  "security",
]);

/* -------------------------------------------------------------------------- */
/*  Users & Sessions                                                           */
/* -------------------------------------------------------------------------- */

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").default("member").notNull(),
  avatarColor: text("avatar_color").default("indigo").notNull(),
  githubUser: text("github_user"),
  // Teste grátis: quantos builds o usuário pode disparar. O admin define por conta.
  // Admins têm builds ilimitados. -1 = ilimitado.
  buildLimit: integer("build_limit").default(3).notNull(),
  buildsUsed: integer("builds_used").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  token: text("token").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Projects                                                                   */
/* -------------------------------------------------------------------------- */

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  source: projectSource("source").default("github").notNull(),
  repoUrl: text("repo_url"),
  branch: text("branch").default("main").notNull(),
  commitSha: text("commit_sha"),
  framework: framework("framework").default("unknown").notNull(),
  language: text("language"), // kotlin / java / dart / typescript
  packageName: text("package_name"),
  minSdk: integer("min_sdk"),
  targetSdk: integer("target_sdk"),
  versionName: text("version_name").default("1.0.0").notNull(),
  status: projectStatus("status").default("ready").notNull(),
  // App metadata (para o APK): nome exibido e ícone (base64 png).
  appName: text("app_name"),
  iconData: text("icon_data"),
  // Site empacotado: URL do site que vira APK (WebView via Capacitor).
  webUrl: text("web_url"),
  // Projeto gerado por IA: guarda o prompt usado.
  aiPrompt: text("ai_prompt"),
  aiGenerated: boolean("ai_generated").default(false).notNull(),
  // detection result stored as JSON (deps, missing deps, warnings, files)
  detection: jsonb("detection").$type<ProjectDetection>(),
  healthScore: integer("health_score").default(100),
  lastBuildAt: timestamp("last_build_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Arquivos gerados pela IA (código-fonte do app criado por prompt).
export const generatedFiles = pgTable("generated_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Builds & Artifacts                                                         */
/* -------------------------------------------------------------------------- */

export const builds = pgTable("builds", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  target: buildTarget("target").default("apk").notNull(),
  variant: text("variant").default("release").notNull(),
  status: buildStatus("status").default("queued").notNull(),
  progress: integer("progress").default(0).notNull(),
  log: text("log").default("").notNull(),
  summary: text("summary"),
  durationMs: integer("duration_ms"),
  cacheHit: boolean("cache_hit").default(false),
  parallel: boolean("parallel").default(false),
  // "demo" = simulated in-app, "real" = delegated to an external worker.
  mode: text("mode").default("demo").notNull(),
  workerId: uuid("worker_id"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const artifacts = pgTable("artifacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  buildId: uuid("build_id")
    .notNull()
    .references(() => builds.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: buildTarget("type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  signed: boolean("signed").default(false).notNull(),
  // When produced by a REAL worker, the actual binary is stored here (base64)
  // so it can be downloaded verbatim. NULL means it was a demo artifact.
  realData: text("real_data"),
  sha256: text("sha256"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Real build workers (external machines with the Android toolchain)          */
/* -------------------------------------------------------------------------- */

export const buildWorkers = pgTable("build_workers", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  token: text("token").notNull().unique(),
  os: text("os"),
  toolchain: jsonb("toolchain").$type<Record<string, string>>(),
  lastSeen: timestamp("last_seen", { withTimezone: true }),
  online: boolean("online").default(false).notNull(),
  buildsRun: integer("builds_run").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------- */
/*  AI Insights (Phase 5)                                                      */
/* -------------------------------------------------------------------------- */

export const aiInsights = pgTable("ai_insights", {
  id: uuid("id").defaultRandom().primaryKey(),
  buildId: uuid("build_id")
    .notNull()
    .references(() => builds.id, { onDelete: "cascade" }),
  severity: insightSeverity("severity").default("info").notNull(),
  title: text("title").notNull(),
  errorCode: text("error_code"),
  explanation: text("explanation").notNull(),
  suggestion: text("suggestion").notNull(),
  autoFixable: boolean("auto_fixable").default(false).notNull(),
  applied: boolean("applied").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Toolchain (Phase 3)                                                        */
/* -------------------------------------------------------------------------- */

export const toolchain = pgTable("toolchain", {
  id: uuid("id").defaultRandom().primaryKey(),
  tool: text("tool").notNull().unique(), // git, jdk, android-sdk, gradle, flutter, node
  label: text("label").notNull(),
  version: text("version"),
  required: boolean("required").default(true).notNull(),
  state: toolState("state").default("missing").notNull(),
  env: jsonb("env").$type<Record<string, string>>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Signing configs (Phase 6)                                                  */
/* -------------------------------------------------------------------------- */

export const signingConfigs = pgTable("signing_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  keyAlias: text("key_alias").notNull(),
  storeName: text("store_name").notNull(),
  storePath: text("store_path"),
  validityYears: integer("validity_years").default(25).notNull(),
  configured: boolean("configured").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Webhooks (Phase 6)                                                         */
/* -------------------------------------------------------------------------- */

export const webhooks = pgTable("webhooks", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  label: text("label"),
  events: jsonb("events").$type<string[]>().default([]).notNull(),
  active: boolean("active").default(true).notNull(),
  lastDelivery: timestamp("last_delivery", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Notifications (Phase 7)                                                    */
/* -------------------------------------------------------------------------- */

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: notifType("type").default("system").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Chaves de API de IA (global, configurada pelo admin). provider: anthropic/openai/google.
export const aiSettings = pgTable("ai_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull().default("anthropic"),
  apiKey: text("api_key"),
  model: text("model"),
  enabled: boolean("enabled").default(false).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Shared JSON shapes                                                         */
/* -------------------------------------------------------------------------- */

export interface ProjectDetection {
  framework: "android" | "flutter" | "reactnative" | "unknown";
  language: string;
  buildSystem: string;
  files: { path: string; role: string }[];
  dependencies: { name: string; version: string }[];
  missing: { name: string; reason: string }[];
  warnings: { code: string; message: string; blocking: boolean }[];
  detectedSdk: number | null;
}

export const projectMembers = pgTable(
  "project_members",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").default("contributor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);
