import { askAI } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

interface Rule {
  pattern: string;
  auto: boolean;
  note: string;
}

const LABELS: Record<string, string> = {
  reactnative: "React Native",
  android: "Android (Kotlin)",
  flutter: "Flutter",
};

// Matriz completa: TODOS os 6 pares possíveis (fallback sem IA).
const MATRIX: Record<string, Rule[]> = {
  "reactnative->android": [
    { pattern: "Componentes de UI (View, Text, Button)", auto: true, note: "Mapeáveis para Compose (Box, Text, Button)." },
    { pattern: "Estado local (useState)", auto: true, note: "Conversível para remember + mutableStateOf." },
    { pattern: "Estilos StyleSheet", auto: true, note: "Conversível para Modifiers e Material3." },
    { pattern: "Chamadas HTTP (fetch/axios)", auto: true, note: "Substituíveis por Ktor/Retrofit." },
    { pattern: "Navegação (react-navigation)", auto: false, note: "Reescrever com Navigation Compose." },
    { pattern: "Hooks (useEffect)", auto: false, note: "Usar LaunchedEffect/DisposableEffect." },
    { pattern: "Bridge modules nativos", auto: false, note: "Reescrever em Kotlin caso a caso." },
  ],
  "android->reactnative": [
    { pattern: "Layouts XML/Compose", auto: true, note: "Mapeáveis para componentes JSX (View/Text)." },
    { pattern: "Recursos de string", auto: true, note: "Migráveis para i18n (JSON)." },
    { pattern: "Chamadas Retrofit/Ktor", auto: true, note: "Substituíveis por fetch/axios." },
    { pattern: "Activities/Fragments", auto: false, note: "Reescrever como telas + react-navigation." },
    { pattern: "ViewModel/LiveData", auto: false, note: "Adotar hooks/estado (Redux/Zustand)." },
    { pattern: "APIs nativas Kotlin", auto: false, note: "Reimplementar via módulos nativos/Expo." },
  ],
  "android->flutter": [
    { pattern: "Layouts XML", auto: true, note: "Estrutura conversível para árvores de Widgets." },
    { pattern: "Strings/Recursos", auto: true, note: "Migráveis para arb/l10n." },
    { pattern: "Chamadas de rede", auto: true, note: "Retrofit → dio/http." },
    { pattern: "Activities/Fragments", auto: false, note: "Reescrever como Widgets e rotas." },
    { pattern: "ViewModel + LiveData", auto: false, note: "Adotar ChangeNotifier/Riverpod." },
    { pattern: "APIs nativas", auto: false, note: "Usar platform channels no Dart." },
  ],
  "flutter->android": [
    { pattern: "Árvores de Widgets", auto: true, note: "Conversíveis para hierarquia Compose." },
    { pattern: "Animações implícitas", auto: true, note: "Mapeáveis para animate*AsState." },
    { pattern: "Temas/Material", auto: true, note: "Mapeável para Material3 Compose." },
    { pattern: "setState/gerência de estado", auto: false, note: "Reescrever com remember/ViewModel." },
    { pattern: "Plugins Dart (platform channels)", auto: false, note: "Substituir por APIs Kotlin." },
    { pattern: "Pacotes pub.dev específicos", auto: false, note: "Achar equivalente Android." },
  ],
  "reactnative->flutter": [
    { pattern: "Componentes de UI", auto: true, note: "View/Text → Container/Text (Widgets)." },
    { pattern: "Estilos StyleSheet", auto: true, note: "Conversível para propriedades de Widget/Theme." },
    { pattern: "Chamadas HTTP", auto: true, note: "fetch/axios → dio/http." },
    { pattern: "Navegação (react-navigation)", auto: false, note: "Reescrever com Navigator/go_router." },
    { pattern: "Hooks (useState/useEffect)", auto: false, note: "Adotar StatefulWidget/Riverpod." },
    { pattern: "Bridge modules nativos", auto: false, note: "Reescrever como plugins Flutter." },
  ],
  "flutter->reactnative": [
    { pattern: "Widgets de UI", auto: true, note: "Container/Text → View/Text (JSX)." },
    { pattern: "Temas", auto: true, note: "Mapeáveis para StyleSheet/tema RN." },
    { pattern: "Chamadas dio/http", auto: true, note: "Substituíveis por fetch/axios." },
    { pattern: "Gerência de estado (Provider/Riverpod)", auto: false, note: "Adotar hooks/Redux/Zustand." },
    { pattern: "Navigator/go_router", auto: false, note: "Reescrever com react-navigation." },
    { pattern: "Plugins/platform channels", auto: false, note: "Reimplementar via módulos nativos/Expo." },
  ],
};

function buildReport(from: string, to: string, rules: Rule[], source: string) {
  const auto = rules.filter((r) => r.auto);
  const manual = rules.filter((r) => !r.auto);
  const autoPct = Math.round((auto.length / rules.length) * 100);
  return {
    from,
    to,
    autoPct,
    auto,
    manual,
    source,
    summary: `${autoPct}% do código-base pode ser convertido automaticamente. ${manual.length} área(s) exigem intervenção humana.`,
  };
}

export async function POST(req: Request) {
  let from = "", to = "";
  try {
    const body = await req.json();
    from = String(body.from || "");
    to = String(body.to || "");
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  if (from === to) {
    return Response.json({ error: "Escolha tecnologias de origem e destino diferentes." }, { status: 400 });
  }

  // 1) Tenta a IA REAL para gerar um relatório sob medida de QUALQUER par.
  const system =
    "Você é um arquiteto de apps mobile. Gere um relatório de migração entre frameworks. " +
    'Responda APENAS JSON válido: {"rules":[{"pattern":"área do código","auto":true|false,"note":"explicação curta em português"}]}. ' +
    "Liste 6-8 áreas, marcando auto=true quando a conversão é mecânica e auto=false quando exige reescrita humana.";
  const aiText = await askAI(
    system,
    `Migração de ${LABELS[from] || from} para ${LABELS[to] || to}. Liste as áreas e o que é automático vs. manual.`,
  );
  if (aiText) {
    try {
      const jsonStr = aiText.slice(aiText.indexOf("{"), aiText.lastIndexOf("}") + 1);
      const parsed = JSON.parse(jsonStr);
      if (parsed?.rules?.length) {
        return Response.json(buildReport(LABELS[from] || from, LABELS[to] || to, parsed.rules, "ai"));
      }
    } catch {
      /* cai para a matriz */
    }
  }

  // 2) Fallback: matriz completa (todos os 6 pares).
  const rules = MATRIX[`${from}->${to}`];
  if (!rules) {
    return Response.json(
      { error: "Par de migração não suportado. Combine React Native, Android e Flutter." },
      { status: 400 },
    );
  }
  return Response.json(buildReport(LABELS[from] || from, LABELS[to] || to, rules, "matrix"));
}
