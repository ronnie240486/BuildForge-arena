import { Activity, Boxes, CheckCircle2, Cpu, LoaderCircle, Plus, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { buildStatusClasses, buildStatusLabels, formatDate } from "@/lib/buildforge";

function MetricCard({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: typeof Boxes; tone: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const summary = trpc.buildforge.dashboard.summary.useQuery(undefined, { refetchInterval: 10_000 });

  if (summary.isLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-indigo-500" /></div>;
  }

  if (summary.error || !summary.data) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
        <h1 className="font-semibold">Não foi possível carregar o painel.</h1>
        <p className="mt-1 text-sm">{summary.error?.message ?? "Tente novamente em alguns instantes."}</p>
      </section>
    );
  }

  const { projects, builds, workers, recentBuilds } = summary.data;
  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Operação protegida
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Visão operacional</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">Acompanhe projetos, capacidade de execução e a entrega dos seus artefatos em um só lugar.</p>
        </div>
        <button onClick={() => navigate("/projects")} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-[0.98]">
          <Plus className="h-4 w-4" /> Importar projeto
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Projetos ativos" value={projects.active} detail={`${projects.total} projeto(s) no total`} icon={Boxes} tone="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" />
        <MetricCard label="Builds em andamento" value={builds.running} detail={`${builds.queued} aguardando na fila`} icon={Activity} tone="bg-sky-500/10 text-sky-600 dark:text-sky-300" />
        <MetricCard label="Workers online" value={workers.online} detail={`${workers.total} worker(s) cadastrado(s)`} icon={Cpu} tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" />
        <MetricCard label="Entregas concluídas" value={builds.succeeded} detail={`${builds.total} build(s) registrados`} icon={CheckCircle2} tone="bg-violet-500/10 text-violet-600 dark:text-violet-300" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="font-semibold text-slate-950 dark:text-white">Builds recentes</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Atualizado automaticamente a cada poucos segundos.</p>
          </div>
          <button onClick={() => navigate("/builds")} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300">Ver fila completa</button>
        </div>
        {recentBuilds.length ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentBuilds.map((build) => (
              <button key={build.id} onClick={() => navigate(`/builds?selected=${build.id}`)} className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900/70">
                <span className={`inline-flex min-w-24 justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${buildStatusClasses[build.status]}`}>{buildStatusLabels[build.status]}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{build.projectName}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{build.framework.replace("_", " ")} · {formatDate(build.createdAt)}</p>
                </div>
                <div className="hidden min-w-32 sm:block">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${build.progress}%` }} /></div>
                  <p className="mt-1 text-right text-xs text-slate-500">{build.progress}%</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-5 py-14 text-center">
            <Activity className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
            <p className="mt-3 font-medium text-slate-700 dark:text-slate-200">Ainda não há builds.</p>
            <p className="mt-1 text-sm text-slate-500">Importe um projeto para iniciar a primeira entrega.</p>
          </div>
        )}
      </section>
    </div>
  );
}
