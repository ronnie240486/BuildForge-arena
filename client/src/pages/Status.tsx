import { Activity, CheckCircle2, Clock3, Wrench, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

const labels: Record<string, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  operational: { label: "Operacional", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", Icon: CheckCircle2 },
  maintenance: { label: "Em manutenção", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", Icon: Wrench },
  degraded: { label: "Instabilidade", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", Icon: Activity },
  outage: { label: "Indisponível", className: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300", Icon: XCircle },
};

export default function StatusPage() {
  const status = trpc.buildforge.systemStatus.useQuery(undefined, { refetchInterval: 60_000 });
  const overall = labels[status.data?.overall ?? "maintenance"] ?? labels.maintenance;
  const OverallIcon = overall.Icon;
  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-white"><div className="mx-auto max-w-3xl"><header className="text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-600 shadow-lg shadow-violet-600/30"><Activity className="h-6 w-6" /></div><p className="mt-5 text-xs font-bold uppercase tracking-[.24em] text-violet-300">BuildForge</p><h1 className="mt-2 text-3xl font-semibold">Status da plataforma</h1><p className="mt-3 text-sm text-slate-400">Acompanhe a disponibilidade dos serviços. Esta página não exibe dados de clientes ou projetos.</p></header><section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-slate-400">Situação geral</p><div className="mt-1 flex items-center gap-2 text-xl font-semibold"><OverallIcon className="h-5 w-5" />{overall.label}</div></div><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${overall.className}`}><OverallIcon className="h-3.5 w-3.5" />{overall.label}</span></div><div className="mt-6 divide-y divide-slate-800 rounded-xl border border-slate-800">{status.isLoading ? <p className="p-5 text-sm text-slate-400">Consultando componentes…</p> : status.data?.components.map((component) => { const item = labels[component.status] ?? labels.maintenance; const Icon = item.Icon; return <div key={component.component} className="flex items-center justify-between gap-4 p-4"><div className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-lg ${item.className}`}><Icon className="h-4 w-4" /></span><div><p className="text-sm font-semibold">{component.component}</p><p className="text-xs text-slate-400">{component.summary}</p></div></div><span className="text-xs font-semibold text-slate-400">{item.label}</span></div>; })}</div><p className="mt-5 flex items-center gap-1.5 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />Atualização automática a cada minuto.</p></section></div></main>;
}
