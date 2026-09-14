"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Globe, Loader2 } from "lucide-react";

export function RecreateAsWebButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        size="sm"
        variant="secondary"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            const res = await fetch("/api/ai/recreate-as-web", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ projectId }),
            });
            const data = await res.json();
            if (!res.ok || data.error) {
              setError(data.error || "Falha ao recriar o projeto.");
              setLoading(false);
              return;
            }
            router.push(`/app/projects/${data.projectId}`);
          } catch {
            setError("Falha de rede ao recriar o projeto.");
            setLoading(false);
          }
        }}
      >
        {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Recriando…</> : <><Globe className="h-3.5 w-3.5" /> Recriar como Web (IA)</>}
      </Button>
      <p className="max-w-xs text-[11px] text-slate-400">
        Recriação de melhor esforço via IA — não é pixel-perfect (ex.: player nativo vira <code className="font-mono">&lt;video&gt;</code> HTML5). Gera um novo projeto web, pronto pro pipeline EXE.
      </p>
      {error && <span className="text-xs text-rose-500">{error}</span>}
    </div>
  );
}
