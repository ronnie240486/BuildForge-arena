import { useMemo, useState } from "react";
import { FolderGit2, GitBranch, LoaderCircle, PackagePlus, Play, Plus, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { frameworkLabel, formatDate } from "@/lib/buildforge";

type Source = "github" | "git" | "zip";

const sourceCopy: Record<Source, { title: string; hint: string }> = {
  github: { title: "GitHub", hint: "URL HTTPS de um repositório público ou conectado" },
  git: { title: "Git", hint: "URL Git via HTTPS ou SSH" },
  zip: { title: "Arquivo ZIP", hint: "Crie o projeto e envie o pacote na aba de artefatos" },
};

function readAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo selecionado."));
    reader.readAsDataURL(file);
  });
}

export default function ProjectsPage() {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<Source>("github");
  const [name, setName] = useState("");
  const [reference, setReference] = useState("");
  const [branch, setBranch] = useState("main");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const projects = trpc.buildforge.projects.list.useQuery();
  const utils = trpc.useUtils();
  const create = trpc.buildforge.projects.create.useMutation({
    onSuccess: () => {
      void utils.buildforge.projects.list.invalidate();
      void utils.buildforge.dashboard.summary.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const uploadZip = trpc.buildforge.projects.uploadZip.useMutation({
    onSuccess: () => {
      void utils.buildforge.projects.list.invalidate();
      void utils.buildforge.dashboard.summary.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const queue = trpc.buildforge.builds.create.useMutation({
    onSuccess: (build) => { toast.success(`Build inserido na fila · posição ${build.queuePosition}`); void utils.buildforge.builds.list.invalidate(); void utils.buildforge.dashboard.summary.invalidate(); },
    onError: (error) => toast.error(error.message),
  });

  const canCreate = useMemo(() => name.trim().length >= 2 && (source === "zip" ? Boolean(zipFile) : reference.trim().length > 3), [name, reference, source, zipFile]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canCreate) return;
    try {
      const project = await create.mutateAsync({ name: name.trim(), source, reference: reference.trim() || undefined, branch: branch.trim() || "main" });
      if (source === "zip" && zipFile) {
        await uploadZip.mutateAsync({ projectId: project.id, filename: zipFile.name, contentBase64: await readAsBase64(zipFile) });
      }
      toast.success(`Projeto criado · ${frameworkLabel(project.framework)}`);
      setOpen(false); setName(""); setReference(""); setBranch("main"); setZipFile(null);
    } catch {
      // O feedback detalhado vem das mutações.
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Projetos</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Importe código, acompanhe a stack detectada e prepare novas entregas.</p></div>
        <button onClick={() => setOpen(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 active:scale-[0.98]"><Plus className="h-4 w-4" /> Novo projeto</button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
          <form onSubmit={submit} className="w-full max-w-2xl rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-slate-950 sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-slate-950 dark:text-white">Importar projeto</h2><p className="mt-1 text-sm text-slate-500">A plataforma identifica a stack preliminar e prepara a fila. Repositórios Git são clonados e inspecionados pelo worker seguro antes do build.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
            <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
              {(Object.keys(sourceCopy) as Source[]).map((item) => <button type="button" key={item} onClick={() => setSource(item)} className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${source === item ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-300" : "text-slate-500"}`}>{sourceCopy[item].title}</button>)}
            </div>
            <p className="mt-2 text-xs text-slate-500">{sourceCopy[source].hint}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nome do projeto<input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} placeholder="Meu aplicativo" className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none ring-indigo-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-900" /></label><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Branch<input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none ring-indigo-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-900" /></label></div>
            {source !== "zip" && <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">URL do repositório<input value={reference} onChange={(e) => setReference(e.target.value)} required type="url" placeholder={source === "github" ? "https://github.com/organizacao/app" : "https://git.exemplo.com/equipe/app.git"} className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none ring-indigo-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-900" /></label>}
            {source === "zip" && <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-indigo-500/10"><UploadCloud className="mb-2 h-6 w-6 text-indigo-500" /><span className="font-semibold">{zipFile ? zipFile.name : "Escolher arquivo ZIP"}</span><span className="mt-1 text-xs text-slate-500">Até 40 MB · armazenado com acesso protegido</span><input type="file" accept=".zip,application/zip" className="sr-only" onChange={(event) => setZipFile(event.target.files?.[0] ?? null)} /></label>}
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button><button disabled={!canCreate || create.isPending || uploadZip.isPending} className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50"><>{(create.isPending || uploadZip.isPending) && <LoaderCircle className="h-4 w-4 animate-spin" />}</>Criar projeto</button></div>
          </form>
        </div>
      )}

      {projects.isLoading ? <div className="grid min-h-64 place-items-center"><LoaderCircle className="h-6 w-6 animate-spin text-indigo-500" /></div> : projects.data?.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{projects.data.map((project) => <article key={project.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex items-start justify-between gap-3"><span className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-300"><FolderGit2 className="h-5 w-5" /></span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">{frameworkLabel(project.framework)}</span></div><h2 className="mt-5 truncate text-lg font-semibold text-slate-950 dark:text-white">{project.name}</h2><p className="mt-1 min-h-10 text-sm text-slate-500 dark:text-slate-400">{project.description || project.repoUrl || "Projeto sem descrição"}</p><div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><GitBranch className="h-3.5 w-3.5" />{project.branch} · {project.buildCount} build(s)</div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800"><span className="text-xs text-slate-500">Atualizado {formatDate(project.updatedAt)}</span><div className="flex items-center gap-2"><button onClick={() => queue.mutate({ projectId: project.id, artifact: "apk" })} disabled={queue.isPending} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-500"><Play className="h-3.5 w-3.5" /> APK</button><button onClick={() => queue.mutate({ projectId: project.id, artifact: "aab" })} disabled={queue.isPending} className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-800 dark:text-indigo-200 dark:hover:bg-indigo-500/10"><PackagePlus className="h-3.5 w-3.5" /> AAB</button></div></div></article>)}</div> : <section className="rounded-3xl border border-dashed border-slate-300 bg-white py-20 text-center dark:border-slate-800 dark:bg-slate-950"><FolderGit2 className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" /><h2 className="mt-4 font-semibold text-slate-900 dark:text-white">Nenhum projeto criado</h2><p className="mt-1 text-sm text-slate-500">Comece importando um repositório ou registrando um pacote ZIP.</p><button onClick={() => setOpen(true)} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">Criar primeiro projeto</button></section>}
    </div>
  );
}
