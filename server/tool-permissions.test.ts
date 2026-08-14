import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createClientContext(allowedTools: string[]): TrpcContext {
  return {
    user: {
      id: 99,
      openId: "client-permissions-test",
      name: "Cliente de teste",
      email: "cliente@example.com",
      loginMethod: "client_password",
      role: "member",
      buildLimit: 3,
      buildsUsed: 0,
      allowedTools,
      avatarColor: "indigo",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("permissões de ferramentas", () => {
  it("bloqueia a visão geral quando ela não foi liberada ao cliente", async () => {
    const caller = appRouter.createCaller(createClientContext(["projects"]));

    await expect(caller.buildforge.dashboard.summary()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Esta ferramenta não foi liberada para a sua conta.",
    });
  });

  it("bloqueia a criação de builds quando a ferramenta não foi liberada", async () => {
    const caller = appRouter.createCaller(createClientContext(["projects"]));

    await expect(caller.buildforge.builds.create({ projectId: 1, artifact: "apk" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Esta ferramenta não foi liberada para a sua conta.",
    });
    await expect(caller.buildforge.builds.create({ projectId: 1, artifact: "aab" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Esta ferramenta não foi liberada para a sua conta.",
    });
  });

  it("bloqueia a administração para contas de clientes", async () => {
    const caller = appRouter.createCaller(createClientContext(["dashboard", "projects", "builds"]));

    await expect(caller.buildforge.admin.users()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Esta área é exclusiva para administradores.",
    });
  });

  it("bloqueia APIs administrativas ocultas, como templates e webhooks", async () => {
    const caller = appRouter.createCaller(createClientContext(["dashboard", "projects", "builds"]));

    await expect(caller.buildforge.templates.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Esta área é exclusiva para administradores.",
    });
    await expect(caller.buildforge.webhooks.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Esta área é exclusiva para administradores.",
    });
  });

  it("não permite exclusão direta por uma conta cliente sem a ferramenta ou papel exigidos", async () => {
    const caller = appRouter.createCaller(createClientContext(["dashboard"]));

    await expect(caller.buildforge.projects.delete({ projectId: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Esta ferramenta não foi liberada para a sua conta.",
    });
    await expect(caller.buildforge.workers.delete({ workerId: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Esta área é exclusiva para administradores.",
    });
    await expect(caller.buildforge.projects.deleteAll()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Esta área é exclusiva para administradores.",
    });
    await expect(caller.buildforge.builds.deleteAll()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Esta área é exclusiva para administradores.",
    });
  });

  it("bloqueia configurações GitHub administrativas e sincronização do Studio para clientes", async () => {
    const caller = appRouter.createCaller(createClientContext(["dashboard"]));

    await expect(caller.buildforge.github.save({ projectId: 1, repository: "org/projeto", branch: "main", webhookSecret: "segredo-de-webhook-seguro", autoBuild: true, requestedArtifact: "apk" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.buildforge.studio.saveGithubCredential({ token: "ghp_123456789012345678901234567890123456" })).rejects.toMatchObject({ code: "FORBIDDEN", message: "Esta área é exclusiva para administradores." });
    await expect(caller.buildforge.studio.syncToGithub({ projectId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN", message: "Esta área é exclusiva para administradores." });
  });

  it("bloqueia consultas e alterações de organizações e membros para clientes", async () => {
    const caller = appRouter.createCaller(createClientContext(["dashboard", "projects", "builds", "support"]));

    await expect(caller.buildforge.organizations.list()).rejects.toMatchObject({ code: "FORBIDDEN", message: "Esta área é exclusiva para administradores." });
    await expect(caller.buildforge.organizations.members({ organizationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN", message: "Esta área é exclusiva para administradores." });
    await expect(caller.buildforge.organizations.saveMember({ organizationId: 1, userId: 2, role: "developer" })).rejects.toMatchObject({ code: "FORBIDDEN", message: "Esta área é exclusiva para administradores." });
    await expect(caller.buildforge.organizations.removeMember({ organizationId: 1, userId: 2 })).rejects.toMatchObject({ code: "FORBIDDEN", message: "Esta área é exclusiva para administradores." });
  });
});
