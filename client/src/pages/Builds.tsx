import { useState } from "react";
import { Ban, ChevronRight, FileCode2, LoaderCircle, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { buildStatusClasses, buildStatusLabels, formatDate, frameworkLabel } from "@/lib/buildforge";
import { useBuildStream } from "@/lib/useBuildStream";

export default function BuildsPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const builds = trpc.buildforge.builds.list.useQuery(undefined, { refetchInterval: 4_000 });
  const details = trpc.buildforge.builds.details.useQuery({ buildId: selectedId ?? 0 }, { enabled: Boolean(selectedId) });
  const stream = useBuildStream(selectedId);
  const liveBuild = stream.build ?? details.data?.build;
  const liveLogs = [...(details.data?.logs ?? []), ...stream.logs].filter((log, index, all) => all.findIndex((item) => item.sequence === log.sequence) === index);
  const utils = trpc.useUtils();
  const cancel = trpc.buildforge.builds.cancel.useMutation({
    onSuccess: () => {
      toast.success("Cancelamento solicitado ao worker.");
      void utils.buildforge.builds.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const canShowDetail = Boolean(selectedId && details.data && liveBuild);
  const canCancel = Boolean(liveBuild && ["queued", "running"].includes(liveBuild.status) && !details.data?.build.cancellationRequested);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Fila de builds</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Acompanhe fila, progresso, logs em tempo real e resultados das compilações.</p>
      </header>
      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 px-5 py-4 text-sm font-semibold text-slate-950 dark:border-slate-800 dark:text-white">Builds recentes</div>
          {builds.isLoading ? (
            <div className="grid min-h-60 place-items-center"><LoaderCircle className="h-5 w-5 animate-spin text-indigo-500" /></div>
          ) : builds.data?.length ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {builds.data.map((build) => (
                <button key={build.id} onClick={() => setSelectedId(build.id)} className={`flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-900 ${selectedId === build.id ? "bg-indigo-50/70 dark:bg-indigo-500/10" : ""}`}>
                  <span className={`inline-flex min-w-24 justify-center rounded-full px-2 py-1 text-xs font-bold ${buildStatusClasses[build.status]}`}>{buildStatusLabels[build.status]}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{build.projectName}</span><span className="mt-0.5 block text-xs text-slate-500">{frameworkLabel(build.framework)} · {build.requestedArtifact.toUpperCase()} · {formatDate(build.createdAt)}</span></span>
                  <span className="hidden w-20 text-right text-xs text-slate-500 sm:block">{build.progress}%</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>
          ) : (
            <div className="px-6 py-16 text-center text-sm text-slate-500">A fila está vazia. Inicie um build a partir de um projeto.</div>
          )}
        </section>
        <aside className="min-h-96 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {canShowDetail && details.data && liveBuild ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Build #{selectedId} · ao vivo</p><h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{details.data.project.name}</h2></div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${buildStatusClasses[liveBuild.status]}`}>{buildStatusLabels[liveBuild.status]}</span>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500"><span>Progresso</span><span>{liveBuild.progress}%</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${liveBuild.progress}%` }} /></div>
              </div>
              {canCancel ? <button onClick={() => cancel.mutate({ buildId: selectedId! })} className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300"><Ban className="h-4 w-4" /> Solicitar cancelamento</button> : null}
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><ScrollText className="h-4 w-4 text-indigo-500" /> Logs em tempo real</div>
                <div className="mt-3 max-h-72 space-y-2 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-300">
                  {liveLogs.length ? liveLogs.map((log) => <p key={log.sequence}><span className="mr-2 text-slate-500">[{log.level}]</span>{log.message}</p>) : <p className="text-slate-500">Aguardando logs do worker.</p>}
                </div>
              </div>
              {details.data.artifacts.length > 0 ? <div><div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><FileCode2 className="h-4 w-4 text-indigo-500" /> Artefatos</div><p className="mt-2 text-xs text-slate-500">Os links temporários são disponibilizados após o armazenamento seguro.</p></div> : null}
            </div>
          ) : (
            <div className="grid min-h-80 place-items-center text-center"><div><ScrollText className="mx-auto h-9 w-9 text-slate-300 dark:text-slate-700" /><p className="mt-4 font-semibold text-slate-700 dark:text-slate-200">Selecione um build</p><p className="mt-1 max-w-56 text-sm text-slate-500">Os logs e os artefatos seguros aparecem aqui durante a execução.</p></div></div>
          )}
        </aside>
      </div>
    </div>
  );
}
