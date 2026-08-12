import Link from "next/link";
import { db } from "@/db";
import { projects, builds } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { Card, Badge, FrameworkIcon, Button, Progress } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { Plus, FolderGit2, GitBranch, Package, Hammer } from "lucide-react";

export const dynamic = "force-dynamic";

const sourceIcon: Record<string, typeof GitBranch> = {
  github: GitBranch,
  clone: GitBranch,
  zip: Package,
  manual: Package,
};

export default async function ProjectsPage() {
  const me = await requireUser();
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, me.id))
    .orderBy(desc(projects.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {rows.length} projeto(s) · gerencie, analise e compile.
          </p>
        </div>
        <Link href="/app/projects/new">
          <Button><Plus className="h-4 w-4" /> Novo projeto</Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10">
            <FolderGit2 className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Nenhum projeto ainda</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Importe um repositório do GitHub, envie um ZIP ou clone um repositório para começar.
          </p>
          <Link href="/app/projects/new" className="mt-5">
            <Button><Plus className="h-4 w-4" /> Importar primeiro projeto</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => {
            const SrcIcon = sourceIcon[p.source] ?? Package;
            return (
              <Link key={p.id} href={`/app/projects/${p.id}`}>
                <Card className="group h-full p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl dark:bg-slate-800">
                        <FrameworkIcon fw={p.framework} />
                      </div>
                      <div>
                        <p className="font-semibold leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {p.name}
                        </p>
                        <p className="text-xs capitalize text-slate-400">{p.framework} · {p.language}</p>
                      </div>
                    </div>
                    <Badge
                      tone={p.status === "ready" ? "emerald" : p.status === "failed" || p.status === "needs_setup" ? "amber" : p.status === "building" ? "violet" : "default"}
                      dot
                    >
                      {p.status.replace("_", " ")}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Saúde do projeto</span>
                      <span className="font-medium text-slate-600 dark:text-slate-300">{p.healthScore}%</span>
                    </div>
                    <Progress value={p.healthScore ?? 100} tone={(p.healthScore ?? 100) > 70 ? "emerald" : (p.healthScore ?? 100) > 40 ? "amber" : "rose"} />
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-800/60">
                    <span className="inline-flex items-center gap-1.5">
                      <SrcIcon className="h-3.5 w-3.5" /> {p.source}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Hammer className="h-3.5 w-3.5" /> {timeAgo(p.lastBuildAt)}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
