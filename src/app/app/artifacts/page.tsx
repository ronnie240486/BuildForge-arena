import { db } from "@/db";
import { artifacts, builds, projects, releaseLinks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getAppUrl } from "@/lib/app-url";
import { eq, desc, inArray } from "drizzle-orm";
import { ArtifactsClient, type ArtifactRow } from "@/components/artifacts-client";

export const dynamic = "force-dynamic";

export default async function ArtifactsPage() {
  const me = await requireUser();
  const baseUrl = await getAppUrl();

  const myProjects = await db.select().from(projects).where(eq(projects.ownerId, me.id));
  const projectMap = new Map(myProjects.map((p) => [p.id, p.name]));
  const projectIds = myProjects.map((p) => p.id);

  const myBuilds = projectIds.length ? await db.select().from(builds).where(inArray(builds.projectId, projectIds)) : [];
  const buildMap = new Map(myBuilds.map((b) => [b.id, b]));
  const buildIds = myBuilds.map((b) => b.id);

  const rows = buildIds.length
    ? await db.select().from(artifacts).where(inArray(artifacts.buildId, buildIds)).orderBy(desc(artifacts.createdAt))
    : [];
  const artifactIds = rows.map((a) => a.id);
  const links = artifactIds.length ? await db.select().from(releaseLinks).where(inArray(releaseLinks.artifactId, artifactIds)) : [];

  const items: ArtifactRow[] = rows.map((a) => {
    const build = buildMap.get(a.buildId);
    return {
      id: a.id,
      name: a.name,
      projectName: build ? (projectMap.get(build.projectId) ?? "?") : "?",
      type: a.type,
      sizeBytes: a.sizeBytes,
      signed: a.signed,
      createdAt: a.createdAt.toISOString(),
      links: links
        .filter((l) => l.artifactId === a.id)
        .map((l) => ({ id: l.id, token: l.token, expiresAt: l.expiresAt ? l.expiresAt.toISOString() : null })),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Artefatos</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          APKs, AABs e outros arquivos gerados. Gere um link temporário para compartilhar sem dar acesso à conta.
        </p>
      </div>
      <ArtifactsClient artifacts={items} baseUrl={baseUrl} />
    </div>
  );
}
