import { describe, expect, it } from "vitest";
import { decryptProviderApiKey, encryptProviderApiKey, extractExternalStudioText } from "./buildforge-db";
import { getStudioProviderStatus } from "./studio-providers";

describe("estado seguro dos provedores do Studio", () => {
  it("informa somente se uma chave está configurada, sem retornar o seu valor", () => {
    const providers = getStudioProviderStatus({ OPENAI_API_KEY: "sk-test", ANTHROPIC_API_KEY: "", GEMINI_API_KEY: undefined });
    expect(providers.find((provider) => provider.id === "openai")).toMatchObject({ configured: true });
    expect(providers.find((provider) => provider.id === "anthropic")).toMatchObject({ configured: false });
    expect(JSON.stringify(providers)).not.toContain("sk-test");
  });

  it("cifra chaves armazenadas para que elas não apareçam em texto aberto", () => {
    const encrypted = encryptProviderApiKey("sk-secret-value", "test-server-secret");
    expect(encrypted).not.toContain("sk-secret-value");
    expect(decryptProviderApiKey(encrypted, "test-server-secret")).toBe("sk-secret-value");
    expect(() => decryptProviderApiKey(encrypted, "wrong-secret")).toThrow();
  });

  it("interpreta as respostas de texto dos três provedores externos", () => {
    expect(extractExternalStudioText("openai", { output_text: "{\"scope\":\"ok\"}" })).toContain("scope");
    expect(extractExternalStudioText("anthropic", { content: [{ type: "text", text: "{\"scope\":\"ok\"}" }] })).toContain("scope");
    expect(extractExternalStudioText("gemini", { candidates: [{ content: { parts: [{ text: "{\"scope\":\"ok\"}" }] } }] })).toContain("scope");
  });
});
