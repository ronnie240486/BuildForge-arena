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
});
