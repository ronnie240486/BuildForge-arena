"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Badge } from "@/components/ui";
import {
  Wand2, Sparkles, FileCode2, Route, Bot, CheckCircle2, ListChecks, Lightbulb, Loader2, ArrowRight,
} from "lucide-react";

type Framework = "android" | "flutter" | "react_native";

const promptLibrary: { title: string; framework: Framework; audience: string; idea: string }[] = [
  { title: "Loja com catálogo", framework: "flutter", audience: "Pequenos lojistas e seus clientes", idea: "Aplicativo de loja com catálogo, busca, carrinho, pedidos, acompanhamento de entrega e painel de administração." },
  { title: "Agenda de serviços", framework: "flutter", audience: "Profissionais autônomos e clientes", idea: "Aplicativo para agendar serviços com agenda disponível, confirmação, lembretes, pagamentos e histórico de atendimentos." },
  { title: "Painel de entregas", framework: "react_native", audience: "Entregadores e operações locais", idea: "Aplicativo de entregas com rotas, atualização de status, prova de entrega, notificações e painel de pedidos." },
  { title: "WebView profissional", framework: "android", audience: "Empresas que precisam publicar seu portal em Android", idea: "Aplicativo Android WebView com login, navegação controlada, notificações e identidade visual da empresa." },
];

const fwLabel: Record<Framework, string> = { android: "Android nativo", flutter: "Flutter", react_native: "React Native" };

type Refinement = { scope: string; professionalPrompt: string; questions: string[]; suggestions: string[]; model: string };

