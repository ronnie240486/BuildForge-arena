import { db } from "@/db";
import { projects, projectMembers, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq, desc, inArray } from "drizzle-orm";
import { OrganizationsClient, type OrgProjectRow } from "@/components/organizations-client";

export const dynamic = "force-dynamic";

export default async function OrganizationsPage() {
  const me = await requireUser();
  const myProjects = await db.select().from(projects).where(eq(projects.ownerId, me.id)).orderBy(desc(projects.createdAt));

  const projectIds = myProjects.map((p) => p.id);
  const members = projectIds.length
    ? await db.select().from(projectMembers).where(inArray(projectMembers.projectId, projectIds))
    : [];
  const userIds = [...new Set(members.map((m) => m.userId))];
  const memberUsers = userIds.length ? await db.select().from(users).where(inArray(users.id, userIds)) : [];
  const userMap = new Map(memberUsers.map((u) => [u.id, u]));

  const items: OrgProjectRow[] = myProjects.map((p) => ({
    id: p.id,
    name: p.name,
    members: members
      .filter((m) => m.projectId === p.id)
      .map((m) => {
        const u = userMap.get(m.userId);
        return { userId: m.userId, name: u?.name ?? "?", email: u?.email ?? "?", role: m.role };
      }),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organizações</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Convide colaboradores para seus projetos e gerencie o nível de acesso de cada um.
        </p>
      </div>
      <OrganizationsClient projects={items} />
    </div>
  );
}
