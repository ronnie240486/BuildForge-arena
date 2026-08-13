"use client";

import { useActionState, useState } from "react";
import { Card, Button } from "@/components/ui";
import { createBackup, restoreBackup, deleteBackup } from "@/lib/backup-actions";
import { Archive, Download, RotateCcw, Trash2, Loader2, Plus } from "lucide-react";

export type BackupItem = {
  id: string;
  label: string;
  sizeBytes: number;
  createdAt: string;
  projectCount: number;
  webhookCount: number;
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackupsClient({ backups }: { backups: BackupItem[] }) {
  const [createState, createAction, creating] = useActionState(createBackup, null);
  const [restoreState, restoreAction, restoring] = useActionState(restoreBackup, null);
  const [, deleteAction] = useActionState(deleteBackup, null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-indigo-500" />
          <h2 className="font-semibold">Criar backup</h2>
        </div>
        <form action={createAction} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            name="label"
            placeholder="Rótulo (ex.: Antes da migração)"
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
          />
          <Button type="submit" disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />} Criar backup
          </Button>
        </form>
        {createState && "ok" in createState && createState.ok && (
          <p className="mt-2 text-sm text-emerald-600">Backup criado com sucesso.</p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          Exporta projetos, toolchain e webhooks em um snapshot JSON. Senhas, hashes e keystores nunca são incluídos.
        </p>
      </Card>

      <Card>
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold">Histórico de backups</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {backups.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">Nenhum backup criado ainda.</p>
          ) : (
            backups.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10">
                  <Archive className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.label}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(b.createdAt).toLocaleString("pt-BR")} · {fmtSize(b.sizeBytes)} · {b.projectCount} projeto(s) · {b.webhookCount} webhook(s)
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <a
                    href={`/api/backups/${b.id}/download`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    title="Baixar"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <form
                    action={(fd) => {
                      setRestoringId(b.id);
                      restoreAction(fd);
                    }}
                  >
                    <input type="hidden" name="id" value={b.id} />
                    <button
                      type="submit"
                      disabled={restoring}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      title="Restaurar"
                    >
                      {restoring && restoringId === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    </button>
                  </form>
                  <form action={deleteAction}>
                    <input type="hidden" name="id" value={b.id} />
                    <button
                      type="submit"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {restoreState && "ok" in restoreState && restoreState.ok && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10">
          Restaurado: {restoreState.restoredProjects} projeto(s) e {restoreState.restoredHooks} webhook(s) adicionados (nada existente foi apagado).
        </p>
      )}
      {restoreState && "error" in restoreState && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10">{restoreState.error}</p>
      )}
    </div>
  );
}
