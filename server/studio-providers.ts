export type StudioProviderId = "buildforge" | "openai" | "anthropic" | "gemini";

type KeyPresence = Partial<Record<"OPENAI_API_KEY" | "ANTHROPIC_API_KEY" | "GEMINI_API_KEY", string>>;

export const studioProviders = [
  { id: "buildforge", name: "BuildForge IA", family: "Modelos integrados", description: "Modelos já integrados e prontos para geração guiada.", configured: true },
  { id: "openai", name: "ChatGPT", family: "OpenAI", description: "Use a sua chave oficial da OpenAI para modelos ChatGPT.", configured: false },
  { id: "anthropic", name: "Claude", family: "Anthropic", description: "Use a sua chave oficial da Anthropic para modelos Claude.", configured: false },
  { id: "gemini", name: "Gemini", family: "Google", description: "Use a sua chave oficial do Google AI Studio para modelos Gemini.", configured: false },
] as const;

export function getStudioProviderStatus(env: KeyPresence = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
}) {
  return studioProviders.map((provider) => ({
    ...provider,
    configured: provider.id === "buildforge"
      ? true
      : provider.id === "openai"
        ? Boolean(env.OPENAI_API_KEY?.trim())
        : provider.id === "anthropic"
          ? Boolean(env.ANTHROPIC_API_KEY?.trim())
          : Boolean(env.GEMINI_API_KEY?.trim()),
  }));
}
