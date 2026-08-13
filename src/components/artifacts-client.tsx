"use client";

import { useActionState, useState } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { generateReleaseLink } from "@/lib/release-link-actions";
import { Download, Link2, FileArchive, Loader2, Copy, Check } from "lucide-react";

export type ArtifactRow = {
  id: string;
  name: string;
  projectName: string;
  type: string;
  sizeBytes: number;
  signed: boolean;
  createdAt: string;
  links: { id: string; token: string; expiresAt: string | null }[];
};

function sizeLabel(bytes: number) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

export function ArtifactsClient({ artifacts, baseUrl }: { artifacts: ArtifactRow[]; baseUrl: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <FileArchive className="h-4 w-4 text-indigo-500" />
        <h2 className="font-semibold">Armazenamento</h2>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {artifacts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FileArchive className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
            <p className="mt-4 font-semibold text-slate-700 dark:text-slate-200">Ainda não há artefatos</p>
            <p className="mt-1 text-sm text-slate-500">Quando um build terminar, os arquivos aparecem aqui.</p>
          </div>
        ) : (
          artifacts.map((a) => <ArtifactRowItem key={a.id} artifact={a} baseUrl={baseUrl} />)
        )}
      </div>
    </Card>
  );
}

function ArtifactRowItem({ artifact, baseUrl }: { artifact: ArtifactRow; baseUrl: string }) {
  const [state, action, pending] = useActionState(generateReleaseLink, null);
  const [copied, setCopied] = useState(false);

  const generatedToken = state && "ok" in state && state.ok ? state.token : null;
  const activeLink = generatedToken ?? artifact.links[0]?.token ?? null;
  const shareUrl = activeLink ? `${baseUrl}/release/${activeLink}` : null;

  return (
    <div className="flex flex-wrap items-center gap-4 px-5 py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
        <FileArchive className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{artifact.name}</p>
        <p className="mt-1 text-xs text-slate-500">
          {artifact.projectName} · {artifact.type.toUpperCase()} · {sizeLabel(artifact.sizeBytes)} · {new Date(artifact.createdAt).toLocaleDateString("pt-BR")}
        </p>
      </div>
      {artifact.signed && <Badge tone="emerald">assinado</Badge>}

      <a
        href={`/api/artifacts/${artifact.id}/download`}
        className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
      >
        <Download className="h-3.5 w-3.5" /> Baixar
      </a>

      <form action={action}>
        <input type="hidden" name="artifactId" value={artifact.id} />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />} Gerar link
        </Button>
      </form>

      {shareUrl && (
        <div className="flex w-full items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/50">
          <span className="truncate text-slate-500">{shareUrl}</span>
          <button
            onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="ml-auto shrink-0 text-slate-400 hover:text-indigo-600"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
      {state && "error" in state && <p className="w-full text-xs text-rose-600">{state.error}</p>}
    </div>
  );
}
