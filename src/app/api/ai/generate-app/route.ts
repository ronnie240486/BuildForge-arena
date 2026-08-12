import { db } from "@/db";
import { projects, generatedFiles, notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { askAI, getAiConfig } from "@/lib/ai-provider";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Gera um app Android/Kotlin COMPLETO a partir de um prompt em linguagem natural.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const cfg = await getAiConfig();
  if (!cfg || !cfg.enabled || !cfg.apiKey) {
    return Response.json(
      { error: "Configure uma chave de IA (Claude/GPT/Gemini) em Configurações para usar o gerador." },
      { status: 400 },
    );
  }

  let prompt = "", appName = "", packageName = "";
  try {
    const body = await req.json();
    prompt = String(body.prompt || "").trim();
    appName = String(body.appName || "").trim();
    packageName = String(body.packageName || "").trim();
  } catch {
    return Response.json({ error: "Body inválido" }, { status: 400 });
  }
  if (prompt.length < 5) return Response.json({ error: "Descreva o app que deseja criar." }, { status: 400 });

  const finalName = appName || "MeuApp";
  const finalPkg = packageName || "com.buildforge." + finalName.toLowerCase().replace(/[^a-z0-9]/g, "");

  const system =
    "Você é um gerador de projetos Android nativos em Kotlin com Jetpack Compose. " +
    "Gere um projeto Android COMPLETO e COMPILÁVEL via Gradle (assembleRelease). " +
    "Responda APENAS um JSON válido, sem markdown, no formato: " +
    '{"files":[{"path":"caminho/relativo","content":"conteudo completo do arquivo"}]}. ' +
    "Inclua OBRIGATORIAMENTE: settings.gradle.kts, build.gradle.kts (raiz e app/), gradle.properties, " +
    "app/src/main/AndroidManifest.xml, MainActivity.kt em Compose, telas, e um tema Material3. " +
    "Use minSdk 24, targetSdk 34, compileSdk 34, Kotlin, AGP 8.5.0, Compose BOM 2024.09.00. " +
    "NÃO inclua a pasta gradle/wrapper (o worker adiciona). Código real e funcional, sem placeholders.";

  const userMsg =
    `Crie um app Android chamado "${finalName}" (package ${finalPkg}).\n\n` +
    `Descrição do que o app deve fazer:\n${prompt}\n\n` +
    "Gere todos os arquivos necessários para compilar um APK funcional.";

  const raw = await askAI(system, userMsg);
  if (!raw) return Response.json({ error: "A IA não respondeu. Verifique a chave em Configurações." }, { status: 502 });

  let files: { path: string; content: string }[] = [];
  try {
    const jsonStr = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonStr);
    files = (parsed.files || []).filter((f: { path?: string; content?: string }) => f && f.path && typeof f.content === "string");
  } catch {
    return Response.json({ error: "A IA retornou um formato inesperado. Tente novamente ou simplifique o pedido." }, { status: 502 });
  }
  if (!files.length) return Response.json({ error: "A IA não gerou arquivos. Tente reformular o pedido." }, { status: 502 });

  // Cria o projeto e salva os arquivos gerados.
  const [project] = await db
    .insert(projects)
    .values({
      ownerId: user.id,
      name: finalName,
      description: prompt.slice(0, 200),
      source: "manual",
      framework: "android",
      language: "Kotlin",
      packageName: finalPkg,
      appName: finalName,
      minSdk: 24,
      targetSdk: 34,
      status: "ready",
      aiPrompt: prompt,
      aiGenerated: true,
      detection: {
        framework: "android",
        language: "Kotlin",
        buildSystem: "Gradle (Kotlin DSL)",
        files: files.slice(0, 10).map((f) => ({ path: f.path, role: "gerado por IA" })),
        dependencies: [],
        missing: [],
        warnings: [],
        detectedSdk: 34,
      },
    })
    .returning();

  for (const f of files) {
    await db.insert(generatedFiles).values({ projectId: project.id, path: f.path.replace(/^\/+/, ""), content: f.content });
  }

  await db.insert(notifications).values({
    userId: user.id,
    type: "ai",
    title: "App gerado pela IA 🎉",
    message: `${finalName}: ${files.length} arquivos criados. Configure o ícone e dispare um build.`,
  });

  return Response.json({ ok: true, projectId: project.id, fileCount: files.length, files: files.map((f) => f.path) });
}
