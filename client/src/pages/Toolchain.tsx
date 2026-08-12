import { CheckCircle2, CircleAlert, ExternalLink, Laptop, TerminalSquare } from "lucide-react";
import { trpc } from "@/lib/trpc";

const requirements = [
  ["Node.js", "20 ou superior", "Executa o agente BuildForge"],
  ["Git", "2.30 ou superior", "Clona fontes Git e repositórios GitHub"],
  ["Java / JDK", "17", "Compila APKs e AABs Android"],
  ["Android SDK", "API 34 e Build Tools", "Disponibiliza sdkmanager, adb e platform-tools"],
  ["Flutter", "3.x", "Necessário para projetos Flutter"],
] as const;

export default function ToolchainPage() {
  const workers = trpc.buildforge.workers.list.useQuery();
  const online = workers.data?.filter((worker) => worker.status === "online") ?? [];
  return <div className="mx-auto max-w-6xl space-y-6 pb-8">
    <header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Legado restaurado</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Toolchain e ambiente</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">Diagnostique a máquina que executa o worker. O instalador automático verifica Node, Git, JDK, Android SDK e Flutter antes de buscar a fila.</p></header>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{requirements.map(([tool, version, detail]) => <article key={tool} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex items-start justify-between"><span className="rounded-xl bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-300"><TerminalSquare className="h-5 w-5" /></span><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">{version}</span></div><h2 className="mt-4 font-semibold text-slate-950 dark:text-white">{tool}</h2><p className="mt-1 text-sm text-slate-500">{detail}</p></article>)}</section>
    <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><article className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-6 dark:border-indigo-500/20 dark:bg-indigo-500/5"><div className="flex gap-3"><Laptop className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-300" /><div><h2 className="font-semibold text-indigo-950 dark:text-indigo-100">Instalação automática do worker</h2><p className="mt-1 text-sm leading-6 text-indigo-800/80 dark:text-indigo-200/70">Gere um token em Workers, baixe o instalador para Windows, macOS ou Linux e abra o arquivo. O agente executa o diagnóstico, tenta localizar Android Studio/JBR e conecta a máquina à fila.</p><a href="/workers" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-300">Ir para Workers <ExternalLink className="h-3.5 w-3.5" /></a></div></div></article><article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"><h2 className="font-semibold text-slate-950 dark:text-white">Workers detectados</h2>{workers.isLoading ? <p className="mt-3 text-sm text-slate-500">Consultando ambiente…</p> : online.length ? <div className="mt-4 space-y-2">{online.map((worker) => <div key={worker.id} className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200"><CheckCircle2 className="h-4 w-4" />{worker.name}</div>)}</div> : <p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><CircleAlert className="h-4 w-4 text-amber-500" />Nenhum worker online. Registre um token para iniciar.</p>}</article></section>
  </div>;
}
