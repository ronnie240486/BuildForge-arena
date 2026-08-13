import { describe, expect, it } from "vitest";
import type { User } from "../drizzle/schema";
import { resolvePersistedOAuthUser } from "./_core/context";

function oauthUser(role: User["role"]): User {
  return {
    id: 1,
    openId: "oauth-admin-id",
    name: "Administrador",
    email: "ronnie240486@gmail.com",
    loginMethod: "google",
    role,
    buildLimit: 3,
    buildsUsed: 0,
    allowedTools: null,
    avatarColor: "indigo",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

describe("contexto OAuth", () => {
  it("mantém o papel admin persistido mesmo quando a sessão chega com papel de membro", async () => {
    const sessionUser = oauthUser("member");
    const persistedAdmin = oauthUser("admin");

    const resolved = await resolvePersistedOAuthUser(sessionUser, async (openId) => {
      expect(openId).toBe("oauth-admin-id");
      return persistedAdmin;
    });

    expect(resolved?.role).toBe("admin");
    expect(resolved?.email).toBe("ronnie240486@gmail.com");
  });

  it("mantém a sessão OAuth original quando não há registro persistido", async () => {
    const sessionUser = oauthUser("member");

    await expect(resolvePersistedOAuthUser(sessionUser, async () => undefined)).resolves.toEqual(sessionUser);
  });
});
