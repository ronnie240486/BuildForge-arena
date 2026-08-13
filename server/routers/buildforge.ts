import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  appendWorkerLog,
  analyzeBuildWithAi,
  claimBuildForWorker,
  completeWorkerBuild,
  createWebhook,
  createWorkspaceBackup,
  createWebviewProject,
  createBuild,
  createProject,
  createTemplateProject,
  generateStarterApp,
  getArtifactDownload,
  getBuildDetails,
  getDashboardData,
  getBackupDownload,
  deleteWebhook,
  listAuditEvents,
  listArtifacts,
  listBuilds,
  listBackups,
  listProjects,
  listTemplates,
  listSigningKeys,
  listUsersForAdmin,
  listWorkers,
  listWebhooks,
  planProjectMigration,
  heartbeatWorker,
  registerWorker,
  requestBuildCancellation,
  retryBuildWithApprovedFixes,
  restoreWorkspaceBackup,
  setAiFixStatus,
  uploadArtifact,
  uploadProjectZip,
  uploadSigningKey,
  updateUserAccess,
} from "../buildforge-db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { createClientByAdmin } from "../client-auth";

function actorFromUser(user: NonNullable<Parameters<typeof getDashboardData>[0]>) {
  return { id: user.id, role: user.role };
}

function toTrpcError(error: unknown) {
  return new TRPCError({
    code: error instanceof Error && error.message.includes("não autorizado") ? "FORBIDDEN" : "BAD_REQUEST",
    message: error instanceof Error ? error.message : "Não foi possível concluir a operação.",
  });
}

type WorkspaceTool = "dashboard" | "projects" | "builds" | "artifacts" | "releases" | "support";

function toolProcedure(tool: WorkspaceTool) {
  return protectedProcedure.use(({ ctx, next }) => {
    if (ctx.user.role === "admin") return next();
    const allowedTools = Array.isArray(ctx.user.allowedTools) ? ctx.user.allowedTools : [];
    if (!allowedTools.includes(tool)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Esta ferramenta não foi liberada para a sua conta." });
    }
    return next();
  });
}

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Esta área é exclusiva para administradores." });
  }
  return next();
});

