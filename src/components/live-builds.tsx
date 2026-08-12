"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Badge, FrameworkIcon, Progress } from "@/components/ui";
import { DeleteBuildButton, ClearFailedButton } from "@/components/build-actions";
import { formatDuration, timeAgo } from "@/lib/utils";
import { Hammer } from "lucide-react";

export type LiveBuild = {
  id: string;
  status: string;
  progress: number;
  target: string;
  variant: string;
  projectName: string;
  framework: string;
  durationMs: number | null;
  createdAt: string;
  artifactCount: number;
};

const statusTone = (s: string) =>
  s === "success" ? "emerald" : s === "failed" ? "rose" : s === "running" || s === "queued" ? "amber" : "default";

export function LiveBuilds({ initial }: { initial: LiveBuild[] }) {
  const [rows, setRows] = useState<LiveBuild[]>(initial);

  const live = rows.some((r) => r.status === "running" || r.status === "queued");

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/builds/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (active && data.builds) setRows(data.builds);
      } catch {
        /* silencioso */
      }
    };
    // Poll a cada 2s enquanto houver build ativo; senao a cada 6s.
    const interval = setInterval(poll, live ? 2000 : 6000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [rows, live]);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Builds</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            Histórico de compilações.
            {live && (
              <span className="inline-flex items-center gap-1 text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-dot" /> ao vivo
              </span>
            )}
          </p>
        </div>
        {rows.length > 0 && <ClearFailedButton />}
      </div>

      <Card>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                <Hammer className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-medium">Nenhum build ainda</p>
              <Link href="/app/projects/new" className="mt-4 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                Importar projeto →
              </Link>
            </div>
          ) : (
            rows.map((b) => (
              <div key={b.id} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <Link href={`/app/builds/${b.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                  <FrameworkIcon fw={b.framework} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.projectName}</p>
                    <p className="text-xs text-slate-400">
                      {b.target.toUpperCase()} · {b.variant} · {timeAgo(b.createdAt)} · {formatDuration(b.durationMs)}
                      {b.artifactCount > 0 && ` · ${b.artifactCount} artefato(s)`}
                    </p>
                  </div>
                  {(b.status === "running" || b.status === "queued") && (
                    <div className="hidden w-28 sm:block">
                      <Progress value={b.progress} tone="amber" />
                      <p className="mt-0.5 text-right text-[10px] tabular-nums text-slate-400">{b.progress}%</p>
                    </div>
                  )}
                  <Badge tone={statusTone(b.status)} dot>{b.status}</Badge>
                </Link>
                <DeleteBuildButton buildId={b.id} />
              </div>
            ))
          )}
        </div>
      </Card>
    </>
  );
}
