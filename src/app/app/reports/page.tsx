import { db } from "@/db";
import { builds, projects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq, desc, inArray } from "drizzle-orm";
import { Card, Badge } from "@/components/ui";
import { Hammer, CheckCircle2, XCircle, Clock, TrendingUp, FolderGit2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const me = await requireUser();

  const myProjects = await db.select().from(projects).where(eq(projects.ownerId, me.id));
  const projectIds = myProjects.map((p) => p.id);

  const allBuilds = projectIds.length
    ? await db.select().from(builds).where(inArray(builds.projectId, projectIds)).orderBy(desc(builds.createdAt))
    : [];

  const total = allBuilds.length;
  const success = allBuilds.filter((b) => b.status === "success").length;
  const failed = allBuilds.filter((b) => b.status === "failed").length;
  const running = allBuilds.filter((b) => b.status === "running" || b.status === "queued").length;
  const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

  const avgDurationMs =
    allBuilds.filter((b) => b.durationMs).reduce((s, b) => s + (b.durationMs ?? 0), 0) /
    (allBuilds.filter((b) => b.durationMs).length || 1);

  const byFramework = new Map<string, { total: number; success: number }>();
  const projectMap = new Map(myProjects.map((p) => [p.id, p]));
  for (const b of allBuilds) {
    const fw = projectMap.get(b.projectId)?.framework ?? "unknown";
    const entry = byFramework.get(fw) ?? { total: 0, success: 0 };
    entry.total++;
    if (b.status === "success") entry.success++;
    byFramework.set(fw, entry);
  }

  const recentByProject = new Map<string, number>();
  for (const b of allBuilds) {
    recentByProject.set(b.projectId, (recentByProject.get(b.projectId) ?? 0) + 1);
  }
  const topProjects = [...recentByProject.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ name: projectMap.get(id)?.name ?? "?", count }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Visão consolidada de builds e projetos.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10"><Hammer className="h-5 w-5" /></div>
          <div><p className="text-xl font-semibold">{total}</p><p className="text-xs text-slate-400">builds totais</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"><CheckCircle2 className="h-5 w-5" /></div>
          <div><p className="text-xl font-semibold">{successRate}%</p><p className="text-xs text-slate-400">taxa de sucesso</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10"><XCircle className="h-5 w-5" /></div>
          <div><p className="text-xl font-semibold">{failed}</p><p className="text-xs text-slate-400">falharam</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10"><Clock className="h-5 w-5" /></div>
          <div><p className="text-xl font-semibold">{Math.round(avgDurationMs / 1000)}s</p><p className="text-xs text-slate-400">duração média</p></div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            <h2 className="font-semibold">Sucesso por framework</h2>
          </div>
          {byFramework.size === 0 ? (
            <p className="text-sm text-slate-400">Sem dados ainda.</p>
          ) : (
            <div className="space-y-3">
              {[...byFramework.entries()].map(([fw, stats]) => {
                const rate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;
                return (
                  <div key={fw}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{fw}</span>
                      <span className="text-slate-400">{stats.success}/{stats.total} ({rate}%)</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <FolderGit2 className="h-4 w-4 text-indigo-500" />
            <h2 className="font-semibold">Projetos mais buildados</h2>
          </div>
          {topProjects.length === 0 ? (
            <p className="text-sm text-slate-400">Sem dados ainda.</p>
          ) : (
            <div className="space-y-2">
              {topProjects.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <span className="truncate">{p.name}</span>
                  <Badge tone="default">{p.count} build(s)</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="flex items-center gap-4 p-4 text-sm text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5"><Badge tone="emerald" dot>{success} sucesso</Badge></span>
        <span className="flex items-center gap-1.5"><Badge tone="rose" dot>{failed} falha</Badge></span>
        <span className="flex items-center gap-1.5"><Badge tone="sky" dot>{running} em andamento</Badge></span>
      </Card>
    </div>
  );
}
