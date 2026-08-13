import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const userRole = mysqlEnum("role", ["admin", "member", "user"]);
export const projectSource = mysqlEnum("project_source", ["github", "git", "zip", "template", "webview"]);
export const projectFramework = mysqlEnum("project_framework", ["android", "flutter", "react_native", "webview", "unknown"]);
export const projectStatus = mysqlEnum("project_status", ["active", "archived"]);
export const buildStatus = mysqlEnum("build_status", ["queued", "running", "succeeded", "failed", "cancelled"]);
export const workerKind = mysqlEnum("worker_kind", ["local", "github_actions", "docker"]);
export const workerStatus = mysqlEnum("worker_status", ["online", "offline", "disabled"]);
export const artifactType = mysqlEnum("artifact_type", ["apk", "aab", "keystore", "log", "source"]);
export const aiFixStatus = mysqlEnum("ai_fix_status", ["proposed", "approved", "applied", "rejected"]);
export const notificationEvent = mysqlEnum("notification_event", ["build_queued", "build_succeeded", "build_failed"]);
export const notificationStatus = mysqlEnum("notification_status", ["pending", "sent", "failed"]);

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    passwordHash: varchar("password_hash", { length: 255 }),
    role: userRole.notNull().default("member"),
    buildLimit: int("buildLimit").notNull().default(3),
    buildsUsed: int("buildsUsed").notNull().default(0),
    allowedTools: json("allowed_tools").$type<string[]>(),
    avatarColor: varchar("avatarColor", { length: 32 }).notNull().default("indigo"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
    lastSignedIn: timestamp("lastSignedIn").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

type DatabaseUser = typeof users.$inferSelect;
export type User = Omit<DatabaseUser, "role" | "buildLimit" | "buildsUsed" | "allowedTools" | "avatarColor" | "passwordHash"> & {
  role: "admin" | "member" | "user";
  buildLimit?: number;
  buildsUsed?: number;
  allowedTools?: string[] | null;
  avatarColor?: string;
};
export type InsertUser = typeof users.$inferInsert;

export const clientSessions = mysqlTable(
  "client_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  },
  (table) => [index("client_sessions_user_expires_idx").on(table.userId, table.expiresAt)],
);

export const projects = mysqlTable(
  "projects",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 180 }).notNull(),
    description: text("description"),
    source: projectSource.notNull().default("github"),
    framework: projectFramework.notNull().default("unknown"),
    status: projectStatus.notNull().default("active"),
    repoUrl: text("repo_url"),
    branch: varchar("branch", { length: 160 }).notNull().default("main"),
    sourceStorageKey: varchar("source_storage_key", { length: 512 }),
    templateSlug: varchar("template_slug", { length: 80 }),
    detectedAt: timestamp("detected_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [index("projects_owner_status_idx").on(table.ownerId, table.status)],
);

export const workers = mysqlTable(
  "workers",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    kind: workerKind.notNull(),
    status: workerStatus.notNull().default("offline"),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    capabilities: json("capabilities").$type<string[]>().notNull(),
    maxConcurrency: int("max_concurrency").notNull().default(1),
    activeBuilds: int("active_builds").notNull().default(0),
    lastHeartbeatAt: timestamp("last_heartbeat_at"),
    doctorStatus: varchar("doctor_status", { length: 24 }),
    doctorChecks: json("doctor_checks").$type<{ name: string; ok: boolean; detail?: string }[]>(),
    doctorCheckedAt: timestamp("doctor_checked_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [index("workers_owner_status_idx").on(table.ownerId, table.status)],
);

export const builds = mysqlTable(
  "builds",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    requestedById: int("requested_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    workerId: int("worker_id").references(() => workers.id, { onDelete: "set null" }),
    signingKeyId: int("signing_key_id").references(() => signingKeys.id, { onDelete: "set null" }),
    status: buildStatus.notNull().default("queued"),
    framework: projectFramework.notNull().default("unknown"),
    requestedArtifact: artifactType.notNull().default("apk"),
    progress: int("progress").notNull().default(0),
    queuePosition: int("queue_position"),
    versionName: varchar("version_name", { length: 80 }),
    versionCode: int("version_code"),
    cancellationRequested: boolean("cancellation_requested").notNull().default(false),
    summary: text("summary"),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("builds_project_created_idx").on(table.projectId, table.createdAt),
    index("builds_status_created_idx").on(table.status, table.createdAt),
  ],
);

export const buildLogs = mysqlTable(
  "build_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    buildId: int("build_id").notNull().references(() => builds.id, { onDelete: "cascade" }),
    sequence: int("sequence").notNull(),
    level: varchar("level", { length: 16 }).notNull().default("info"),
    message: text("message").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("build_logs_build_sequence_unique").on(table.buildId, table.sequence)],
);

