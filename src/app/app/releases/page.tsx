import { db } from "@/db";
import { projects, signingConfigs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { ReleasesClient, type ReleaseProjectRow } from "@/components/releases-client";

export const dynamic = "force-dynamic";

export default async function ReleasesPage() {
  const me = await requireUser();
  const rows = await db.select().from(projects).where(eq(projects.ownerId, me.id)).orderBy(desc(projects.createdAt));
  const sigs = await db.select().from(signingConfigs);
  const sigByProject = new Map(sigs.map((s) => [s.projectId, s]));

  const items: ReleaseProjectRow[] = rows.map((p) => {
    const sig = sigByProject.get(p.id);
    return {
      id: p.id,
      name: p.name,
      framework: p.framework,
      versionName: p.versionName,
      signed: Boolean(sig?.configured),
      keyAlias: sig?.keyAlias ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Releases</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Empacote sites como apps, configure a chave de assinatura e gerencie a versão de cada projeto.
        </p>
      </div>
      <ReleasesClient projects={items} />
    </div>
  );
}
