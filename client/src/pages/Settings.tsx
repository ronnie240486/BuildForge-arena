import { ArrowRight, Bot, HardDriveDownload, Settings2, ShieldCheck, Wrench } from "lucide-react";
import { useLocation } from "wouter";

const sections = [
  [Settings2, "Preferências da plataforma", "Tema, perfil, limites e dados operacionais.", "/admin"],
  [Bot, "Assistente e modelos", "Diagnóstico, correções supervisionadas e geração por IA.", "/assistant"],
  [Wrench, "Toolchain e workers", "Instalador automático, SDK e máquinas conectadas.", "/toolchain"],
  [HardDriveDownload, "Backup e exportação", "Snapshots, restauração e acesso a artefatos.", "/backups"],
  [ShieldCheck, "Administração", "Papéis, auditoria e controles de segurança.", "/admin"],
] as const;

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  return <div className="mx-auto max-w-5xl space-y-6 pb-8"><header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Configurações restauradas</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Configurações</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Centraliza as áreas de perfil, IA, ambiente, distribuição, backup e administração que existiam no projeto original.</p></header><section className="grid gap-4 md:grid-cols-2">{sections.map(([Icon, title, description, path]) => <button key={title} onClick={() => setLocation(path)} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-500/50"><Icon className="h-5 w-5 text-indigo-500" /><div className="mt-4 flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-950 dark:text-white">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-indigo-500" /></div></button>)}</section></div>;
}
