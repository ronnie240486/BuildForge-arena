import { db } from "@/db";
import { releaseLinks, artifacts, builds, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Download, PackageCheck, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PublicReleasePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [link] = await db.select().from(releaseLinks).where(eq(releaseLinks.token, token)).limit(1);

  const expired = link?.expiresAt ? link.expiresAt.getTime() < Date.now() : false;

  if (!link || expired) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-center text-white">
        <div>
          <PackageCheck className="mx-auto h-12 w-12 text-rose-400" />
          <h1 className="mt-4 text-2xl font-semibold">Link de release indisponível</h1>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Este link pode ter expirado ou não estar mais disponível. Solicite uma nova entrega ao responsável pelo projeto.
          </p>
        </div>
      </main>
    );
  }

  const [art] = await db.select().from(artifacts).where(eq(artifacts.id, link.artifactId)).limit(1);
  const [build] = art ? await db.select().from(builds).where(eq(builds.id, art.buildId)).limit(1) : [];
  const [project] = build ? await db.select().from(projects).where(eq(projects.id, build.projectId)).limit(1) : [];

  if (!art) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-center text-white">
        <div>
          <PackageCheck className="mx-auto h-12 w-12 text-rose-400" />
          <h1 className="mt-4 text-2xl font-semibold">Artefato não encontrado</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-5 text-white">
      <article className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-7 shadow-2xl">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-600">
          <PackageCheck className="h-6 w-6" />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-violet-300">BuildForge release</p>
        <h1 className="mt-2 text-2xl font-semibold">{art.name}</h1>
        <p className="mt-1 text-sm text-slate-400">Projeto {project?.name ?? "—"}</p>
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <p className="text-sm font-semibold">{art.name}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">Canal {link.channel}</p>
        </div>
        <a
          href={`/api/artifacts/${art.id}/download`}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-semibold text-white hover:bg-violet-500"
        >
          <Download className="h-4 w-4" /> Baixar arquivo
        </a>
        <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          O download usa um link temporário seguro. O arquivo só deve ser instalado se você confia na origem.
        </p>
      </article>
    </main>
  );
}
