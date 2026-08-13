import { db } from "@/db";
import { buildSchedules, projects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { SchedulesClient, type ScheduleRow, type ProjectOption } from "@/components/schedules-client";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  const me = await requireUser();
  const myProjects = await db.select().from(projects).where(eq(projects.ownerId, me.id)).orderBy(desc(projects.createdAt));
  const rows = await db.select().from(buildSchedules).where(eq(buildSchedules.ownerId, me.id)).orderBy(desc(buildSchedules.createdAt));

  const projectMap = new Map(myProjects.map((p) => [p.id, p.name]));
  const schedules: ScheduleRow[] = rows.map((s) => ({
    id: s.id,
    projectId: s.projectId,
    projectName: projectMap.get(s.projectId) ?? "Projeto removido",
    target: s.target,
    frequency: s.frequency,
    active: s.active,
    lastRunAt: s.lastRunAt ? s.lastRunAt.toISOString() : null,
    nextRunAt: s.nextRunAt.toISOString(),
  }));

  const projectOptions: ProjectOption[] = myProjects.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agendamentos</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Programe builds recorrentes para seus projetos.
        </p>
      </div>
      <SchedulesClient schedules={schedules} projects={projectOptions} />
    </div>
  );
}
