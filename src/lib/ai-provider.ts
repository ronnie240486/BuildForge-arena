import { db } from "@/db";
import { aiSettings } from "@/db/schema";

export interface AiConfig {
  provider: string;
  apiKey: string | null;
  model: string | null;
  enabled: boolean;
}

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-3-5-sonnet-20241022",
  openai: "gpt-4o-mini",
  google: "gemini-1.5-flash",
};

export async function getAiConfig(): Promise<AiConfig | null> {
  const [row] = await db.select().from(aiSettings).limit(1);
  if (!row) return null;
  return { provider: row.provider, apiKey: row.apiKey, model: row.model, enabled: row.enabled };
}

/**
 * Chama a IA real (Claude / GPT / Gemini) com o prompt dado.
 * Retorna o texto da resposta, ou null se não houver IA configurada/erro.
 */
export async function askAI(system: string, user: string): Promise<string | null> {
  const cfg = await getAiConfig();
  if (!cfg || !cfg.enabled || !cfg.apiKey) return null;
  const model = cfg.model || DEFAULT_MODELS[cfg.provider] || DEFAULT_MODELS.anthropic;

  try {
    if (cfg.provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": cfg.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.content?.[0]?.text ?? null;
    }

    if (cfg.provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_tokens: 1024,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.choices?.[0]?.message?.content ?? null;
    }

    if (cfg.provider === "google") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cfg.apiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
          }),
        },
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

// Testa se a chave funciona (retorna true/false).
export async function testAI(): Promise<boolean> {
  const r = await askAI("You are a helper.", "Responda apenas: OK");
  return Boolean(r && r.toLowerCase().includes("ok"));
}
