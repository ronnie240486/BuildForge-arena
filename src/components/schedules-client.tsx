"use client";

import Link from "next/link";
import { useActionState, useTransition } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { createSchedule, toggleSchedule, deleteSchedule, markScheduleRun } from "@/lib/schedule-actions";
import { CalendarClock, Plus, Power, Trash2, Loader2, Play } from "lucide-react";

export type ScheduleRow = {
  id: string;
  projectId: string;
  projectName: string;
  target: string;
  frequency: string;
  active: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
};

export type ProjectOption = { id: string; name: string };

export function SchedulesClient({ schedules, projects }: { schedules: ScheduleRow[]; projects: ProjectOption[] }) {
  const [state, action, pending] = useActionState(createSchedule, null);
  const [, start] = useTransition();

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-indigo-500" />
          <h2 className="font-semibold">Novo agendamento</h2>
        </div>
        {projects.length === 0 ? (
          <p className="text-sm text-slate-400">Crie um projeto primeiro para agendar builds.</p>
        ) : (
          <form action={action} className="grid gap-3 sm:grid-cols-4">
            <select name="projectId" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select name="target" defaultValue="apk" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
              <option value="apk">APK</option>
              <option value="aab">AAB</option>
            </select>
            <select name="frequency" defaultValue="daily" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
              <option value="daily">Diário</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} Agendar
            </Button>
          </form>
        )}
        {state && "error" in state && <p className="mt-2 text-sm text-rose-600">{state.error}</p>}
      </Card>

      <Card>
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold">Agendamentos ativos</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {schedules.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">Nenhum agendamento criado.</p>
          ) : (
            schedules.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/app/projects/${s.projectId}`} className="truncate text-sm font-medium hover:text-indigo-600">{s.projectName}</Link>
                  <p className="text-xs text-slate-400">
                    {s.target.toUpperCase()} · {s.frequency === "daily" ? "diário" : s.frequency === "weekly" ? "semanal" : "mensal"} · próxima: {new Date(s.nextRunAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <Badge tone={s.active ? "emerald" : "default"}>{s.active ? "ativo" : "pausado"}</Badge>
                <button
                  onClick={() => start(async () => { await markScheduleRun(s.id); })}
                  title="Marcar como executado agora (dispare o build real em Builds)"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <Play className="h-4 w-4" />
                </button>
                <button
                  onClick={() => start(async () => { await toggleSchedule(s.id); })}
                  title={s.active ? "Pausar" : "Reativar"}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <Power className="h-4 w-4" />
                </button>
                <button
                  onClick={() => start(async () => { await deleteSchedule(s.id); })}
                  title="Excluir"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
