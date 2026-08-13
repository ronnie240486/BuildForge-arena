import { requireAdmin } from "@/lib/auth";
import { listBackups, type BackupSnapshot } from "@/lib/backup-actions";
import { BackupsClient, type BackupItem } from "@/components/backups-client";

export const dynamic = "force-dynamic";

export default async function BackupsPage() {
  const me = await requireAdmin();
  const rows = await listBackups(me.id);

  const items: BackupItem[] = rows.map((b) => {
    const snap = b.snapshot as BackupSnapshot;
    return {
      id: b.id,
      label: b.label,
      sizeBytes: b.sizeBytes,
      createdAt: b.createdAt.toISOString(),
      projectCount: snap.projects?.length ?? 0,
      webhookCount: snap.webhooks?.length ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Backups</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Crie snapshots da sua conta e restaure quando precisar, sem apagar o que já existe.
        </p>
      </div>
      <BackupsClient backups={items} />
    </div>
  );
}