export const artifacts = mysqlTable(
  "artifacts",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    buildId: int("build_id").references(() => builds.id, { onDelete: "set null" }),
    uploadedById: int("uploaded_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: artifactType.notNull(),
    filename: varchar("filename", { length: 255 }).notNull(),
    storageKey: varchar("storage_key", { length: 512 }).notNull().unique(),
    contentType: varchar("content_type", { length: 120 }),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("artifacts_project_type_idx").on(table.projectId, table.type)],
);

export const signingKeys = mysqlTable(
  "signing_keys",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 120 }).notNull(),
    alias: varchar("key_alias", { length: 160 }).notNull(),
    encryptedStorageKey: varchar("encrypted_storage_key", { length: 512 }).notNull(),
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("signing_keys_owner_label_unique").on(table.ownerId, table.label)],
);

export const aiFixes = mysqlTable(
  "ai_fixes",
  {
    id: int("id").autoincrement().primaryKey(),
    buildId: int("build_id").notNull().references(() => builds.id, { onDelete: "cascade" }),
    requestedById: int("requested_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: aiFixStatus.notNull().default("proposed"),
    model: varchar("model", { length: 120 }).notNull(),
    diagnosis: text("diagnosis").notNull(),
    explanation: text("explanation").notNull(),
    patch: text("patch").notNull(),
    affectedFiles: json("affected_files").$type<string[]>().notNull(),
    appliedAt: timestamp("applied_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [index("ai_fixes_build_status_idx").on(table.buildId, table.status)],
);

export const projectTemplates = mysqlTable(
  "project_templates",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull().unique(),
    name: varchar("name", { length: 120 }).notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    description: text("description").notNull(),
    framework: projectFramework.notNull().default("webview"),
    manifest: json("manifest").$type<Record<string, unknown>>().notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [index("templates_active_category_idx").on(table.active, table.category)],
);

export const webviewApps = mysqlTable(
  "webview_apps",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }).unique(),
    siteUrl: text("site_url").notNull(),
    appName: varchar("app_name", { length: 120 }).notNull(),
    iconArtifactId: int("icon_artifact_id").references(() => artifacts.id, { onDelete: "set null" }),
    splashArtifactId: int("splash_artifact_id").references(() => artifacts.id, { onDelete: "set null" }),
    permissions: json("permissions").$type<string[]>().notNull(),
    allowNavigation: boolean("allow_navigation").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
);

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    actorId: int("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 120 }).notNull(),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: varchar("entity_id", { length: 120 }),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("audit_logs_actor_created_idx").on(table.actorId, table.createdAt)],
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    buildId: int("build_id").notNull().references(() => builds.id, { onDelete: "cascade" }),
    event: notificationEvent.notNull(),
    status: notificationStatus.notNull().default("pending"),
    summary: text("summary").notNull(),
    artifactId: int("artifact_id").references(() => artifacts.id, { onDelete: "set null" }),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("notifications_status_created_idx").on(table.status, table.createdAt)],
);

export const webhooks = mysqlTable(
  "webhooks",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    url: varchar("url", { length: 2048 }).notNull(),
    events: json("events").$type<string[]>().notNull(),
    secret: varchar("secret", { length: 512 }),
    enabled: boolean("enabled").notNull().default(true),
    lastStatus: varchar("last_status", { length: 80 }),
    lastDeliveredAt: timestamp("last_delivered_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [index("webhooks_owner_created_idx").on(table.ownerId, table.createdAt)],
);

export const backups = mysqlTable(
  "backups",
  {
    id: int("id").autoincrement().primaryKey(),
    createdById: int("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    scope: varchar("scope", { length: 32 }).notNull().default("workspace"),
    storageKey: varchar("storage_key", { length: 512 }).notNull().unique(),
    checksum: varchar("checksum", { length: 128 }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("backups_created_by_created_idx").on(table.createdById, table.createdAt)],
);

export const systemMigrations = mysqlTable("system_migrations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull().unique(),
  appliedAt: timestamp("applied_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
