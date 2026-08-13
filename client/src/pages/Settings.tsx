import { useState } from "react";
import { ArrowRight, Bot, CheckCircle2, HardDriveDownload, KeyRound, LockKeyhole, Settings2, ShieldCheck, Trash2, Wrench, XCircle } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import BrandingPanel from "@/components/BrandingPanel";

const sections = [
  [Settings2, "Preferências da plataforma", "Tema, perfil, limites e dados operacionais.", "/admin"],
  [Bot, "Assistente e modelos", "Diagnóstico, correções supervisionadas e geração por IA.", "/assistant"],
  [Wrench, "Toolchain e workers", "Instalador automático, SDK e máquinas conectadas.", "/toolchain"],
  [HardDriveDownload, "Backup e exportação", "Snapshots, restauração e acesso a artefatos.", "/backups"],
  [ShieldCheck, "Administração", "Papéis, auditoria e controles de segurança.", "/admin"],
] as const;

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [models, setModels] = useState<Record<string, string>>({});
  const providers = trpc.buildforge.studio.providers.useQuery();
  const utils = trpc.useUtils();
  const refresh = () => void utils.buildforge.studio.providers.invalidate();
  const saveProvider = trpc.buildforge.studio.saveProvider.useMutation({
    onSuccess: () => { setKeys({}); refresh(); toast.success("Chave protegida e configurada com sucesso."); },
    onError: (error) => toast.error(error.message),
  });
  const removeProvider = trpc.buildforge.studio.removeProvider.useMutation({
    onSuccess: () => { refresh(); toast.success("Chave do provedor removida."); },
    onError: (error) => toast.error(error.message),
  });

  return <div className="mx-auto max-w-6xl space-y-6 pb-8">
    <header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Configurações administrativas</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Configurações</h1><p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">Centralize a plataforma, o Studio IA, a toolchain, os backups e os controles administrativos. As chaves de IA são criptografadas no servidor e jamais retornam em texto aberto ao navegador.</p></header>
    <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-5 shadow-sm dark:border-indigo-900/60 dark:from-indigo-500/10 dark:to-violet-500/10"><div className="flex items-start gap-3"><span className="rounded-xl bg-indigo-600 p-2 text-white"><KeyRound className="h-5 w-5" /></span><div><h2 className="font-semibold text-indigo-950 dark:text-indigo-50">Provedores de IA</h2><p className="mt-1 text-sm leading-6 text-indigo-800/80 dark:text-indigo-100/75">Insira a chave oficial de Gemini, Claude ou ChatGPT e escolha um modelo opcional. Depois de salvar, o campo volta a ficar mascarado e não mostra o valor novamente.</p></div></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{providers.isLoading ? <p className="text-sm text-indigo-800 dark:text-indigo-100">Carregando provedores…</p> : providers.data?.map((provider) => <article key={provider.id} className="rounded-xl border border-white/70 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/70"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-slate-950 dark:text-white">{provider.name}</p><p className="mt-0.5 text-xs text-slate-500">{provider.family}</p></div>{provider.configured ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Conectado</span> : <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"><XCircle className="h-3.5 w-3.5" /> Pendente</span>}</div><p className="mt-3 min-h-10 text-xs leading-5 text-slate-500">{provider.description}</p>{provider.managedInSettings ? <><label className="mt-3 block text-xs font-semibold text-slate-600 dark:text-slate-300">Chave de API<input aria-label={`Chave ${provider.name}`} type="password" autoComplete="new-password" value={keys[provider.id] ?? ""} placeholder={provider.configured ? "••••••••••••" : "Cole a chave oficial"} onChange={(event) => setKeys((current) => ({ ...current, [provider.id]: event.target.value }))} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" /></label><label className="mt-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">Modelo preferido <span className="font-normal text-slate-400">(opcional)</span><input value={models[provider.id] ?? provider.preferredModel ?? ""} placeholder="Ex.: modelo preferido" onChange={(event) => setModels((current) => ({ ...current, [provider.id]: event.target.value }))} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" /></label><div className="mt-3 flex gap-2"><button onClick={() => saveProvider.mutate({ provider: provider.id as "openai" | "anthropic" | "gemini", apiKey: keys[provider.id] ?? "", preferredModel: models[provider.id] || undefined })} disabled={saveProvider.isPending || (keys[provider.id] ?? "").trim().length < 8} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"><LockKeyhole className="h-3.5 w-3.5" /> Salvar chave</button>{provider.configured && <button onClick={() => { if (window.confirm(`Remover a chave ${provider.name}? O Studio deixará de usar este provedor.`)) removeProvider.mutate({ provider: provider.id as "openai" | "anthropic" | "gemini" }); }} disabled={removeProvider.isPending} aria-label={`Remover chave ${provider.name}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>}</div></> : <p className="mt-4 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Pronto para uso no Studio.</p>}</article>)}</div></section>
    <BrandingPanel />
    <section className="grid gap-4 md:grid-cols-2">{sections.map(([Icon, title, description, path]) => <button key={title} onClick={() => setLocation(path)} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-500/50"><Icon className="h-5 w-5 text-indigo-500" /><div className="mt-4 flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-950 dark:text-white">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-indigo-500" /></div></button>)}</section>
  </div>;
}
