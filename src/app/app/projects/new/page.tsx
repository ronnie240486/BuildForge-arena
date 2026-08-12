"use client";

import { useActionState, useState, useRef } from "react";
import { createProject, createSiteApp } from "@/lib/project-actions";
import { Card, Button, Badge } from "@/components/ui";
import { GitBranch, Package, FolderGit2, UploadCloud, Loader2, Sparkles, ArrowRight, Globe } from "lucide-react";

function SiteToApkCard() {
  const [state, action, pending] = useActionState(createSiteApp, null);
  return (
    <Card className="overflow-hidden border-emerald-200 dark:border-emerald-500/30">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-5 text-white">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Transformar site em APK</h2>
        </div>
        <p className="mt-1 text-sm text-emerald-50">
          Cole a URL do seu site e a BuildForge gera um APK que abre ele (via WebView nativa/Capacitor).
        </p>
      </div>
      <form action={action} className="space-y-3 p-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">URL do site</label>
          <input
            name="url"
            type="url"
            required
            placeholder="https://seusite.com"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Nome do app (opcional)</label>
          <input
            name="name"
            placeholder="Auto a partir do site"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        {state?.error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {state.error}
          </div>
        )}
        <Button type="submit" disabled={pending} size="lg" className="w-full bg-emerald-600 hover:bg-emerald-500">
          {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Criando…</> : <><Globe className="h-4 w-4" /> Criar app do site <ArrowRight className="h-4 w-4" /></>}
        </Button>
        <p className="text-center text-xs text-slate-400">
          Depois: configure o ícone, conecte um worker e clique em Iniciar build REAL.
        </p>
      </form>
    </Card>
  );
}

type Source = "github" | "clone" | "zip";

const samples = [
  "https://github.com/flutter/packages",
  "https://github.com/facebook/react-native",
  "https://github.com/android/compose-samples",
  "https://github.com/android/architecture-samples",
];

export default function NewProjectPage() {
  const [source, setSource] = useState<Source>("github");
  const [state, action, pending] = useActionState(createProject, null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tabs: { id: Source; label: string; icon: typeof GitBranch; desc: string }[] = [
    { id: "github", label: "GitHub", icon: GitBranch, desc: "Importa de uma URL pública" },
    { id: "clone", label: "Clonar", icon: FolderGit2, desc: "Clona via git (SSH/HTTPS)" },
    { id: "zip", label: "Enviar ZIP", icon: Package, desc: "Arraste e solte um .zip" },
  ];

  // We only capture the file NAME (metadata) — the binary is never uploaded to the
  // Server Action, so large ZIPs never overflow the request body limit.
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setFileName(file.name);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importar projeto</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          A BuildForge detecta o framework, dependências e problemas automaticamente.
        </p>
      </div>

      {/* Atalho: transformar site em APK */}
      <SiteToApkCard />

      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        ou importe um projeto de código
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>

      <Card className="p-6">
        {/* Source tabs */}
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/60">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setSource(t.id)}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-3 text-center text-sm font-medium transition-colors ${
                source === t.id
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              <t.icon className="h-5 w-5" />
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-slate-400">{tabs.find((t) => t.id === source)?.desc}</p>

        <form action={action} className="mt-6 space-y-4">
          <input type="hidden" name="source" value={source} />

          {source !== "zip" ? (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  URL do repositório
                </label>
                <div className="relative">
                  <GitBranch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    name="repoUrl"
                    type="url"
                    required
                    placeholder="https://github.com/usuario/repo"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Branch</label>
                  <input
                    name="branch"
                    defaultValue="main"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nome (opcional)
                  </label>
                  <input
                    name="name"
                    placeholder="Auto a partir da URL"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-slate-400">Ou tente um exemplo:</p>
                <div className="flex flex-wrap gap-2">
                  {samples.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        const el = document.querySelector<HTMLInputElement>(`input[name="repoUrl"]`);
                        if (el) el.value = s;
                      }}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    >
                      {s.replace("https://github.com/", "")}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                  dragging
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                    : "border-slate-300 hover:border-indigo-400 dark:border-slate-700"
                }`}
              >
                <UploadCloud className={`h-10 w-10 ${dragging ? "text-indigo-500" : "text-slate-400"}`} />
                <p className="mt-3 text-sm font-medium">
                  {fileName ? fileName : "Arraste e solte seu .zip aqui"}
                </p>
                <p className="mt-1 text-xs text-slate-400">ou clique para selecionar · projeto Android/Flutter/RN compactado</p>
                {/* File picker for UX only — the binary is NOT uploaded. */}
                <input
                  ref={inputRef}
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                />
                {/* Only the filename (metadata) is submitted to the Server Action. */}
                <input type="hidden" name="zipName" value={fileName ?? ""} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nome do projeto (opcional)
                </label>
                <input
                  name="name"
                  placeholder="Auto a partir do arquivo"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            </>
          )}

          {state?.error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {state.error}
            </div>
          )}

          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Analisando repositório…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Importar e detectar stack <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Card>

      <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
        <Sparkles className="h-3.5 w-3.5" />
        <Badge tone="indigo">IA</Badge> A detecção roda imediatamente após a importação.
      </div>
    </div>
  );
}
