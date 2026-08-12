import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  appendWorkerLog,
  analyzeBuildWithAi,
  claimBuildForWorker,
  completeWorkerBuild,
  createWorkspaceBackup,
  createWebviewProject,
  createBuild,
  createProject,
  createTemplateProject,
  getArtifactDownload,
  getBuildDetails,
  getDashboardData,
  getBackupDownload,
  listAuditEvents,
  listArtifacts,
  listBuilds,
  listBackups,
  listProjects,
  listTemplates,
  listSigningKeys,
  listUsersForAdmin,
  listWorkers,
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

function actorFromUser(user: NonNullable<Parameters<typeof getDashboardData>[0]>) {
  return { id: user.id, role: user.role };
}

function toTrpcError(error: unknown) {
  return new TRPCError({
    code: error instanceof Error && error.message.includes("não autorizado") ? "FORBIDDEN" : "BAD_REQUEST",
    message: error instanceof Error ? error.message : "Não foi possível concluir a operação.",
  });
}

export const buildforgeRouter = router({
  dashboard: router({
    summary: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await getDashboardData(actorFromUser(ctx.user));
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
  }),
  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await listProjects(actorFromUser(ctx.user));
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    create: protectedProcedure
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
    uploadZip: protectedProcedure
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
    list: protectedProcedure.input(z.object({ projectId: z.number().int().positive().optional() }).optional()).query(async ({ ctx, input }) => {
      try {
        return await listBuilds(actorFromUser(ctx.user), input?.projectId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    create: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive(), artifact: z.enum(["apk", "aab"]) }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await createBuild({ actor: actorFromUser(ctx.user), ...input });
        } catch (error) {
          throw toTrpcError(error);
        }
      }),
    cancel: protectedProcedure.input(z.object({ buildId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try {
        await requestBuildCancellation(actorFromUser(ctx.user), input.buildId);
        return { success: true };
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    details: protectedProcedure.input(z.object({ buildId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      try {
        return await getBuildDetails(actorFromUser(ctx.user), input.buildId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    retryWithAi: protectedProcedure.input(z.object({ buildId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try {
        return await retryBuildWithApprovedFixes(actorFromUser(ctx.user), input.buildId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
  }),
  workers: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await listWorkers(actorFromUser(ctx.user));
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    register: protectedProcedure
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
    list: protectedProcedure.input(z.object({ projectId: z.number().int().positive().optional() }).optional()).query(async ({ ctx, input }) => {
      try {
        return await listArtifacts(actorFromUser(ctx.user), input?.projectId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    upload: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive(), buildId: z.number().int().positive().optional(), type: z.enum(["apk", "aab", "keystore", "log", "source"]), filename: z.string().min(1).max(255), contentType: z.string().max(120), contentBase64: z.string().min(4).max(56_000_000) }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await uploadArtifact({ actor: actorFromUser(ctx.user), ...input });
        } catch (error) {
          throw toTrpcError(error);
        }
      }),
    download: protectedProcedure.input(z.object({ artifactId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try {
        return await getArtifactDownload(actorFromUser(ctx.user), input.artifactId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
  }),
  ai: router({
    analyze: protectedProcedure.input(z.object({ buildId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try {
        return await analyzeBuildWithAi(actorFromUser(ctx.user), input.buildId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    decide: protectedProcedure.input(z.object({ fixId: z.number().int().positive(), status: z.enum(["approved", "rejected"]) })).mutation(async ({ ctx, input }) => {
      try {
        await setAiFixStatus(actorFromUser(ctx.user), input.fixId, input.status);
        return { success: true };
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
  }),
  releases: router({
    createWebview: protectedProcedure.input(z.object({ siteUrl: z.string().url().max(2048), appName: z.string().trim().min(2).max(120), permissions: z.array(z.enum(["internet", "camera", "location", "notifications", "storage"])).max(5), allowNavigation: z.boolean() })).mutation(async ({ ctx, input }) => {
      try {
        return await createWebviewProject({ actor: actorFromUser(ctx.user), ...input });
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    signingKeys: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await listSigningKeys(actorFromUser(ctx.user));
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    uploadSigningKey: protectedProcedure.input(z.object({ label: z.string().trim().min(2).max(120), alias: z.string().trim().min(1).max(160), filename: z.string().min(1).max(255), contentBase64: z.string().min(4).max(14_000_000) })).mutation(async ({ ctx, input }) => {
      try {
        return await uploadSigningKey({ actor: actorFromUser(ctx.user), ...input });
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
  }),
  backups: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await listBackups(actorFromUser(ctx.user));
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    create: protectedProcedure.mutation(async ({ ctx }) => {
      try {
        return await createWorkspaceBackup(actorFromUser(ctx.user));
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    download: protectedProcedure.input(z.object({ backupId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try {
        return await getBackupDownload(actorFromUser(ctx.user), input.backupId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    restore: protectedProcedure.input(z.object({ backupId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try {
        return await restoreWorkspaceBackup(actorFromUser(ctx.user), input.backupId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
  }),
  templates: router({
    list: protectedProcedure.query(async () => {
      try {
        return await listTemplates();
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    createProject: protectedProcedure.input(z.object({ templateId: z.number().int().positive(), name: z.string().trim().min(2).max(180).optional() })).mutation(async ({ ctx, input }) => {
      try {
        return await createTemplateProject({ actor: actorFromUser(ctx.user), ...input });
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
  }),
  admin: router({
    users: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await listUsersForAdmin(actorFromUser(ctx.user));
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    audit: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await listAuditEvents(actorFromUser(ctx.user));
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
    updateUser: protectedProcedure
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
