"use client";

import { useState } from "react";
import { Card, Badge, Button } from "@/components/ui";
import type { InsightDraft } from "@/lib/engine";
import { Sparkles, Wand2, Send, ArrowRight, Bot, CheckCircle2, AlertTriangle, GitCompare } from "lucide-react";

const examples = [
  "e: Unresolved reference: MaterialTheme — Material3 composables missing",
  "FAILURE: Dependency 'androidx.work:work-runtime' requires minSdkVersion 24 but project is 21",
  "error: invalid class file version 61.0 — unsupported major version",
  "Keystore file not set for signing config 'release'. Build output is not signed.",
];

export default function AIPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<InsightDraft[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // migration
  const [from, setFrom] = useState("reactnative");
  const [to, setTo] = useState("android");
  const [mig, setMig] = useState<null | { autoPct: number; auto: { pattern: string; note: string }[]; manual: { pattern: string; note: string }[]; summary: string }>(null);
  const [migLoading, setMigLoading] = useState(false);
  const [migError, setMigError] = useState<string | null>(null);

  async function analyze() {
    setLoading(true);
    setError(null);
    setInsights(null);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na análise");
      setInsights(data.insights);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  async function migrate() {
    setMigLoading(true);
    setMigError(null);
    setMig(null);
    try {
      const res = await fetch("/api/ai/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Roteiro indisponível");
      setMig(data);
    } catch (e: unknown) {
      setMigError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setMigLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">IA Assistant</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Cole um erro de compilação e receba explicação + correção. Ou planeje uma migração entre stacks.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Error analyzer */}
        <Card className="flex flex-col p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white"><Bot className="h-5 w-5" /></div>
            <div>
              <h2 className="font-semibold leading-tight">Analisador de erros</h2>
              <p className="text-xs text-slate-400">Explica e sugere correções</p>
            </div>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="Cole aqui o trecho do erro do Gradle / Dart / Metro…"
            className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {examples.map((ex) => (
              <button key={ex} onClick={() => setText(ex)} className="rounded-md border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400">
                {ex.slice(0, 38)}…
              </button>
            ))}
          </div>

          <Button onClick={analyze} disabled={loading || !text.trim()} className="mt-3">
            {loading ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
            {loading ? "Analisando…" : "Analisar com IA"}
          </Button>

          {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10">{error}</p>}

          {insights && (
            <div className="mt-4 space-y-3">
              {insights.map((i, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={i.severity === "error" ? "rose" : i.severity === "warning" ? "amber" : "sky"}>{i.severity}</Badge>
                    <p className="font-semibold text-sm">{i.title}</p>
                    {i.autoFixable && <Badge tone="violet"><Wand2 className="mr-1 h-3 w-3" /> auto-corrigível</Badge>}
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{i.explanation}</p>
                  <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
                    <span className="font-medium text-slate-500">💡 Correção: </span>{i.suggestion}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Migration planner */}
        <Card className="flex flex-col p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white"><GitCompare className="h-5 w-5" /></div>
            <div>
              <h2 className="font-semibold leading-tight">Migração assistida</h2>
              <p className="text-xs text-slate-400">O que converte automático vs. manual</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
              <option value="reactnative">React Native</option>
              <option value="android">Android (Kotlin)</option>
              <option value="flutter">Flutter</option>
            </select>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
            <select value={to} onChange={(e) => setTo(e.target.value)} className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
              <option value="android">Android (Kotlin)</option>
              <option value="flutter">Flutter</option>
              <option value="reactnative">React Native</option>
            </select>
          </div>

          <Button onClick={migrate} disabled={migLoading || from === to} variant="secondary" className="mt-3">
            {migLoading ? <Sparkles className="h-4 w-4 animate-pulse" /> : <GitCompare className="h-4 w-4" />}
            {migLoading ? "Gerando relatório…" : "Gerar relatório de migração"}
          </Button>

          {migError && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-500/10">{migError}</p>}

          {mig && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white">
                <p className="text-3xl font-bold">{mig.autoPct}%</p>
                <p className="text-sm text-indigo-100">{mig.summary}</p>
              </div>
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Conversão automática</p>
                <ul className="space-y-1.5">
                  {mig.auto.map((r, i) => (
                    <li key={i} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs dark:bg-emerald-500/10">
                      <p className="font-medium text-emerald-800 dark:text-emerald-300">{r.pattern}</p>
                      <p className="text-emerald-700/70 dark:text-emerald-200/60">{r.note}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-600"><AlertTriangle className="h-4 w-4" /> Requer intervenção humana</p>
                <ul className="space-y-1.5">
                  {mig.manual.map((r, i) => (
                    <li key={i} className="rounded-lg bg-amber-50 px-3 py-2 text-xs dark:bg-amber-500/10">
                      <p className="font-medium text-amber-800 dark:text-amber-300">{r.pattern}</p>
                      <p className="text-amber-700/70 dark:text-amber-200/60">{r.note}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
