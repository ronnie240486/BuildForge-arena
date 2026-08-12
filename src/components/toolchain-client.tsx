"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui";
import { installTool, verifyEnvironment } from "@/lib/platform-actions";
import { Loader2, Download, ShieldCheck } from "lucide-react";

export function ToolchainControls({ tool, state }: { tool: string; state: string }) {
  const [pending, start] = useTransition();
  const installed = state === "installed";

  if (installed) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <ShieldCheck className="h-3.5 w-3.5" /> Operacional
      </span>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => start(async () => { await installTool(tool); })}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      Instalar
    </Button>
  );
}

export function VerifyButton() {
  const [pending, start] = useTransition();
  return (
    <Button disabled={pending} onClick={() => start(async () => { await verifyEnvironment(); })}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
      Verificar ambiente
    </Button>
  );
}
