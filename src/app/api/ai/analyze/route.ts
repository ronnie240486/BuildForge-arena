import { type InsightDraft } from "@/lib/engine";

export const dynamic = "force-dynamic";

interface Pattern {
  test: RegExp;
  insight: InsightDraft;
}

const PATTERNS: Pattern[] = [
  {
    test: /unresolved reference|cannot find symbol/i,
    insight: {
      severity: "error",
      title: "Referência não resolvida",
      errorCode: "UNRESOLVED_REFERENCE",
      explanation:
        "O compilador encontrou um símbolo (classe, função ou propriedade) que não está no classpath. Geralmente significa que uma dependência está ausente no build.gradle ou que o import está faltando.",
      suggestion:
        "Adicione a dependência correspondente em dependencies { } e sincronize o Gradle. Se for um símbolo local, verifique o import e o nome do pacote.",
      autoFixable: true,
    },
  },
  {
    test: /minsdk|minSdkVersion|requires .*api|api level/i,
    insight: {
      severity: "error",
      title: "minSdk incompatível",
      errorCode: "MINSDK_VIOLATION",
      explanation:
        "Uma dependência exige uma versão mínima do Android superior à declarada no projeto, então o Gradle bloqueia o merge do manifesto.",
      suggestion: "Aumente minSdk em defaultConfig { minSdk = N } para a versão exigida pela dependência.",
      autoFixable: true,
    },
  },
  {
    test: /unsupported class file|major version|invalid class file version/i,
    insight: {
      severity: "error",
      title: "Versão de bytecode/JDK incompatível",
      errorCode: "UNSUPPORTED_CLASS_VERSION",
      explanation:
        "O código foi compilado para um bytecode mais novo do que o JDK ativo consegue ler. Há divergência entre a toolchain do Gradle e o destino de compilação.",
      suggestion: "Alinhe jvmTarget, sourceCompatibility/targetCompatibility e a JVM do Gradle para o mesmo JDK (ex.: 17).",
      autoFixable: true,
    },
  },
  {
    test: /keystore|signingconfig|not signed|v2 signature/i,
    insight: {
      severity: "warning",
      title: "Problema de assinatura",
      errorCode: "UNSIGNED_RELEASE",
      explanation:
        "A variante de release não possui uma signingConfig, então o artefato não pode ser instalado ou publicado.",
      suggestion: "Gere um keystore (keytool) e anexe signingConfigs.release ao módulo, ou use a assinatura automática da BuildForge.",
      autoFixable: true,
    },
  },
  {
    test: /could not resolve|dependency|failed to resolve|no matching variant/i,
    insight: {
      severity: "error",
      title: "Falha ao resolver dependência",
      errorCode: "DEPENDENCY_RESOLUTION",
      explanation:
        "O Gradle não conseguiu baixar uma dependência. Pode ser repositório ausente (google()/mavenCentral()), versão inexistente ou problema de rede/cache.",
      suggestion: "Confirme o repositório e a versão, rode com --refresh-dependencies e verifique a conectividade.",
      autoFixable: false,
    },
  },
  {
    test: /out of memory|heap space|gc overhead|oom/i,
    insight: {
      severity: "error",
      title: "Memória insuficiente no build",
      errorCode: "OOM",
      explanation: "O daemon do Gradle estourou o heap durante dexing ou compilação.",
      suggestion: 'Aumente org.gradle.jvmargs no gradle.properties (ex.: "-Xmx4g") e ative org.gradle.parallel.',
      autoFixable: false,
    },
  },
  {
    test: /tls|ssl|handshake|certificate|sockettimeout/i,
    insight: {
      severity: "warning",
      title: "Falha de rede/TLS",
      errorCode: "NETWORK",
      explanation: "O build não conseguiu contatar um repositório remoto (timeout ou handshake TLS).",
      suggestion: "Verifique proxy/VPN, certificados corporativos e tente novamente com cache limpo.",
      autoFixable: false,
    },
  },
  {
    test: /null safety|null check|non-nullable|null is not a subtype/i,
    insight: {
      severity: "error",
      title: "Erro de null safety (Dart)",
      errorCode: "NULL_SAFETY",
      explanation: "O Dart em sound null safety impediu um uso potencialmente nulo.",
      suggestion: "Adicione verificação de nulo (! , ??, ou if (x != null)) ou marque o tipo como nullable (?).",
      autoFixable: false,
    },
  },
];

export async function POST(req: Request) {
  let text = "";
  try {
    const body = await req.json();
    text = String(body.text || "");
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!text.trim()) {
    return Response.json({ error: "Cole um trecho do log de erro." }, { status: 400 });
  }

  // 1) Tenta a IA REAL (Claude/GPT/Gemini) se estiver configurada.
  const { askAI } = await import("@/lib/ai-provider");
  const system =
    "Você é um especialista em builds Android/Flutter/React Native. Analise o erro de build e responda APENAS um JSON válido " +
    'no formato: {"insights":[{"severity":"error|warning|info","title":"...","errorCode":"...","explanation":"...","suggestion":"...","autoFixable":false}]}. ' +
    "Seja específico e prático em português.";
  const aiText = await askAI(system, "Erro de build:\n\n" + text.slice(0, 6000));
  if (aiText) {
    try {
      const jsonStr = aiText.slice(aiText.indexOf("{"), aiText.lastIndexOf("}") + 1);
      const parsed = JSON.parse(jsonStr);
      if (parsed?.insights?.length) {
        return Response.json({ insights: parsed.insights, source: "ai", analyzedAt: new Date().toISOString() });
      }
    } catch {
      // se a IA não devolveu JSON, cai para os padrões abaixo.
    }
  }

  // 2) Fallback: padrões locais (funciona sem chave de API).
  const matches = PATTERNS.filter((p) => p.test.test(text)).map((p) => p.insight);

  const insights =
    matches.length > 0
      ? matches
      : [
          {
            severity: "info" as const,
            title: "Nenhum padrão conhecido detectado",
            errorCode: "UNKNOWN",
            explanation:
              "A IA não reconheceu um erro específico no trecho enviado. Isso pode ser um erro de domínio novo ou um trecho muito curto.",
            suggestion:
              "Cole o trecho completo do stack trace (incluindo 'Caused by:') para uma análise mais precisa. A BuildForge aprende com novos padrões.",
            autoFixable: false,
          },
        ];

  return Response.json({ insights, source: "patterns", analyzedAt: new Date().toISOString() });
}
