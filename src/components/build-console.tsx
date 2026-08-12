"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Progress, Button, Badge } from "@/components/ui";
import { applyFix } from "@/lib/project-actions";
import { Terminal, Sparkles, Loader2, Wand2, CheckCircle2 } from "lucide-react";

export type BuildInsight = {
  id: string;
  severity: string;
  title: string;
  errorCode: string | null;
  explanation: string;
  suggestion: string;
  autoFixable: boolean;
  applied: boolean;
};

function levelOf(line: string): string {
  const l = line.toLowerCase();
  if (line.startsWith("$") || line.startsWith(">") || l.startsWith("./") || l.startsWith("flutter ") || l.startsWith("yarn ")) return "cmd";
  if (l.includes("failure") || l.includes("failed") || l.includes("error") || l.includes("unresolved") || l.includes("unsupported")) return "error";
  if (l.includes("success") || l.includes("✔") || l.includes("built build") || l.includes("got dependencies") || l.includes("saved lockfile")) return "success";
  if (l.includes("skipped") || l.includes("warn") || l.includes("up-to-date")) return "warn";
  if (l.startsWith("[buildforge]") || l.startsWith("[cache]")) return "info";
  return "default";
}

const levelColor: Record<string, string> = {
  cmd: "text-cyan-400",
  error: "text-rose-400",
  success: "text-emerald-400",
  warn: "text-amber-400",
  info: "text-slate-400",
  default: "text-slate-300",
};

export function BuildConsole({
  buildId,
  projectId,
  initialStatus,
  initialProgress,
  insights,
}: {
  buildId: string;
  projectId: string;
  initialStatus: string;
  initialProgress: number;
  insights: BuildInsight[];
}) {
  const [lines, setLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(initialProgress);
  const [status, setStatus] = useState(initialStatus);
  const [summary, setSummary] = useState<string | null>(null);
  const [fixing, startFix] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    let es: EventSource | null = null;
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (closed) return;
      // Cada conexao reenvia o log desde o inicio; acumulamos numa nova lista.
      const collected: string[] = [];
      const source = new EventSource(`/api/builds/${buildId}/stream`);
      es = source;
      source.onmessage = (ev) => {
        const data = JSON.parse(ev.data);
        if (data.type === "line") {
          collected.push(data.line);
          setLines([...collected]);
        } else if (data.type === "progress") {
          setProgress(data.progress);
          setStatus(data.status);
        } else if (data.type === "done") {
          setStatus(data.status);
          setSummary(data.summary);
          closed = true;
          try { source.close(); } catch {}
          // Recarrega os dados do servidor p/ mostrar artefatos/insights sem F5.
          setTimeout(() => router.refresh(), 800);
        }
      };
      source.onerror = () => {
        try { source.close(); } catch {}
        // Reconecta automaticamente (builds reais podem durar 20-40 min).
        if (!closed) reconnectTimer = setTimeout(connect, 1500);
      };
    };
    connect();

    return () => {
      closed = true;
      clearTimeout(reconnectTimer);
      try { es && es.close(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  const isLive = status === "running" || status === "queued";
  const fixable = insights.find((i) => i.autoFixable && !i.applied);

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isLive ? (
            <span className="flex items-center gap-2 text-sm font-medium text-amber-500">
              <span className="h-2 w-2 rounded-full bg-amber-500 pulse-dot" /> Compilando…
            </span>
          ) : status === "success" ? (
            <span className="flex items-center gap-2 text-sm font-medium text-emerald-500">
              <CheckCircle2 className="h-4 w-4" /> Concluído
            </span>
          ) : (
            <span className="flex items-center gap-2 text-sm font-medium text-rose-500">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Falhou
            </span>
          )}
        </div>
        <span className="text-sm tabular-nums text-slate-400">{progress}%</span>
      </div>
      <Progress value={progress} tone={status === "failed" ? "rose" : status === "success" ? "emerald" : "indigo"} />

      {/* Terminal */}
      <div ref={scrollRef} className="h-[420px] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-[12.5px] leading-relaxed shadow-inner">
        <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2 text-slate-500">
          <Terminal className="h-4 w-4" /> buildforge://console
        </div>
        {lines.length === 0 && isLive && <p className="text-slate-500">$ conectando ao agente de build…</p>}
        {lines.map((line, i) => (
          <div key={i} className={`whitespace-pre-wrap break-all ${levelColor[levelOf(line)] ?? levelColor.default} fade-up`}>
            {line}
          </div>
        ))}
        {status === "success" && (
          <div className="mt-2 text-emerald-400">✔ BUILD SUCCESSFUL — artefatos prontos para download.</div>
        )}
        {status === "failed" && (
          <div className="mt-2 text-rose-400">✖ BUILD FAILED — a IA está analisando o erro…</div>
        )}
      </div>

      {/* AI fix panel */}
      {status === "failed" && insights.length > 0 && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-500/30 dark:bg-indigo-500/10">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-indigo-900 dark:text-indigo-200">{insights[0].title}</h3>
                <Badge tone="rose">{insights[0].severity}</Badge>
              </div>
              <p className="mt-1.5 text-sm text-indigo-900/80 dark:text-indigo-200/80">{insights[0].explanation}</p>
              <div className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-sm text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                <span className="font-medium">💡 Correção: </span>{insights[0].suggestion}
              </div>
              {fixable ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    onClick={() => startFix(async () => { await applyFix(buildId); })}
                    disabled={fixing}
                  >
                    {fixing ? <><Loader2 className="h-4 w-4 animate-spin" /> Aplicando…</> : <><Wand2 className="h-4 w-4" /> Aplicar correção automática</>}
                  </Button>
                  <Link href={`/app/projects/${projectId}`}>
                    <Button variant="outline">Ver projeto</Button>
                  </Link>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link href={`/app/projects/${projectId}`}>
                    <Button variant="outline" size="sm">Voltar ao projeto</Button>
                  </Link>
                  <span className="text-xs text-indigo-700/70 dark:text-indigo-300/70">
                    Aplique a correção acima no seu worker e rode o build de novo.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {summary && <p className="text-sm text-slate-500">{summary}</p>}
    </div>
  );
}
