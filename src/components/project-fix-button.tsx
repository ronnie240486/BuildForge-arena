"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { applyProjectFix, startBuild } from "@/lib/project-actions";
import { Button } from "@/components/ui";
import { Wand2, Loader2, Hammer, CheckCircle2 } from "lucide-react";

export function ProjectFixButton({ projectId, code }: { projectId: string; code: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        disabled={pending || done}
        onClick={() => {
          setErr(null);
          const fd = new FormData();
          fd.set("projectId", projectId);
          fd.set("code", code);
          start(async () => {
            const res = await applyProjectFix(null, fd);
            if (res && "error" in res && res.error) setErr(res.error);
            else setDone(true);
          });
        }}
      >
        {pending ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Aplicando…</>
        ) : done ? (
          <><CheckCircle2 className="h-3.5 w-3.5" /> Correção aplicada</>
        ) : (
          <><Wand2 className="h-3.5 w-3.5" /> Aplicar correção</>
        )}
      </Button>
      {err && <span className="text-xs text-rose-500">{err}</span>}
    </div>
  );
}

// For real (environment) insights: the fix happens on your PC, so the useful
// action is to run the build again after you fixed it.
export function RebuildButton({ projectId, framework }: { projectId: string; framework: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => {
        const fd = new FormData();
        fd.set("target", framework === "reactnative" ? "apk" : "apk");
        fd.set("variant", "release");
        fd.set("mode", "real");
        start(async () => {
          await startBuild(projectId, fd);
          router.refresh();
        });
      }}
    >
      {pending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enfileirando…</> : <><Hammer className="h-3.5 w-3.5" /> Compilar novamente</>}
    </Button>
  );
}
