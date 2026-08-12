import { describe, expect, it } from "vitest";
import { hashClientPassword, verifyClientPassword } from "./client-auth";

describe("client credentials", () => {
  it("hashes passwords with a salt and verifies only the matching value", async () => {
    const hash = await hashClientPassword("SenhaSegura#2026");
    expect(hash).not.toContain("SenhaSegura#2026");
    expect(await verifyClientPassword("SenhaSegura#2026", hash)).toBe(true);
    expect(await verifyClientPassword("senha-errada", hash)).toBe(false);
  });
});
