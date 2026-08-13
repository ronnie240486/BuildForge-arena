"use client";

import { useActionState, useTransition } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { addProjectMember, removeProjectMember, updateProjectMemberRole } from "@/lib/org-actions";
import { Users, UserPlus, Trash2, Loader2 } from "lucide-react";

export type OrgProjectRow = {
  id: string;
  name: string;
  members: { userId: string; name: string; email: string; role: string }[];
};

export function OrganizationsClient({ projects }: { projects: OrgProjectRow[] }) {
  return (
    <div className="space-y-6">
      {projects.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">Nenhum projeto ainda. Crie um projeto para convidar colaboradores.</Card>
      ) : (
        projects.map((p) => <ProjectTeamCard key={p.id} project={p} />)
      )}
    </div>
  );
}

function ProjectTeamCard({ project }: { project: OrgProjectRow }) {
  const [state, action, pending] = useActionState(addProjectMember, null);
  const [, start] = useTransition();

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-indigo-500" />
        <h2 className="font-semibold">{project.name}</h2>
        <Badge tone="default">{project.members.length} membro(s)</Badge>
      </div>

      <div className="space-y-2">
        {project.members.map((m) => (
          <div key={m.userId} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/40">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{m.name}</p>
              <p className="truncate text-xs text-slate-400">{m.email}</p>
            </div>
            <select
              defaultValue={m.role}
              onChange={(e) => start(async () => { await updateProjectMemberRole(project.id, m.userId, e.target.value); })}
              className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="viewer">viewer</option>
              <option value="contributor">contributor</option>
              <option value="maintainer">maintainer</option>
            </select>
            <button
              onClick={() => start(async () => { await removeProjectMember(project.id, m.userId); })}
              className="text-slate-400 hover:text-rose-600"
              title="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {project.members.length === 0 && <p className="py-4 text-center text-xs text-slate-400">Nenhum colaborador ainda.</p>}
      </div>

      <form action={action} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input type="hidden" name="projectId" value={project.id} />
        <input
          name="email"
          type="email"
          placeholder="email@exemplo.com"
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
        />
        <select name="role" defaultValue="contributor" className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900">
          <option value="viewer">viewer</option>
          <option value="contributor">contributor</option>
          <option value="maintainer">maintainer</option>
        </select>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />} Convidar
        </Button>
      </form>
      {state && "error" in state && <p className="mt-2 text-xs text-rose-600">{state.error}</p>}
    </Card>
  );
}
