import { db } from "@/db";
import { users, projects, builds } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { Card } from "@/components/ui";
import { AdminClient, type AdminUserRow } from "@/components/admin-client";
import { CreateUserForm } from "@/components/account-forms";
import { Users, FolderGit2, Hammer, ShieldCheck } from "lucide-react";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await requireAdmin();

  const allUsers = await db.select().from(users);
  const projectCounts = await db
    .select({ ownerId: projects.ownerId, count: sql<number>`count(*)::int` })
    .from(projects)
    .groupBy(projects.ownerId);
  const buildCounts = await db
    .select({ userId: builds.userId, count: sql<number>`count(*)::int` })
    .from(builds)
    .groupBy(builds.userId);

  const projectMap = new Map(projectCounts.map((p) => [p.ownerId, p.count]));
  const buildMap = new Map(buildCounts.map((b) => [b.userId, b.count]));

  const rows: AdminUserRow[] = allUsers
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      buildLimit: u.buildLimit,
      buildsUsed: u.buildsUsed,
      projectCount: projectMap.get(u.id) ?? 0,
      buildCount: buildMap.get(u.id) ?? 0,
      createdAt: u.createdAt.toISOString(),
      isMe: u.id === me.id,
    }))
    .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === "admin" ? -1 : 1));

  const totalBuilds = buildCounts.reduce((s, b) => s + b.count, 0);
  const totalProjects = projectCounts.reduce((s, p) => s + p.count, 0);
  const adminCount = allUsers.filter((u) => u.role === "admin").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Administração</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Gerencie usuários, papéis, limites de build e visão geral de uso da conta.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10"><Users className="h-5 w-5" /></div>
          <div><p className="text-xl font-semibold">{allUsers.length}</p><p className="text-xs text-slate-400">usuários</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10"><ShieldCheck className="h-5 w-5" /></div>
          <div><p className="text-xl font-semibold">{adminCount}</p><p className="text-xs text-slate-400">administradores</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"><FolderGit2 className="h-5 w-5" /></div>
          <div><p className="text-xl font-semibold">{totalProjects}</p><p className="text-xs text-slate-400">projetos</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10"><Hammer className="h-5 w-5" /></div>
          <div><p className="text-xl font-semibold">{totalBuilds}</p><p className="text-xs text-slate-400">builds totais</p></div>
        </Card>
      </div>

      <CreateUserForm />

      <AdminClient users={rows} />
    </div>
  );
}
