import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { builds, projects, aiInsights, artifacts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { Card, Badge, Button, FrameworkIcon } from "@/components/ui";
import { BuildConsole, type BuildInsight } from "@/components/build-console";
import { DeleteBuildButton } from "@/components/build-actions";
import { formatDuration, formatBytes, timeAgo } from "@/lib/utils";
import { ArrowLeft, Download, FileArchive, ShieldCheck, Zap, Cpu, Info } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BuildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;

  const [build] = await db.select().from(builds).where(eq(builds.id, id)).limit(1);
  if (!build) notFound();
  const [project] = await db.select().from(projects).where(eq(projects.id, build.projectId)).limit(1);
  if (!project || project.ownerId !== me.id) notFound();

  const ins = await db
    .select()
    .from(aiInsights)
    .where(eq(aiInsights.buildId, id))
    .orderBy(desc(aiInsights.severity));
  const arts = await db.select().from(artifacts).where(eq(artifacts.buildId, id)).orderBy(desc(artifacts.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href={`/app/projects/${project.id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400">
          <ArrowLeft className="h-4 w-4" /> {project.name}
        </Link>
        <div className="flex items-center gap-3">
          <Badge tone={build.status === "success" ? "emerald" : build.status === "failed" ? "rose" : "amber"} dot>
            {build.status}
          </Badge>
          <DeleteBuildButton buildId={build.id} redirectTo="/app/builds" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <FrameworkIcon fw={project.framework} />
          <h1 className="text-xl font-semibold tracking-tight">
            Build <span className="text-indigo-600 dark:text-indigo-400">{build.target.toUpperCase()}</span>
          </h1>
        </div>
        <span className="text-sm text-slate-400">·</span>
        <span className="text-sm text-slate-500 capitalize">{build.variant}</span>
        <span className="text-sm text-slate-400">·</span>
        <span className="text-sm text-slate-500">Iniciado {timeAgo(build.startedAt ?? build.createdAt)}</span>
        <span className="text-sm text-slate-400">·</span>
        <span className="text-sm text-slate-500">Duração {formatDuration(build.durationMs)}</span>
        <div className="flex gap-2">
          {build.cacheHit && <Badge tone="sky"><Zap className="mr-1 h-3 w-3" /> cache hit</Badge>}
          {build.parallel && <Badge tone="violet"><Cpu className="mr-1 h-3 w-3" /> paralelo</Badge>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <BuildConsole
            buildId={build.id}
            projectId={project.id}
            initialStatus={build.status}
            initialProgress={build.progress}
            insights={ins as BuildInsight[]}
          />
        </Card>

        {/* Artifacts */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileArchive className="h-4 w-4 text-indigo-500" />
            <h2 className="font-semibold">Artefatos</h2>
          </div>
          {arts.length === 0 ? (
            <p className="text-sm text-slate-400">
              {build.status === "success" ? "Nenhum artefato gerado." : "Artefatos aparecerão aqui após um build bem-sucedido."}
            </p>
          ) : (
            <div className="space-y-3">
              {arts.map((a) => (
                <div key={a.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10">
                      <FileArchive className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs font-medium">{a.name}</p>
                      <p className="text-[11px] text-slate-400">{formatBytes(a.sizeBytes)}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {a.realData ? (
                        <Badge tone="emerald"><ShieldCheck className="mr-1 h-3 w-3" /> APK real</Badge>
                      ) : (
                        <Badge tone="amber">demo</Badge>
                      )}
                      {a.signed && <Badge tone="sky">assinado</Badge>}
                    </div>
                    <a href={`/api/artifacts/${a.id}/download`}>
                      <Button size="sm" variant="outline"><Download className="h-3.5 w-3.5" /> Baixar</Button>
                    </a>
                  </div>
                </div>
              ))}
              {arts.some((a) => a.realData) ? (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] leading-relaxed text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      <b>APK real compilado no worker</b> — binário nativo instalável.
                      {arts.some((a) => a.signed) && " Assinado com sua keystore de release."}
                    </span>
                  </div>
                  {arts.some((a) => a.signed) && (
                    <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                      <summary className="cursor-pointer font-medium text-slate-700 dark:text-slate-200">📤 Como publicar na Google Play Store</summary>
                      <ol className="mt-2 list-decimal space-y-1 pl-4">
                        <li>Crie uma conta de desenvolvedor em <b>play.google.com/console</b> (taxa única de US$25).</li>
                        <li>Em &ldquo;Criar app&rdquo;, preencha nome, idioma e categoria.</li>
                        <li>Vá em <b>Produção → Criar versão</b> e envie este APK assinado (ou gere um AAB).</li>
                        <li>Preencha a ficha da loja (ícone, screenshots, descrição, política de privacidade).</li>
                        <li>Responda o questionário de classificação e envie para revisão.</li>
                      </ol>
                      <p className="mt-2 text-amber-600 dark:text-amber-400">
                        ⚠️ <b>Guarde o keystore</b> (em <code className="font-mono">~/.buildforge/release.keystore</code>). A Play Store
                        exige a MESMA chave em todas as atualizações. Se perder, não consegue mais atualizar o app.
                      </p>
                    </details>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Pacote de <b>demonstração</b> (build simulado na plataforma): estrutura de APK válida, mas
                    <b> não instalável</b>. Para um APK real, conecte um <b>worker</b> (com JDK + Android SDK) e
                    rode um <b>build REAL</b>.
                  </span>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
