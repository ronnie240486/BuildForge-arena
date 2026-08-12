import { useEffect, useState } from "react";
import { Bot, Check, FileWarning, LoaderCircle, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { buildStatusClasses, buildStatusLabels, formatDate } from "@/lib/buildforge";

export default function AiAssistantPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const builds = trpc.buildforge.builds.list.useQuery(undefined, { refetchInterval: 6_000 });
  const selected = trpc.buildforge.builds.details.useQuery({ buildId: selectedId ?? 0 }, { enabled: Boolean(selectedId) });
  const utils = trpc.useUtils();
  const analyze = trpc.buildforge.ai.analyze.useMutation({
    onSuccess: (result) => { toast.success(`${result.proposalIds.length} proposta(s) criada(s) por ${result.model}.`); void utils.buildforge.builds.details.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const decide = trpc.buildforge.ai.decide.useMutation({
    onSuccess: () => { toast.success("Decisão registrada."); void utils.buildforge.builds.details.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const retry = trpc.buildforge.builds.retryWithAi.useMutation({
    onSuccess: (result) => { toast.success(`Build reenviado com ${result.approvedFixes} correção(ões) aprovada(s).`); void utils.buildforge.builds.list.invalidate(); void utils.buildforge.builds.details.invalidate(); void utils.buildforge.dashboard.summary.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const failed = builds.data?.filter((build) => build.status === "failed") ?? [];
  useEffect(() => { if (!selectedId && failed[0]) setSelectedId(failed[0].id); }, [failed, selectedId]);
  const approvedFixes = selected.data?.fixes.filter((fix) => fix.status === "approved") ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-700 dark:text-violet-300"><Sparkles className="h-3.5 w-3.5" /> Correções supervisionadas</div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Assistente de IA</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">Analise logs, revise um patch e só então reexecute o build com as correções aprovadas.</p>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard icon={Bot} title="Diagnóstico" text="O modelo explica a causa provável a partir dos logs do build." tone="violet" />
        <InfoCard icon={FileWarning} title="Patch revisável" text="Cada proposta exibe arquivos afetados e o diff sugerido." tone="sky" />
        <InfoCard icon={ShieldCheck} title="Aplicação controlada" text="Somente patches aprovados seguem para o próximo worker." tone="emerald" />
      </section>
      <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 className="font-semibold text-slate-950 dark:text-white">Falhas disponíveis</h2><p className="mt-1 text-xs text-slate-500">Selecione um build para inspecionar seus logs.</p></div>
          {builds.isLoading ? <div className="grid min-h-64 place-items-center"><LoaderCircle className="h-5 w-5 animate-spin text-violet-500" /></div> : failed.length ? <div className="divide-y divide-slate-100 dark:divide-slate-800">{failed.map((build) => <button key={build.id} onClick={() => setSelectedId(build.id)} className={`flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-900 ${selectedId === build.id ? "bg-violet-50/70 dark:bg-violet-500/10" : ""}`}><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${buildStatusClasses[build.status]}`}>{buildStatusLabels[build.status]}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{build.projectName}</span><span className="mt-1 block text-xs text-slate-500">Build #{build.id} · {formatDate(build.createdAt)}</span></span></button>)}</div> : <EmptyState />}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {!selected.data ? <div className="grid min-h-80 place-items-center text-center"><div><Bot className="mx-auto h-9 w-9 text-violet-300" /><p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">Selecione uma falha</p><p className="mt-1 text-sm text-slate-500">O diagnóstico aparecerá aqui.</p></div></div> : <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300">Build #{selected.data.build.id}</p><h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{selected.data.project.name}</h2></div><button onClick={() => analyze.mutate({ buildId: selected.data.build.id })} disabled={analyze.isPending || selected.data.build.status !== "failed"} className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{analyze.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}Analisar com IA</button></div>
            <div className="rounded-xl bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-300"><p className="mb-2 font-sans text-xs font-semibold text-slate-400">Últimos logs</p>{selected.data.logs.slice(-14).map((log) => <p key={log.id}><span className="mr-2 text-slate-500">[{log.level}]</span>{log.message}</p>)}</div>
            <div className="space-y-3"><h3 className="font-semibold text-slate-950 dark:text-white">Propostas</h3>{selected.data.fixes.length ? selected.data.fixes.map((fix) => <article key={fix.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900 dark:text-white">{fix.status === "proposed" ? "Aguardando revisão" : fix.status === "approved" ? "Aprovada" : fix.status === "rejected" ? "Rejeitada" : "Aplicada"}</p><p className="mt-1 text-xs text-slate-500">{fix.model} · {fix.affectedFiles.join(", ") || "Arquivo não definido"}</p></div>{fix.status === "proposed" && <div className="flex gap-2"><button onClick={() => decide.mutate({ fixId: fix.id, status: "approved" })} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white"><Check className="inline h-3.5 w-3.5" /> Aprovar</button><button onClick={() => decide.mutate({ fixId: fix.id, status: "rejected" })} className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-bold text-rose-600 dark:border-rose-900"><X className="inline h-3.5 w-3.5" /> Rejeitar</button></div>}</div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{fix.explanation}</p><pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-xs leading-5 text-slate-200">{fix.patch}</pre></article>) : <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-800">Clique em <strong className="text-slate-700 dark:text-slate-200">Analisar com IA</strong> para gerar propostas a partir dos logs.</div>}{approvedFixes.length > 0 && selected.data.build.status === "failed" && <button onClick={() => retry.mutate({ buildId: selected.data.build.id })} disabled={retry.isPending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{retry.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}<RotateCcw className="h-4 w-4" />Reexecutar com {approvedFixes.length} correção(ões)</button>}</div>
          </div>}
        </section>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, text, tone }: { icon: typeof Bot; title: string; text: string; tone: "violet" | "sky" | "emerald" }) {
  const colors = { violet: "border-violet-200 bg-violet-50 dark:border-violet-900/60 dark:bg-violet-500/10", sky: "border-sky-200 bg-sky-50 dark:border-sky-900/60 dark:bg-sky-500/10", emerald: "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-500/10" };
  return <article className={`rounded-2xl border p-5 ${colors[tone]}`}><Icon className="h-6 w-6 text-violet-600 dark:text-violet-300" /><h2 className="mt-3 font-semibold text-slate-950 dark:text-white">{title}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{text}</p></article>;
}

function EmptyState() {
  return <div className="px-6 py-16 text-center"><Bot className="mx-auto h-9 w-9 text-violet-300" /><p className="mt-4 font-semibold text-slate-700 dark:text-slate-200">Nenhuma falha disponível</p><p className="mt-1 text-sm text-slate-500">Quando um build falhar, ele aparecerá aqui.</p></div>;
}