export default function StudioPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"guide" | "generate" | "migrate">("guide");

  // Orientar ideia
  const [framework, setFramework] = useState<Framework>("flutter");
  const [idea, setIdea] = useState("");
  const [audience, setAudience] = useState("");
  const [refining, setRefining] = useState(false);
  const [refinement, setRefinement] = useState<Refinement | null>(null);
  const [refineError, setRefineError] = useState<string | null>(null);

  // Gerar aplicativo
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Planejar migração
  const [migFrom, setMigFrom] = useState("reactnative");
  const [migTo, setMigTo] = useState("android");
  const [sourceDescription, setSourceDescription] = useState("");
  const [migrating, setMigrating] = useState(false);
  const [migError, setMigError] = useState<string | null>(null);
  const [migReport, setMigReport] = useState<null | { autoPct: number; auto: { pattern: string; note: string }[]; manual: { pattern: string; note: string }[]; summary: string }>(null);

  async function refineIdea() {
    setRefining(true);
    setRefineError(null);
    setRefinement(null);
    try {
      const res = await fetch("/api/ai/refine-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, framework, audience }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao orientar a ideia");
      setRefinement(data);
    } catch (e) {
      setRefineError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setRefining(false);
    }
  }

  function useProfessionalPrompt() {
    if (!refinement) return;
    setPrompt(refinement.professionalPrompt);
    setTab("generate");
  }

  async function generateApp() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/ai/generate-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, appName: name, packageName: "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao gerar o app");
      router.push(`/app/projects/${data.projectId}`);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setGenerating(false);
    }
  }

  async function planMigration() {
    setMigrating(true);
    setMigError(null);
    setMigReport(null);
    try {
      const res = await fetch("/api/ai/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: migFrom, to: migTo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Roteiro indisponível");
      setMigReport(data);
    } catch (e) {
      setMigError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setMigrating(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">Studio IA</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Studio de aplicativos</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
          Comece com uma ideia, deixe a IA levantar as perguntas certas e gere um prompt profissional antes de criar o projeto.
        </p>
      </div>

      <div className="grid grid-cols-3 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
        <button onClick={() => setTab("guide")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === "guide" ? "bg-violet-600 text-white" : "text-slate-500"}`}>Orientar ideia</button>
        <button onClick={() => setTab("generate")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === "generate" ? "bg-violet-600 text-white" : "text-slate-500"}`}>Gerar aplicativo</button>
        <button onClick={() => setTab("migrate")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === "migrate" ? "bg-violet-600 text-white" : "text-slate-500"}`}>Planejar migração</button>
      </div>

      {tab === "guide" && (
        <div className="grid gap-5 lg:grid-cols-[.95fr_1.05fr]">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600"><Wand2 className="h-5 w-5" /></span>
              <div>
                <h2 className="font-semibold">Transformar ideia em briefing profissional</h2>
                <p className="text-xs text-slate-500">A IA organiza o escopo, sugere melhorias e pergunta o que falta.</p>
              </div>
            </div>

            <p className="mt-5 text-sm font-medium text-slate-700 dark:text-slate-300">Biblioteca de prompts</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {promptLibrary.map((item) => (
                <button
                  key={item.title}
                  onClick={() => { setFramework(item.framework); setAudience(item.audience); setIdea(item.idea); }}
                  className="rounded-xl border border-slate-200 p-3 text-left text-xs font-semibold text-slate-700 hover:border-violet-400 hover:bg-violet-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-violet-500/10"
                >
                  {item.title}
                </button>
              ))}
            </div>

            <label className="mt-5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Stack desejada
              <select value={framework} onChange={(e) => setFramework(e.target.value as Framework)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                <option value="flutter">Flutter</option>
                <option value="android">Android nativo</option>
                <option value="react_native">React Native</option>
              </select>
            </label>

            <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Público e objetivo <span className="font-normal text-slate-400">(opcional)</span>
              <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Ex.: pequenos lojistas que precisam vender por celular" className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" />
            </label>

            <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Sua ideia
              <textarea value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Ex.: aplicativo para agendar serviços, com catálogo, notificações e área do cliente…" className="mt-1.5 min-h-32 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900" />
            </label>

            <Button onClick={refineIdea} disabled={refining || idea.trim().length < 12} className="mt-5">
              {refining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Criar briefing profissional
            </Button>
            {refineError && <p className="mt-3 text-sm text-rose-600">{refineError}</p>}
          </Card>

          <Card className="min-h-[34rem] border-violet-200 bg-violet-50/70 p-6 dark:border-violet-900/60 dark:bg-violet-500/10">
            {refinement ? (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">Escopo recomendado</p>
                  <h2 className="mt-2 font-semibold text-violet-950 dark:text-violet-100">{refinement.scope}</h2>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-violet-950 dark:text-violet-100"><FileCode2 className="h-4 w-4" /> Prompt profissional</div>
                  <p className="mt-2 whitespace-pre-wrap rounded-xl border border-violet-200 bg-white/80 p-3 text-sm leading-6 text-slate-700 dark:border-violet-900/60 dark:bg-slate-950/50 dark:text-slate-200">{refinement.professionalPrompt}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-violet-950 dark:text-violet-100"><ListChecks className="h-4 w-4" /> Perguntas para melhorar</div>
                    <ul className="mt-2 space-y-2 text-sm text-violet-900/80 dark:text-violet-100/80">
                      {refinement.questions.map((q) => <li key={q} className="rounded-lg bg-white/60 p-2.5 dark:bg-slate-950/35">{q}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-violet-950 dark:text-violet-100"><Lightbulb className="h-4 w-4" /> Ideias de valor</div>
                    <ul className="mt-2 space-y-2 text-sm text-violet-900/80 dark:text-violet-100/80">
                      {refinement.suggestions.map((s) => <li key={s} className="rounded-lg bg-white/60 p-2.5 dark:bg-slate-950/35">{s}</li>)}
                    </ul>
                  </div>
                </div>
                <Button onClick={useProfessionalPrompt} className="gap-2"><CheckCircle2 className="h-4 w-4" /> Usar prompt para gerar app</Button>
              </div>
            ) : (
              <div className="grid min-h-96 place-items-center text-center">
                <div>
                  <Bot className="mx-auto h-10 w-10 text-violet-300" />
                  <p className="mt-4 font-semibold text-violet-950 dark:text-violet-100">Seu briefing profissional aparecerá aqui</p>
                  <p className="mt-1 max-w-sm text-sm text-violet-900/70 dark:text-violet-100/70">A IA vai sugerir recursos úteis e perguntar o que falta decidir antes de gerar.</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "generate" && (
        <div className="grid gap-5 lg:grid-cols-[.95fr_1.05fr]">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600"><Sparkles className="h-5 w-5" /></span>
              <div>
                <h2 className="font-semibold">Brief do aplicativo</h2>
                <p className="text-xs text-slate-500">Gera um projeto Android inicial completo e compilável.</p>
              </div>
            </div>
            <label className="mt-5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Nome
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Minha loja" className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Prompt de construção
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Crie seu briefing na aba Orientar ideia ou descreva os recursos desejados…" className="mt-1.5 min-h-40 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <Button onClick={generateApp} disabled={generating || prompt.trim().length < 5} className="mt-5">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCode2 className="h-4 w-4" />} Gerar projeto inicial
            </Button>
            {genError && <p className="mt-3 text-sm text-rose-600">{genError}</p>}
          </Card>
          <Card className="border-violet-200 bg-violet-50/70 p-6 dark:border-violet-900/60 dark:bg-violet-500/10">
            <Bot className="h-6 w-6 text-violet-600 dark:text-violet-300" />
            <h2 className="mt-4 font-semibold text-violet-950 dark:text-violet-100">Fluxo seguro de criação</h2>
            <ol className="mt-3 space-y-3 text-sm text-violet-900/80 dark:text-violet-100/75">
              <li>1. Use o orientador para chegar a um briefing mais completo.</li>
              <li>2. Gere uma estrutura mínima, sem chaves ou binários.</li>
              <li>3. Revise o projeto, conecte um worker e prepare uma release.</li>
              <li>4. Use o assistente de IA para analisar falhas de build quando necessário.</li>
            </ol>
          </Card>
        </div>
      )}

      {tab === "migrate" && (
        <div className="grid gap-5 lg:grid-cols-[.95fr_1.05fr]">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600"><Route className="h-5 w-5" /></span>
              <div>
                <h2 className="font-semibold">Planejador de migração</h2>
                <p className="text-xs text-slate-500">O que converte automático vs. manual entre stacks.</p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <select value={migFrom} onChange={(e) => setMigFrom(e.target.value)} className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                <option value="reactnative">React Native</option>
                <option value="android">Android (Kotlin)</option>
                <option value="flutter">Flutter</option>
              </select>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
              <select value={migTo} onChange={(e) => setMigTo(e.target.value)} className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                <option value="android">Android (Kotlin)</option>
                <option value="flutter">Flutter</option>
                <option value="reactnative">React Native</option>
              </select>
            </div>
            <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Contexto do código atual <span className="font-normal text-slate-400">(opcional)</span>
              <textarea value={sourceDescription} onChange={(e) => setSourceDescription(e.target.value)} placeholder="Aplicativo atual usa WebView, login próprio, API REST…" className="mt-1.5 min-h-32 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <Button onClick={planMigration} disabled={migrating || migFrom === migTo} variant="secondary" className="mt-5">
              {migrating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" />} Criar plano técnico
            </Button>
            {migError && <p className="mt-3 text-sm text-rose-600">{migError}</p>}
          </Card>

          <Card className="min-h-80 p-6">
            {migReport ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white">
                  <p className="text-3xl font-bold">{migReport.autoPct}%</p>
                  <p className="text-sm text-indigo-100">{migReport.summary}</p>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-emerald-600">Conversão automática</p>
                  <ul className="space-y-1.5">
                    {migReport.auto.map((r, i) => (
                      <li key={i} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs dark:bg-emerald-500/10">
                        <p className="font-medium text-emerald-800 dark:text-emerald-300">{r.pattern}</p>
                        <p className="text-emerald-700/70 dark:text-emerald-200/60">{r.note}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-amber-600">Requer intervenção humana</p>
                  <ul className="space-y-1.5">
                    {migReport.manual.map((r, i) => (
                      <li key={i} className="rounded-lg bg-amber-50 px-3 py-2 text-xs dark:bg-amber-500/10">
                        <p className="font-medium text-amber-800 dark:text-amber-300">{r.pattern}</p>
                        <p className="text-amber-700/70 dark:text-amber-200/60">{r.note}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center text-center">
                <div>
                  <Route className="mx-auto h-9 w-9 text-indigo-300" />
                  <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">Seu plano aparecerá aqui</p>
                  <p className="mt-1 text-sm text-slate-500">Escolha a stack de origem e destino.</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
