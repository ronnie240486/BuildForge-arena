"use client";

import { useState, useTransition } from "react";
import { startBuild } from "@/lib/project-actions";
import { Button } from "@/components/ui";
import { Hammer, Loader2 } from "lucide-react";

const targets = [
  { id: "apk", label: "APK", desc: "Android installer" },
  { id: "aab", label: "AAB", desc: "Play Store bundle" },
  { id: "appbundle", label: "Bundle", desc: "Generic bundle" },
  { id: "exe", label: "EXE", desc: "Windows (RN)" },
] as const;

const variants = ["release", "debug", "staging"];

export function BuildLauncher({
  projectId,
  framework,
  hasWorker,
  hasRepo,
}: {
  projectId: string;
  framework: string;
  hasWorker: boolean;
  hasRepo: boolean;
}) {
  const [target, setTarget] = useState<string>(framework === "reactnative" ? "exe" : "apk");
  const [variant, setVariant] = useState("release");
  const [pending, startTransition] = useTransition();

  function launch() {
    const fd = new FormData();
    fd.set("target", target);
    fd.set("variant", variant);
    fd.set("mode", "real");
    startTransition(async () => {
      await startBuild(projectId, fd);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium text-slate-400">Alvo do build</p>
        <div className="grid grid-cols-2 gap-2">
          {targets.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTarget(t.id)}
              className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                target === t.id
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
              }`}
            >
              <p className="text-sm font-semibold">{t.label}</p>
              <p className="text-[11px] text-slate-400">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-slate-400">Variante</p>
        <div className="flex gap-2">
          {variants.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVariant(v)}
              className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                variant === v
                  ? "border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                  : "border-slate-200 text-slate-500 dark:border-slate-700"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Build real ✅</p>
        <p className="text-[11px] text-emerald-700/80 dark:text-emerald-200/70">
          Compila no seu worker com Android SDK e gera um APK instalável.
        </p>
        {!hasWorker && (
          <p className="mt-2 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            ⚠️ Nenhum worker online. Conecte um em <b>Workers</b> primeiro.
          </p>
        )}
        {!hasRepo && (
          <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
            Sem URL de repositório: rode o worker com <code className="font-mono">--project &lt;caminho&gt;</code> para compilar sua pasta local.
          </p>
        )}
      </div>

      <Button onClick={launch} disabled={pending || !hasWorker} size="lg" className="w-full">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Enfileirando…
          </>
        ) : (
          <>
            <Hammer className="h-4 w-4" /> Iniciar build REAL
          </>
        )}
      </Button>
    </div>
  );
}
