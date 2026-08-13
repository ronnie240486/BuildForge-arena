import { askAI } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  android: "Android nativo (Kotlin)",
  flutter: "Flutter",
  react_native: "React Native",
};

function fallbackRefinement(idea: string, framework: string, audience: string) {
  const label = LABELS[framework] || framework;
  return {
    scope: `App ${label} com base na ideia descrita, cobrindo o fluxo principal e uma tela de administração simples.`,
    professionalPrompt:
      `Crie um aplicativo ${label} para: ${idea}` +
      (audience ? ` Público-alvo: ${audience}.` : "") +
      " Inclua navegação clara, tratamento de erros e estados de carregamento, e uma tela inicial funcional.",
    questions: [
      "Quais são as 3 funcionalidades mais importantes para o primeiro lançamento?",
      "O app precisa de login de usuário, ou pode ser usado sem conta?",
      "Vai precisar salvar dados no dispositivo, ou tudo vem de uma API/backend?",
    ],
    suggestions: [
      "Adicionar modo escuro para melhorar a experiência.",
      "Incluir uma tela de onboarding explicando o app na primeira abertura.",
      "Prever notificações para trazer o usuário de volta.",
    ],
    model: "fallback",
  };
}

export async function POST(req: Request) {
  let idea = "", framework = "flutter", audience = "";
  try {
    const body = await req.json();
    idea = String(body.idea || "").trim();
    framework = String(body.framework || "flutter");
    audience = String(body.audience || "").trim();
  } catch {
    return Response.json({ error: "Body inválido" }, { status: 400 });
  }
  if (idea.length < 12) return Response.json({ error: "Descreva a ideia com um pouco mais de detalhe." }, { status: 400 });

  const label = LABELS[framework] || framework;
  const system =
    "Você é um consultor de produto que transforma ideias soltas em briefings profissionais para apps mobile. " +
    'Responda APENAS JSON válido no formato: {"scope":"resumo do escopo recomendado em 1-2 frases","professionalPrompt":"prompt detalhado e estruturado para gerar o app","questions":["pergunta 1","pergunta 2","pergunta 3"],"suggestions":["sugestão de valor 1","sugestão 2","sugestão 3"]}. Escreva tudo em português.';
  const user = `Stack: ${label}.${audience ? ` Público/objetivo: ${audience}.` : ""} Ideia do usuário: ${idea}`;

  const aiText = await askAI(system, user);
  if (aiText) {
    try {
      const jsonStr = aiText.slice(aiText.indexOf("{"), aiText.lastIndexOf("}") + 1);
      const parsed = JSON.parse(jsonStr);
      if (parsed?.professionalPrompt && Array.isArray(parsed.questions) && Array.isArray(parsed.suggestions)) {
        return Response.json({ ...parsed, model: "ai" });
      }
    } catch {
      /* cai para o fallback */
    }
  }

  return Response.json(fallbackRefinement(idea, framework, audience));
}
