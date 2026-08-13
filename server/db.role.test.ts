import { describe, expect, it } from "vitest";
import { roleUpdateFromOAuth } from "./db";

describe("papel persistido em login OAuth", () => {
  it("não atualiza o papel de um login OAuth comum para membro", () => {
    expect(roleUpdateFromOAuth({ openId: "oauth-admin-id", role: "member" })).toBeUndefined();
  });

  it("permite a promoção explícita a administrador", () => {
    expect(roleUpdateFromOAuth({ openId: "oauth-admin-id", role: "admin" })).toBe("admin");
  });
});
