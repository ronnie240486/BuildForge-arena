import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { projects, builds, artifacts, signingConfigs, buildWorkers, aiInsights } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq, desc, sql, and } from "drizzle-orm";
import { Card, Badge, FrameworkIcon, Button, Progress } from "@/components/ui";
import { BuildLauncher } from "@/components/build-launcher";
import { ProjectFixButton, RebuildButton } from "@/components/project-fix-button";
import { AppIdentity } from "@/components/app-identity";

import type { ProjectDetection } from "@/db/schema";
import { timeAgo, formatDuration } from "@/lib/utils";
import { deleteProject } from "@/lib/project-actions";
import {
  GitBranch,
  Package,
  Trash2,
  Sparkles,
  FileCode2,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  ShieldCheck,
  Hammer,
  ExternalLink,
} from "lucide-react";

export const dynamic = "force-dynamic";

const statusTone = (s: string) =>
  s === "success" ? "emerald" : s === "failed" ? "rose" : s === "running" || s === "queued" ? "amber" : "default";

const sevTone = (s: string) => (s === "error" ? "rose" : s === "warning" ? "amber" : "sky");
const sevIcon = (s: string) => (s === "error" ? AlertTriangle : s === "warning" ? AlertTriangle : Lightbulb);

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project || project.ownerId !== me.id) notFound();

  const detection = (project.detection as ProjectDetection | null) ?? null;

  // Real AI insights come from the latest build's actual log analysis.
  const [lastBuild] = await db
    .select()
    .from(builds)
    .where(eq(builds.projectId, id))
    .orderBy(desc(builds.createdAt))
    .limit(1);

  const realInsights = lastBuild
    ? await db.select().from(aiInsights).where(eq(aiInsights.buildId, lastBuild.id)).orderBy(desc(aiInsights.createdAt))
    : [];

  // A analise da IA mostra APENAS insights de builds REAIS (do log de verdade).
  // Nada de insights ficticios/demo antes de um build acontecer.
  const usingReal = true;
  const insights = realInsights.map((i) => ({
    severity: i.severity,
    title: i.title,
    errorCode: i.errorCode ?? "",
    explanation: i.explanation,
    suggestion: i.suggestion,
    autoFixable: i.autoFixable,
  }));
  const blocking = insights.filter((i) => i.severity === "error");
  const hasBuilt = Boolean(lastBuild);

  const projBuilds = await db
    .select({
      build: builds,
      artifactCount: sql<number>`(select count(*)::int from ${artifacts} where ${artifacts.buildId} = ${builds.id})`,
    })
    .from(builds)
    .where(eq(builds.projectId, id))
    .orderBy(desc(builds.createdAt))
    .limit(8);

  const [sig] = await db.select().from(signingConfigs).where(eq(signingConfigs.projectId, id)).limit(1);

  const onlineWorkers = await db
    .select({ id: buildWorkers.id })
    .from(buildWorkers)
    .where(and(eq(buildWorkers.ownerId, me.id), eq(buildWorkers.online, true)));
  const hasWorker = onlineWorkers.length > 0;

  const SrcIcon = project.source === "zip" ? Package : GitBranch;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl dark:bg-slate-800">
            <FrameworkIcon fw={project.framework} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
              <Badge tone={project.status === "ready" ? "emerald" : project.status === "needs_setup" || project.status === "failed" ? "amber" : "violet"} dot>
                {project.status.replace("_", " ")}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span className="capitalize">{project.framework} · {project.language}</span>
              <span className="inline-flex items-center gap-1"><SrcIcon className="h-3.5 w-3.5" /> {project.source}</span>
              {project.repoUrl && (
                <a href={project.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-500 hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> {project.repoUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              )}
            </div>
          </div>
        </div>
        <form action={deleteProject.bind(null, project.id)}>
          <Button type="submit" variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10">
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
        </form>
      </div>

      {blocking.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                A BuildForge AI detectou {blocking.length} bloqueio(s) que impedem o build
              </p>
              <p className="mt-0.5 text-amber-700/80 dark:text-amber-200/70">
                Dispare um build — a IA explicará cada erro e poderá aplicar correções automáticas.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: detection + builds */}
        <div className="space-y-6 lg:col-span-2">
          {/* AI insights */}
          <Card>
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <h2 className="font-semibold">Análise da IA</h2>
              <Badge tone="indigo" className="ml-auto">{insights.length} insight(s)</Badge>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {insights.length === 0 ? (
                <div className="flex items-center gap-3 px-5 py-6">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {hasBuilt
                      ? "Nenhum problema detectado no último build."
                      : "Ainda não há análise. Dispare um build real — a IA analisará o log e mostrará aqui qualquer erro encontrado."}
                  </p>
                </div>
              ) : (
                insights.map((i, idx) => {
                  const SevIcon = sevIcon(i.severity);
                  return (
                    <div key={idx} className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <SevIcon className={`mt-0.5 h-4 w-4 shrink-0 ${i.severity === "error" ? "text-rose-500" : i.severity === "warning" ? "text-amber-500" : "text-sky-500"}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold">{i.title}</p>
                            <Badge tone={sevTone(i.severity)}>{i.severity}</Badge>
                            {i.autoFixable && <Badge tone="violet"><Sparkles className="mr-1 h-3 w-3" /> auto-corrigível</Badge>}
                          </div>
                          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{i.explanation}</p>
                          <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                            <span className="font-medium text-slate-500">Correção sugerida: </span>
                            {i.suggestion}
                          </div>
                          <div className="mt-3">
                            {usingReal ? (
                              <RebuildButton projectId={project.id} framework={project.framework} />
                            ) : i.autoFixable ? (
                              <ProjectFixButton projectId={project.id} code={i.errorCode} />
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Detection details */}
          {detection && (
            <div className="grid gap-6 sm:grid-cols-2">
              <Card className="p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <FileCode2 className="h-4 w-4 text-slate-400" /> Arquivos detectados
                </div>
                <ul className="space-y-1.5 text-sm">
                  {(detection.files ?? []).map((f) => (
                    <li key={f.path} className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-xs text-slate-600 dark:text-slate-300">{f.path}</span>
                      <span className="shrink-0 text-[11px] text-slate-400">{f.role}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Boxes className="h-4 w-4 text-slate-400" /> Dependências
                </div>
                <ul className="space-y-1.5 text-sm">
                  {(detection.dependencies ?? []).map((d) => (
                    <li key={d.name} className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-xs text-slate-600 dark:text-slate-300">{d.name}</span>
                      <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800">{d.version}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}

          {/* Build history */}
          <Card>
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <Hammer className="h-4 w-4 text-indigo-500" />
              <h2 className="font-semibold">Histórico de builds</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {projBuilds.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-400">Nenhum build disparado ainda.</p>
              ) : (
                projBuilds.map(({ build, artifactCount }) => (
                  <Link key={build.id} href={`/app/builds/${build.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{build.target.toUpperCase()} · {build.variant}</p>
                      <p className="text-xs text-slate-400">{timeAgo(build.createdAt)} · {formatDuration(build.durationMs)}{build.cacheHit ? " · cache" : ""}</p>
                    </div>
                    {artifactCount > 0 && <Badge tone="sky">{artifactCount} artefato(s)</Badge>}
                    <Badge tone={statusTone(build.status)} dot>{build.status}</Badge>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right: launcher + meta */}
        <div className="space-y-6">
          <AppIdentity projectId={project.id} currentName={project.appName || project.name} currentIcon={project.iconData} />

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Compilar</h2>
              <Badge tone="indigo"><Sparkles className="mr-1 h-3 w-3" /> AI build</Badge>
            </div>
            <BuildLauncher projectId={project.id} framework={project.framework} hasWorker={hasWorker} hasRepo={Boolean(project.repoUrl)} />
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                <h2 className="font-semibold">Assinatura</h2>
              </div>
              <Badge tone="emerald" dot>automática</Badge>
            </div>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <p>
                ✅ <b>Assinatura automática ativa.</b> Em builds <b>release</b> reais, o worker gera um keystore
                (RSA 2048, validade ~27 anos) na primeira vez e <b>reutiliza a mesma chave</b> nas próximas.
              </p>
              <p className="text-xs text-slate-400">
                O keystore fica salvo no worker em <code className="font-mono">~/.buildforge/release.keystore</code>.
                Guarde-o com segurança — a Play Store exige a mesma chave em todas as atualizações.
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-semibold">Metadados</h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-slate-400">Build system</dt><dd className="text-right">{detection?.buildSystem ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Package</dt><dd className="truncate font-mono text-xs">{project.packageName}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">minSdk</dt><dd>{project.minSdk}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">targetSdk</dt><dd>{project.targetSdk}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Versão</dt><dd>{project.versionName}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Importado</dt><dd>{timeAgo(project.createdAt)}</dd></div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
