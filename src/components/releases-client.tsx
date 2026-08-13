"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Card, Badge, Button } from "@/components/ui";
import { configureSigningKey, saveVersionInfo } from "@/lib/release-actions";
import { createSiteApp } from "@/lib/project-actions";
import { ShieldCheck, ShieldAlert, KeyRound, Globe, Loader2, Tag } from "lucide-react";

export type ReleaseProjectRow = {
  id: string;
  name: string;
  framework: string;
  versionName: string;
  signed: boolean;
  keyAlias: string | null;
};

export function ReleasesClient({ projects }: { projects: ReleaseProjectRow[] }) {
  const [webState, webAction, webPending] = useActionState(createSiteApp, null);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Globe className="h-4 w-4 text-indigo-500" />
          <h2 className="font-semibold">Criar app WebView a partir de um site</h2>
        </div>
        <form action={webAction} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
          <input
            name="url"
            placeholder="https://seusite.com"
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
          />
          <input
            name="name"
            placeholder="Nome do app"
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
          />
          <Button type="submit" disabled={webPending}>
            {webPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Criar
          </Button>
        </form>
        {webState && "error" in webState && <p className="mt-2 text-sm text-rose-600">{webState.error}</p>}
        <p className="mt-2 text-xs text-slate-400">
          Empacota o site como aplicativo Android (WebView via Capacitor). Ícone e permissões são configurados na página do projeto.
        </p>
      </Card>

      <Card>
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold">Assinatura e versão dos projetos</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {projects.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">Nenhum projeto ainda.</p>
          ) : (
            projects.map((p) => <ReleaseRow key={p.id} project={p} />)
          )}
        </div>
      </Card>
    </div>
  );
}

function ReleaseRow({ project }: { project: ReleaseProjectRow }) {
  const [open, setOpen] = useState(false);
  const [signState, signAction, signPending] = useActionState(configureSigningKey, null);
  const [verState, verAction, verPending] = useActionState(saveVersionInfo, null);

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/app/projects/${project.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-indigo-600">
          {project.name}
        </Link>
        <Badge tone="default">{project.framework}</Badge>
        <span className="flex items-center gap-1 text-xs text-slate-400"><Tag className="h-3 w-3" />{project.versionName}</span>
        {project.signed ? (
          <Badge tone="emerald"><ShieldCheck className="mr-1 h-3 w-3" /> assinado ({project.keyAlias})</Badge>
        ) : (
          <Badge tone="amber"><ShieldAlert className="mr-1 h-3 w-3" /> não assinado</Badge>
        )}
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          <KeyRound className="h-3.5 w-3.5" /> {open ? "Fechar" : "Configurar"}
        </Button>
      </div>

      {open && (
        <div className="mt-4 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 dark:bg-slate-800/40">
          <form action={signAction} className="space-y-2">
            <input type="hidden" name="projectId" value={project.id} />
            <p className="text-xs font-medium text-slate-500">Chave de assinatura (keystore)</p>
            <select name="mode" defaultValue="generate" className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900">
              <option value="generate">Gerar automaticamente</option>
              <option value="upload">Já tenho uma keystore</option>
            </select>
            <input name="keyAlias" placeholder="Alias (ex.: release)" defaultValue={project.keyAlias ?? ""} className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" />
            <input name="storeName" placeholder="Nome do arquivo .jks (se enviar sua própria)" className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" />
            <input name="validityYears" type="number" defaultValue={25} className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" />
            <Button type="submit" size="sm" disabled={signPending}>
              {signPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />} Salvar chave
            </Button>
            {signState && "error" in signState && <p className="text-xs text-rose-600">{signState.error}</p>}
            {signState && "ok" in signState && signState.ok && <p className="text-xs text-emerald-600">Configurado.</p>}
          </form>

          <form action={verAction} className="space-y-2">
            <input type="hidden" name="projectId" value={project.id} />
            <p className="text-xs font-medium text-slate-500">Versão</p>
            <input name="versionName" placeholder="1.0.1" defaultValue={project.versionName} className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" />
            <Button type="submit" size="sm" variant="outline" disabled={verPending}>
              {verPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar versão"}
            </Button>
            {verState && "error" in verState && <p className="text-xs text-rose-600">{verState.error}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
