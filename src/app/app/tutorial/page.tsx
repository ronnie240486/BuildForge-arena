import { Card, Badge } from "@/components/ui";
import {
  GraduationCap,
  FolderPlus,
  Server,
  Hammer,
  Download,
  Sparkles,
  ShieldCheck,
  Rocket,
  CheckCircle2,
  Cpu,
  GitBranch,
} from "lucide-react";

export const dynamic = "force-dynamic";

const steps = [
  {
    icon: FolderPlus,
    title: "1. Importe seu projeto",
    color: "indigo",
    items: [
      "Vá em Projetos → Novo projeto.",
      "Escolha GitHub (cole a URL), Clonar ou Enviar ZIP.",
      "A IA detecta automaticamente a stack (Android, Flutter, React Native ou Web).",
    ],
  },
  {
    icon: Server,
    title: "2. Conecte um worker (só 1 vez)",
    color: "violet",
    items: [
      "Vá em Workers → Registrar → dê um nome → Gerar token.",
      "Baixe o Instalador (Windows/Mac/Linux) — já vem com seu token.",
      "Dê duplo-clique no arquivo. Ele detecta Node, Android SDK e JDK sozinho.",
      "Deixe a janela aberta: o worker fica online e pronto para compilar.",
    ],
  },
  {
    icon: Hammer,
    title: "3. Compile (build real)",
    color: "emerald",
    items: [
      "Abra o projeto → painel Compilar.",
      "Escolha o alvo: APK, AAB (Play Store), ou EXE (Windows, para web apps).",
      "Clique em Iniciar build REAL.",
      "Acompanhe os logs em tempo real (não precisa atualizar a página).",
    ],
  },
  {
    icon: Sparkles,
    title: "4. A IA cuida dos erros",
    color: "amber",
    items: [
      "Se o build falhar, a IA analisa o log e explica a causa.",
      "Ela sugere a correção — e aplica automaticamente quando possível.",
      "Corrija o que for do seu ambiente e clique em Compilar novamente.",
    ],
  },
  {
    icon: Download,
    title: "5. Baixe e publique",
    color: "sky",
    items: [
      "Build concluído → o artefato aparece com selo APK real.",
      "APK release sai assinado, pronto para instalar no celular.",
      "Para a Play Store: gere um AAB e siga o guia de publicação no build.",
    ],
  },
];

const faqs = [
  {
    q: "O que é um 'worker'?",
    a: "É um pequeno programa que roda na sua máquina (ou num servidor) com o Android SDK instalado. Ele é quem compila o APK de verdade. A BuildForge organiza tudo e entrega o resultado aqui.",
  },
  {
    q: "Preciso instalar alguma coisa?",
    a: "Depende de onde o worker roda. No PC: Node.js + Android Studio. Na nuvem (GitHub Actions): NADA — o computador do GitHub já tem tudo, e você faz tudo pelo navegador.",
  },
  {
    q: "Funciona pelo celular?",
    a: "Sim! O painel (importar, compilar, baixar APK, criar com IA) funciona no navegador do celular. Para compilar sem PC, use o worker na nuvem (GitHub Actions) — configurável em Workers. Aí você faz tudo 100% pelo celular, sem terminal.",
  },
  {
    q: "Meu app é um site (web). Dá para virar APK?",
    a: "Sim! A BuildForge empacota web apps em APK (via Capacitor) ou em EXE do Windows (via Electron) automaticamente.",
  },
  {
    q: "Consigo publicar na Google Play?",
    a: "Sim. Gere um build release (assinado automaticamente) ou um AAB, e siga o passo a passo que aparece no próprio build. Guarde bem o seu keystore.",
  },
  {
    q: "A IA corrige tudo sozinha?",
    a: "A IA explica os erros e aplica correções simples automaticamente. Erros de ambiente (ex.: falta JDK) são resolvidos por você seguindo as instruções — depois é só recompilar.",
  },
  {
    q: "Quantos builds eu tenho?",
    a: "Depende do seu plano. Contas de teste têm um número de builds definido pelo administrador; contas completas têm builds ilimitados.",
  },
];

const colorMap: Record<string, string> = {
  indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  sky: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
};

export default function TutorialPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6" />
          <h1 className="text-2xl font-semibold tracking-tight">Como usar a BuildForge</h1>
        </div>
        <p className="mt-2 max-w-2xl text-indigo-100">
          Do repositório ao APK instalável em 5 passos. Este guia mostra tudo — do zero à publicação na loja.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className="bg-white/15 text-white">Android</Badge>
          <Badge className="bg-white/15 text-white">Flutter</Badge>
          <Badge className="bg-white/15 text-white">React Native</Badge>
          <Badge className="bg-white/15 text-white">Web → APK/EXE</Badge>
        </div>
      </div>

      {/* Quick start em 30s */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Rocket className="h-4 w-4 text-indigo-500" />
          <h2 className="font-semibold">Resumo rápido</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { i: GitBranch, t: "Importar" },
            { i: Server, t: "Conectar worker" },
            { i: Hammer, t: "Compilar" },
            { i: Sparkles, t: "IA corrige" },
            { i: Download, t: "Baixar/Publicar" },
          ].map((s, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10">
                <s.i className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">{s.t}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Passos detalhados */}
      <div className="space-y-4">
        {steps.map((step) => (
          <Card key={step.title} className="p-5">
            <div className="flex items-start gap-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colorMap[step.color]}`}>
                <step.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{step.title}</h3>
                <ul className="mt-2 space-y-1.5">
                  {step.items.map((it, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Requisitos do worker */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-indigo-500" />
          <h2 className="font-semibold">O que o worker precisa</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { t: "Node.js", d: "Baixe em nodejs.org (versão LTS)" },
            { t: "Android Studio", d: "Já traz SDK + JDK (detectados sozinhos)" },
            { t: "Conexão de internet", d: "Para baixar dependências do build" },
          ].map((r) => (
            <div key={r.t} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-sm font-semibold">{r.t}</p>
              <p className="text-xs text-slate-400">{r.d}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Publicação */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <h2 className="font-semibold">Publicar na Google Play Store</h2>
        </div>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>Crie uma conta em play.google.com/console (taxa única de US$25).</li>
          <li>Gere um build <b>release</b> (APK/AAB) — a assinatura é automática.</li>
          <li>Em Criar app → Produção → Criar versão, envie o arquivo.</li>
          <li>Preencha a ficha (ícone, screenshots, descrição, política de privacidade).</li>
          <li>Responda a classificação e envie para revisão.</li>
        </ol>
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          ⚠️ Guarde seu keystore em segurança (fica em <code className="font-mono">~/.buildforge/release.keystore</code>).
          A Play Store exige a mesma chave em todas as atualizações.
        </p>
      </Card>

      {/* FAQ */}
      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Perguntas frequentes</h2>
        <div className="space-y-2">
          {faqs.map((f) => (
            <details key={f.q} className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
              <summary className="cursor-pointer text-sm font-medium">{f.q}</summary>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{f.a}</p>
            </details>
          ))}
        </div>
      </Card>
    </div>
  );
}
