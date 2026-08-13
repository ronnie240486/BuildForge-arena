import Link from "next/link";
import { db } from "@/db";
import { toolchain, buildWorkers, builds } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Layers, CheckCircle2, XCircle, Server, Wrench } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const tools = await db.select().from(toolchain);
  const workers = await db.select().from(buildWorkers);
  const recentBuilds = await db.select().from(builds).orderBy(desc(builds.createdAt)).limit(50);

  const onlineWorkers = workers.filter((w) => w.online).length;
  const requiredMissing = tools.filter((t) => t.required && t.state !== "installed").length;

  const recentSuccess = recentBuilds.filter((b) => b.status === "success").length;
  const recentFailed = recentBuilds.filter((b) => b.status === "failed").length;
  const recentTotal = recentBuilds.length;
  const uptimePct = recentTotal > 0 ? Math.round((recentSuccess / recentTotal) * 100) : 100;

  const allHealthy = requiredMissing === 0;

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-8 inline-flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-600/30">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">BuildForge</span>
        </Link>

        <div className={`mb-8 flex items-center gap-3 rounded-2xl border p-5 ${allHealthy ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-500/10" : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-500/10"}`}>
          {allHealthy ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <XCircle className="h-6 w-6 text-amber-600" />}
          <div>
            <p className="font-semibold">{allHealthy ? "Todos os sistemas operacionais" : "Degradação parcial"}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {uptimePct}% de sucesso nos últimos {recentTotal} build(s) · {onlineWorkers} worker(s) online
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mb-3 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-indigo-500" />
            <h2 className="font-semibold">Toolchain</h2>
          </div>
          <div className="space-y-2">
            {tools.map((t) => (
              <div key={t.tool} className="flex items-center justify-between text-sm">
                <span>{t.label}</span>
                <span className={t.state === "installed" ? "text-emerald-600" : t.required ? "text-amber-600" : "text-slate-400"}>
                  {t.state === "installed" ? "operacional" : t.required ? "indisponível" : "opcional"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mb-3 flex items-center gap-2">
            <Server className="h-4 w-4 text-indigo-500" />
            <h2 className="font-semibold">Workers</h2>
          </div>
          {workers.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum worker registrado ainda.</p>
          ) : (
            <div className="space-y-2">
              {workers.map((w) => (
                <div key={w.id} className="flex items-center justify-between text-sm">
                  <span>{w.name}</span>
                  <span className={w.online ? "text-emerald-600" : "text-slate-400"}>{w.online ? "online" : "offline"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">Atualizado automaticamente a cada carregamento.</p>
      </div>
    </div>
  );
}
