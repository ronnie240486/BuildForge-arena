import { Download, FileArchive, FileKey, FileText, HardDriveDownload, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/buildforge";

function iconFor(type: string) {
  if (type === "keystore") return FileKey;
  if (type === "log") return FileText;
  return FileArchive;
}

function sizeLabel(bytes: number) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

export default function ArtifactsPage() {
  const artifacts = trpc.buildforge.artifacts.list.useQuery();
  const download = trpc.buildforge.artifacts.download.useMutation({
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
    onError: (error) => toast.error(error.message),
  });
  return <div className="mx-auto max-w-7xl space-y-6 pb-8"><header><h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Artefatos</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">APKs, AABs, arquivos-fonte e chaves ficam protegidos e são baixados por URLs temporárias.</p></header><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800"><HardDriveDownload className="h-4 w-4 text-indigo-500" /><h2 className="font-semibold text-slate-950 dark:text-white">Armazenamento seguro</h2></div>{artifacts.isLoading ? <div className="grid min-h-64 place-items-center"><LoaderCircle className="h-6 w-6 animate-spin text-indigo-500" /></div> : artifacts.data?.length ? <div className="divide-y divide-slate-100 dark:divide-slate-800">{artifacts.data.map((artifact) => { const Icon = iconFor(artifact.type); return <div key={artifact.id} className="flex items-center gap-4 px-5 py-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{artifact.filename}</p><p className="mt-1 text-xs text-slate-500">{artifact.projectName} · {artifact.type.toUpperCase()} · {sizeLabel(Number(artifact.sizeBytes))} · {formatDate(artifact.createdAt)}</p></div><button onClick={() => download.mutate({ artifactId: artifact.id })} disabled={download.isPending} className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-500"><Download className="h-3.5 w-3.5" /> Baixar</button></div>})}</div> : <div className="px-6 py-20 text-center"><HardDriveDownload className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" /><p className="mt-4 font-semibold text-slate-700 dark:text-slate-200">Ainda não há artefatos</p><p className="mt-1 text-sm text-slate-500">Quando um worker concluir um build, os arquivos serão listados aqui com acesso temporário.</p></div>}</section></div>;
}