export const buildforgeRouter = router({
  dashboard: router({
    summary: toolProcedure("dashboard").query(async ({ ctx }) => {
      try {
        return await getDashboardData(actorFromUser(ctx.user));
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
  }),
  projects: router({
    list: toolProcedure("projects").query(async ({ ctx }) => {
      try {
        return await listProjects(actorFromUser(ctx.user));
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    create: toolProcedure("projects")
      .input(z.object({
        name: z.string().trim().min(2).max(180),
        description: z.string().trim().max(2000).optional(),
        source: z.enum(["github", "git", "zip", "template", "webview"]),
        reference: z.string().trim().max(2048).optional(),
        branch: z.string().trim().max(160).optional(),
        templateSlug: z.string().trim().max(80).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await createProject({ actor: actorFromUser(ctx.user), ...input });
        } catch (error) {
          throw toTrpcError(error);
        }
      }),
    uploadZip: toolProcedure("projects")
      .input(z.object({ projectId: z.number().int().positive(), filename: z.string().min(1).max(255), contentBase64: z.string().min(4).max(56_000_000) }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await uploadProjectZip({ actor: actorFromUser(ctx.user), ...input });
        } catch (error) {
          throw toTrpcError(error);
        }
      }),
  }),
  builds: router({
    list: toolProcedure("builds").input(z.object({ projectId: z.number().int().positive().optional() }).optional()).query(async ({ ctx, input }) => {
      try {
        return await listBuilds(actorFromUser(ctx.user), input?.projectId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    create: toolProcedure("builds")
      .input(z.object({ projectId: z.number().int().positive(), artifact: z.enum(["apk", "aab"]), signingKeyId: z.number().int().positive().optional() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await createBuild({ actor: actorFromUser(ctx.user), ...input });
        } catch (error) {
          throw toTrpcError(error);
        }
      }),
    cancel: toolProcedure("builds").input(z.object({ buildId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try {
        await requestBuildCancellation(actorFromUser(ctx.user), input.buildId);
        return { success: true };
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    details: toolProcedure("builds").input(z.object({ buildId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      try {
        return await getBuildDetails(actorFromUser(ctx.user), input.buildId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    retryWithAi: toolProcedure("builds").input(z.object({ buildId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try {
        return await retryBuildWithApprovedFixes(actorFromUser(ctx.user), input.buildId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
  }),
  workers: router({
    list: adminProcedure.query(async ({ ctx }) => {
      try {
        return await listWorkers(actorFromUser(ctx.user));
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    register: adminProcedure
      .input(z.object({ name: z.string().trim().min(2).max(120), kind: z.enum(["local", "github_actions", "docker"]), capabilities: z.array(z.string().min(1).max(60)).min(1).max(20), maxConcurrency: z.number().int().min(1).max(8) }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await registerWorker({ actor: actorFromUser(ctx.user), ...input });
        } catch (error) {
          throw toTrpcError(error);
        }
      }),
    heartbeat: publicProcedure.input(z.object({ token: z.string().min(20), activeBuilds: z.number().int().min(0).max(8).optional() })).mutation(async ({ input }) => {
      try {
        return await heartbeatWorker(input);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    claim: publicProcedure.input(z.object({ token: z.string().min(20) })).mutation(async ({ input }) => {
      try {
        return await claimBuildForWorker(input.token);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    log: publicProcedure.input(z.object({ token: z.string().min(20), buildId: z.number().int().positive(), sequence: z.number().int().min(3), level: z.string().min(1).max(16), message: z.string().min(1).max(10000), progress: z.number().int().min(0).max(99).optional() })).mutation(async ({ input }) => {
      try {
        await appendWorkerLog(input);
        return { success: true };
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    complete: publicProcedure.input(z.object({ token: z.string().min(20), buildId: z.number().int().positive(), status: z.enum(["succeeded", "failed", "cancelled"]), summary: z.string().max(10000).optional(), appliedFixIds: z.array(z.number().int().positive()).max(3).optional(), artifactId: z.number().int().positive().optional() })).mutation(async ({ input }) => {
      try {
        await completeWorkerBuild(input);
        return { success: true };
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
  }),
  artifacts: router({
    list: toolProcedure("artifacts").input(z.object({ projectId: z.number().int().positive().optional() }).optional()).query(async ({ ctx, input }) => {
      try {
        return await listArtifacts(actorFromUser(ctx.user), input?.projectId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    upload: toolProcedure("artifacts")
      .input(z.object({ projectId: z.number().int().positive(), buildId: z.number().int().positive().optional(), type: z.enum(["apk", "aab", "keystore", "log", "source"]), filename: z.string().min(1).max(255), contentType: z.string().max(120), contentBase64: z.string().min(4).max(56_000_000) }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await uploadArtifact({ actor: actorFromUser(ctx.user), ...input });
        } catch (error) {
          throw toTrpcError(error);
        }
      }),
    download: toolProcedure("artifacts").input(z.object({ artifactId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try {
        return await getArtifactDownload(actorFromUser(ctx.user), input.artifactId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
  }),
  ai: router({
    analyze: adminProcedure.input(z.object({ buildId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try {
        return await analyzeBuildWithAi(actorFromUser(ctx.user), input.buildId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    decide: adminProcedure.input(z.object({ fixId: z.number().int().positive(), status: z.enum(["approved", "rejected"]) })).mutation(async ({ ctx, input }) => {
      try {
        await setAiFixStatus(actorFromUser(ctx.user), input.fixId, input.status);
        return { success: true };
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
  }),
  releases: router({
    createWebview: toolProcedure("releases").input(z.object({ siteUrl: z.string().url().max(2048), appName: z.string().trim().min(2).max(120), permissions: z.array(z.enum(["internet", "camera", "location", "notifications", "storage"])).max(5), allowNavigation: z.boolean(), icon: z.object({ filename: z.string().min(1).max(255), contentType: z.string().startsWith("image/"), contentBase64: z.string().min(4).max(7_000_000) }).optional(), splash: z.object({ filename: z.string().min(1).max(255), contentType: z.string().startsWith("image/"), contentBase64: z.string().min(4).max(7_000_000) }).optional() })).mutation(async ({ ctx, input }) => {
      try {
        return await createWebviewProject({ actor: actorFromUser(ctx.user), ...input });
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    signingKeys: toolProcedure("releases").query(async ({ ctx }) => {
      try {
        return await listSigningKeys(actorFromUser(ctx.user));
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    uploadSigningKey: toolProcedure("releases").input(z.object({ label: z.string().trim().min(2).max(120), alias: z.string().trim().min(1).max(255), filename: z.string().min(1).max(255), contentBase64: z.string().min(4).max(14_000_000), storePassword: z.string().max(512).optional(), keyPassword: z.string().max(512).optional() })).mutation(async ({ ctx, input }) => {
      try {
        return await uploadSigningKey({ actor: actorFromUser(ctx.user), ...input });
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
  }),
  backups: router({
    list: adminProcedure.query(async ({ ctx }) => {
      try {
        return await listBackups(actorFromUser(ctx.user));
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    create: adminProcedure.mutation(async ({ ctx }) => {
      try {
        return await createWorkspaceBackup(actorFromUser(ctx.user));
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    download: adminProcedure.input(z.object({ backupId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try {
        return await getBackupDownload(actorFromUser(ctx.user), input.backupId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    restore: adminProcedure.input(z.object({ backupId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try {
        return await restoreWorkspaceBackup(actorFromUser(ctx.user), input.backupId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
  }),
  templates: router({
    list: adminProcedure.query(async () => {
      try {
        return await listTemplates();
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    createProject: adminProcedure.input(z.object({ templateId: z.number().int().positive(), name: z.string().trim().min(2).max(180).optional() })).mutation(async ({ ctx, input }) => {
      try {
        return await createTemplateProject({ actor: actorFromUser(ctx.user), ...input });
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
  }),
  studio: router({
    generateApp: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(180), framework: z.enum(["android", "flutter", "react_native"]), prompt: z.string().trim().min(12).max(6000) })).mutation(async ({ ctx, input }) => {
      try { return await generateStarterApp({ actor: actorFromUser(ctx.user), ...input }); }
      catch (error) { throw toTrpcError(error); }
    }),
    planMigration: adminProcedure.input(z.object({ target: z.enum(["android", "flutter", "react_native"]), sourceDescription: z.string().trim().min(12).max(8000) })).mutation(async ({ ctx, input }) => {
      try { return await planProjectMigration({ actor: actorFromUser(ctx.user), ...input }); }
      catch (error) { throw toTrpcError(error); }
    }),
  }),
  webhooks: router({
    list: adminProcedure.query(async ({ ctx }) => {
      try { return await listWebhooks(actorFromUser(ctx.user)); }
      catch (error) { throw toTrpcError(error); }
    }),
    create: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(120), url: z.string().url().max(2048), events: z.array(z.enum(["build_queued", "build_succeeded", "build_failed"])).min(1).max(3), secret: z.string().max(512).optional() })).mutation(async ({ ctx, input }) => {
      try { return await createWebhook({ actor: actorFromUser(ctx.user), ...input }); }
      catch (error) { throw toTrpcError(error); }
    }),
    delete: adminProcedure.input(z.object({ webhookId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try { await deleteWebhook({ actor: actorFromUser(ctx.user), webhookId: input.webhookId }); return { success: true }; }
      catch (error) { throw toTrpcError(error); }
    }),
  }),
  admin: router({
    createClient: adminProcedure
      .input(z.object({ name: z.string().trim().min(2).max(120), email: z.string().email().max(320), password: z.string().min(8).max(128), buildLimit: z.number().int().min(-1).max(100000), allowedTools: z.array(z.enum(["dashboard", "projects", "builds", "artifacts", "releases", "support"])) .min(1).max(6) }))
      .mutation(async ({ ctx, input }) => {
        return createClientByAdmin(input);
      }),
    users: adminProcedure.query(async ({ ctx }) => {
      try {
        return await listUsersForAdmin(actorFromUser(ctx.user));
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    audit: adminProcedure.query(async ({ ctx }) => {
      try {
        return await listAuditEvents(actorFromUser(ctx.user));
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    updateUser: adminProcedure
      .input(z.object({ userId: z.number().int().positive(), role: z.enum(["admin", "member"]), buildLimit: z.number().int().min(-1).max(100000) }))
      .mutation(async ({ ctx, input }) => {
        try {
          await updateUserAccess(actorFromUser(ctx.user), input);
          return { success: true };
        } catch (error) {
          throw toTrpcError(error);
        }
      }),
  }),
});
