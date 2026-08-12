"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBuild, clearFailedBuilds } from "@/lib/project-actions";
import { Button } from "@/components/ui";
import { Trash2, Loader2, Eraser } from "lucide-react";

export function DeleteBuildButton({ buildId, redirectTo }: { buildId: string; redirectTo?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        start(async () => {
          await deleteBuild(buildId);
          if (redirectTo) router.push(redirectTo);
        });
      }}
      disabled={pending}
      title="Excluir build"
      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50 dark:hover:bg-rose-500/10"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}

export function ClearFailedButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => start(async () => { await clearFailedBuilds(); })}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
      Limpar builds falhos
    </Button>
  );
}
