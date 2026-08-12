import Link from "next/link";
import { db } from "@/db";
import { projects, builds, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { Card, StatCard, Badge, Progress, FrameworkIcon, Button } from "@/components/ui";
import { formatDuration, timeAgo } from "@/lib/utils";
import { FolderGit2, Hammer, CheckCircle2, Timer, Plus, Sparkles, ArrowRight, Activity } from "lucide-react";

export const dynamic = "force-dynamic";

function statusTone(status: string) {
  return status === "success" ? "emerald" : status === "failed" ? "rose" : status === "running" || status === "queued" ? "amber" : "default";
}

export default async function DashboardPage() {
  const me = await requireUser();

  const userProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.ownerId, me.id));

  const projectIds = userProjects.map((p) => p.id);
  const projectCount = userProjects.length;

  let recentBuilds: (typeof builds.$inferSelect & { projectName: string; framework: string })[] = [];
  let buildCount = 0;
  let successCount = 0;
  let avgMs: number | null = null;

  if (projectIds.length) {
    recentBuilds = await db
      .select({
        build: builds,
        projectName: projects.name,
        framework: projects.framework,
      })
      .from(builds)
      .innerJoin(projects, eq(builds.projectId, projects.id))
      .where(inArray(builds.projectId, projectIds))
      .orderBy(desc(builds.createdAt))
      .limit(7)
      .then((rows) => rows.map((r) => ({ ...r.build, projectName: r.projectName, framework: r.framework })));

    const agg = await db
      .select({
        total: sql<number>`count(*)::int`,
        success: sql<number>`count(*) filter (where ${builds.status} = 'success')::int`,
        avg: sql<number>`round(avg(${builds.durationMs}) filter (where ${builds.status} = 'success'))::int`,
      })
      .from(builds)
      .where(inArray(builds.projectId, projectIds));
    buildCount = agg[0]?.total ?? 0;
    successCount = agg[0]?.success ?? 0;
    avgMs = agg[0]?.avg ?? null;
  }

  const recentProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, me.id))
    .orderBy(desc(projects.createdAt))
    .limit(4);

  const successRate = buildCount ? Math.round((successCount / buildCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Olá, {me.name.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Aqui está o resumo da sua atividade de build.
          </p>
        </div>
        <Link href="/app/projects/new">
          <Button><Plus className="h-4 w-4" /> Novo projeto</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Projetos" value={projectCount} icon={<FolderGit2 className="h-5 w-5" />} trend="Importados na sua conta" tone="indigo" />
        <StatCard label="Total de builds" value={buildCount} icon={<Hammer className="h-5 w-5" />} trend="Todos os frameworks" tone="violet" />
        <StatCard label="Taxa de sucesso" value={`${successRate}%`} icon={<CheckCircle2 className="h-5 w-5" />} trend={`${successCount} build(s) concluída(s)`} tone="emerald" />
        <StatCard label="Tempo médio" value={formatDuration(avgMs)} icon={<Timer className="h-5 w-5" />} trend="Builds de sucesso" tone="sky" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent builds */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-500" />
              <h2 className="font-semibold">Builds recentes</h2>
            </div>
            <Link href="/app/builds" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {recentBuilds.length === 0 ? (
              <EmptyBuilds />
            ) : (
              recentBuilds.map((b) => (
                <Link key={b.id} href={`/app/builds/${b.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <FrameworkIcon fw={b.framework} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.projectName}</p>
                    <p className="text-xs text-slate-400">
                      {b.target.toUpperCase()} · {b.variant} · {timeAgo(b.createdAt)}
                    </p>
                  </div>
                  {b.status === "running" || b.status === "queued" ? (
                    <div className="w-24">
                      <Progress value={b.progress} tone="amber" />
                    </div>
                  ) : null}
                  <Badge tone={statusTone(b.status)} dot>{b.status}</Badge>
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white">
              <Sparkles className="h-7 w-7" />
              <h3 className="mt-3 font-semibold">A IA já está pronta</h3>
              <p className="mt-1 text-sm text-indigo-100">
                Importe um projeto e deixe a BuildForge detectar a stack, instalar dependências e corrigir erros.
              </p>
              <Link href="/app/projects/new" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-sm font-medium backdrop-blur hover:bg-white/25">
                Importar agora <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Card>

          <Card>
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <h2 className="font-semibold">Projetos recentes</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {recentProjects.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">Nenhum projeto ainda.</p>
              ) : (
                recentProjects.map((p) => (
                  <Link key={p.id} href={`/app/projects/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <FrameworkIcon fw={p.framework} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.framework} · {timeAgo(p.createdAt)}</p>
                    </div>
                    <Badge tone={p.status === "ready" ? "emerald" : p.status === "failed" ? "rose" : "amber"}>{p.status}</Badge>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EmptyBuilds() {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
        <Hammer className="h-6 w-6 text-slate-400" />
      </div>
      <p className="mt-3 text-sm font-medium">Nenhum build ainda</p>
      <p className="mt-1 text-xs text-slate-400">Importe um projeto e dispare o primeiro build.</p>
      <Link href="/app/projects/new" className="mt-4 inline-block">
        <Button size="sm"><Plus className="h-4 w-4" /> Importar projeto</Button>
      </Link>
    </div>
  );
}
