import { db } from "@/db";
import { projects, generatedFiles, notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { askAI, getAiConfig, AI_MAX_TOKENS_CODEGEN } from "@/lib/ai-provider";
import { fetchRepoTextFiles } from "@/lib/github-fetch";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Recria (melhor esforço, via IA) um projeto Android/Flutter/React Native já
// importado como um projeto web (Vite/React) equivalente, pronto pra passar
// pelo pipeline Web -> EXE já existente (buildWebToExe no worker). Não é uma
// tradução 1:1 — APIs nativas (ex.: player de mídia) viram equivalentes web
// (ex.: <video> HTML5).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let projectId = "";
  try {
    const body = await req.json();
    projectId = String(body.projectId || "");
  } catch {
    return Response.json({ error: "Body inválido" }, { status: 400 });
  }
  if (!projectId) return Response.json({ error: "projectId é obrigatório." }, { status: 400 });

  const [original] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!original || original.ownerId !== user.id) {
    return Response.json({ error: "Projeto não encontrado." }, { status: 404 });
  }

  if (original.source !== "github" || !original.repoUrl) {
    return Response.json(
      { error: "Recriar como Web só está disponível para projetos importados do GitHub." },
      { status: 400 },
    );
  }
  if (original.derivedFromProjectId || original.framework === "web") {
    return Response.json({ error: "Este projeto já é uma recriação Web." }, { status: 400 });
  }

  const cfg = await getAiConfig();
  if (!cfg || !cfg.enabled || !cfg.apiKey) {
    return Response.json(
      { error: "Configure uma chave de IA (Claude/GPT/Gemini) em Configurações para usar a recriação." },
      { status: 400 },
    );
  }

  const sourceFiles = await fetchRepoTextFiles(original.repoUrl, original.branch, user.githubToken ?? null);
  if (!sourceFiles) {
    return Response.json(
      {
        error:
          "Não consegui obter o código-fonte do repositório. Verifique se ele é público (ou se seu token do GitHub em Configurações tem acesso) e se a branch está correta.",
      },
      { status: 502 },
    );
  }

  const system =
    "Você é um engenheiro que recria apps mobile como apps web equivalentes, de MELHOR ESFORÇO — não é uma " +
    "tradução perfeita nem pixel-perfect. Gere um projeto Vite + React + TypeScript FUNCIONAL a partir do " +
    "código Android fornecido (telas, navegação e lógica de negócio principal). APIs específicas do Android " +
    "sem equivalente web direto (ex.: androidx.media3/ExoPlayer, sensores, notificações nativas) devem virar " +
    "o equivalente web mais próximo (ex.: player de mídia -> tag <video>/<audio> HTML5). " +
    "Responda APENAS um JSON válido, sem markdown, no formato: " +
    '{"files":[{"path":"caminho/relativo","content":"conteudo completo do arquivo"}]}. ' +
    "Inclua OBRIGATORIAMENTE na raiz: package.json (com script \"build\": \"vite build\" e dependências " +
    "react, react-dom, vite, @vitejs/plugin-react), index.html, vite.config.js, e o código-fonte em src/. " +
    "Código real e funcional, sem placeholders.";

  const sourceDump = sourceFiles.map((f) => `--- FILE: ${f.path} ---\n${f.content}`).join("\n\n");
  const userMsg =
    `Recrie como app web o projeto Android "${original.name}"` +
    (original.packageName ? ` (package ${original.packageName})` : "") +
    ".\n\nCódigo-fonte real do projeto (parcial, priorizado pelos arquivos mais relevantes):\n\n" +
    sourceDump +
    "\n\nGere todos os arquivos necessários para um app Vite+React funcional e buildável.";

  const raw = await askAI(system, userMsg, AI_MAX_TOKENS_CODEGEN);
  if (!raw) {
    return Response.json({ error: "A IA não respondeu. Verifique a chave em Configurações." }, { status: 502 });
  }

  let files: { path: string; content: string }[] = [];
  try {
    const jsonStr = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonStr);
    files = (parsed.files || []).filter((f: { path?: string; content?: string }) => f && f.path && typeof f.content === "string");
  } catch {
    return Response.json({ error: "A IA retornou um formato inesperado. Tente novamente." }, { status: 502 });
  }
  if (!files.length) return Response.json({ error: "A IA não gerou arquivos. Tente novamente." }, { status: 502 });

  // Valida que o worker vai conseguir detectar isso como projeto web (mesma
  // checagem que buildJob's isWeb faz depois) antes de gravar qualquer coisa.
  const normalizedPaths = files.map((f) => f.path.replace(/^\/+/, ""));
  const hasRootPackageJson = normalizedPaths.includes("package.json");
  const hasIndexHtml = normalizedPaths.includes("index.html");
  const hasViteConfig = normalizedPaths.some((p) => /^vite\.config\.(js|ts)$/.test(p));
  if (!hasRootPackageJson || !(hasIndexHtml || hasViteConfig)) {
    return Response.json(
      { error: "A IA gerou arquivos incompletos (faltando package.json/index.html/vite.config na raiz). Tente novamente." },
      { status: 502 },
    );
  }

  const [project] = await db
    .insert(projects)
    .values({
      ownerId: user.id,
      name: `${original.name} (Web)`,
      description: `Recriação web (IA, melhor esforço) de "${original.name}".`,
      source: "manual",
      framework: "web",
      language: "TypeScript",
      appName: original.appName || original.name,
      repoUrl: original.repoUrl,
      status: "ready",
      aiPrompt: `Recriar "${original.name}" como app web`,
      aiGenerated: true,
      derivedFromProjectId: original.id,
      detection: {
        framework: "web",
        language: "TypeScript",
        buildSystem: "Vite",
        files: files.slice(0, 10).map((f) => ({ path: f.path, role: "gerado por IA (recriação)" })),
        dependencies: [],
        missing: [],
        warnings: [],
        detectedSdk: null,
      },
    })
    .returning();

  for (const f of files) {
    await db.insert(generatedFiles).values({ projectId: project.id, path: f.path.replace(/^\/+/, ""), content: f.content });
  }

  await db.insert(notifications).values({
    userId: user.id,
    type: "ai",
    title: "Recriação Web gerada 🎉",
    message: `${original.name} (Web): ${files.length} arquivos criados. Dispare um build EXE pra gerar o instalador.`,
  });

  return Response.json({ ok: true, projectId: project.id, fileCount: files.length });
}
