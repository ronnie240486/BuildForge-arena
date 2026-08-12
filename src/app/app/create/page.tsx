"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Badge } from "@/components/ui";
import { Sparkles, Loader2, Wand2, FileCode2, ArrowRight, Lightbulb } from "lucide-react";

const examples = [
  "Um app de IPTV com lista de canais, player de vídeo e favoritos",
  "Um app de tarefas (to-do) com adicionar, concluir e excluir tarefas",
  "Uma calculadora moderna com tema escuro",
  "Um app de notas com salvar localmente e busca",
  "Um app de clima que mostra a previsão de uma cidade",
];

export default function CreateWithAiPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [appName, setAppName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<null | { projectId: string; fileCount: number; files: string[] }>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/generate-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, appName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao gerar o app");
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          <h1 className="text-2xl font-semibold tracking-tight">Criar app com IA</h1>
        </div>
        <p className="mt-2 max-w-2xl text-indigo-100">
          Descreva o app que você quer. A IA gera o projeto Android (Kotlin + Compose) completo,
          cria o projeto na ferramenta e deixa pronto para compilar o APK.
        </p>
      </div>

      {!result ? (
        <Card className="p-6">
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Nome do app</label>
          <input
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="Ex.: MaximusPlayer"
            className="mb-4 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
          />

          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            O que o app deve fazer?
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder="Ex.: Um app de IPTV em Kotlin com lista de canais, player de vídeo, categorias e favoritos. Tema escuro moderno."
            className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
          />

          <div className="mt-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Lightbulb className="h-3.5 w-3.5" /> Exemplos (clique para usar):
            </p>
            <div className="flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setPrompt(ex)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-left text-[11px] text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </div>
          )}

          <Button onClick={generate} disabled={loading || prompt.trim().length < 5} size="lg" className="mt-5 w-full">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Gerando o app (pode levar até 1 min)…</>
            ) : (
              <><Wand2 className="h-4 w-4" /> Gerar app com IA <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>

          <p className="mt-3 text-center text-xs text-slate-400">
            Requer uma chave de IA configurada em <b>Configurações</b> (Claude/GPT/Gemini).
          </p>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">App gerado com sucesso! 🎉</h2>
              <p className="text-sm text-slate-400">{result.fileCount} arquivos criados pela IA.</p>
            </div>
          </div>

          <div className="mt-4 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            {result.files.map((f) => (
              <p key={f} className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                <FileCode2 className="h-3 w-3 shrink-0 text-indigo-400" /> {f}
              </p>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => router.push(`/app/projects/${result.projectId}`)} size="lg">
              Abrir projeto e configurar ícone <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => { setResult(null); setPrompt(""); setAppName(""); }}>
              Criar outro
            </Button>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Próximo passo: no projeto, envie o ícone e o nome, conecte um worker e clique em <b>Iniciar build REAL</b>.
          </p>
        </Card>
      )}

      <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
        <Badge tone="indigo"><Sparkles className="mr-1 h-3 w-3" /> IA</Badge>
        A qualidade do app depende do modelo de IA configurado e da clareza do seu pedido.
      </div>
    </div>
  );
}
