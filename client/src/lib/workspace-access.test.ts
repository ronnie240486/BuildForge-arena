import { describe, expect, it } from "vitest";
import { canAccessWorkspacePath } from "./workspace-access";

describe("acesso ao workspace", () => {
  it("mantém Configurações e Administração integralmente disponíveis ao administrador", () => {
    const admin = { role: "admin", allowedTools: [] };

    expect(canAccessWorkspacePath(admin, "/settings")).toBe(true);
    expect(canAccessWorkspacePath(admin, "/admin")).toBe(true);
    expect(canAccessWorkspacePath(admin, "/webhooks")).toBe(true);
  });

  it("bloqueia rotas administrativas para clientes e mantém somente ferramentas liberadas", () => {
    const client = { role: "member", allowedTools: ["dashboard", "projects", "builds"] };

    expect(canAccessWorkspacePath(client, "/projects")).toBe(true);
    expect(canAccessWorkspacePath(client, "/artifacts")).toBe(false);
    expect(canAccessWorkspacePath(client, "/settings")).toBe(false);
    expect(canAccessWorkspacePath(client, "/admin")).toBe(false);
  });
});
