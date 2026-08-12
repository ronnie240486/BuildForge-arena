import { db } from "@/db";
import { buildWorkers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getAppUrl } from "@/lib/app-url";
import { eq, desc } from "drizzle-orm";
import { WorkersClient, type WorkerItem } from "@/components/workers-client";
import { Card } from "@/components/ui";
import { Cpu } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WorkersPage() {
  const me = await requireUser();

  // Mark stale workers (no heartbeat in 60s) as offline for display.
  const rows = await db
    .select()
    .from(buildWorkers)
    .where(eq(buildWorkers.ownerId, me.id))
    .orderBy(desc(buildWorkers.createdAt));

  const now = new Date().getTime();
  const items: WorkerItem[] = rows.map((w) => ({
    id: w.id,
    name: w.name,
    token: w.token,
    os: w.os,
    online: w.online && w.lastSeen ? now - w.lastSeen.getTime() < 60_000 : false,
    buildsRun: w.buildsRun,
    lastSeen: w.lastSeen ? w.lastSeen.toISOString() : null,
  }));

  const appUrl = await getAppUrl();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Build Workers</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Conecte máquinas com a toolchain Android real para gerar APKs instaláveis.
        </p>
      </div>

      <Card className="flex items-start gap-3 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <span className="mt-0.5 text-xl">📱</span>
        <div className="text-sm text-emerald-900/90 dark:text-emerald-200/90">
          <p className="font-semibold">Sem PC? Use pelo celular com um worker na nuvem!</p>
          <p className="mt-0.5">
            Compilar APK exige Android SDK, que não roda no celular. Mas você <b>não precisa</b> de um PC:
            use o <b>worker no GitHub Actions</b> (nuvem, grátis). Você registra pelo celular, cola um arquivo no
            seu GitHub uma vez, e todos os builds rodam na nuvem — você acompanha e baixa o APK <b>tudo pelo celular</b>.
            Veja a aba <b>&ldquo;GitHub Actions&rdquo;</b> abaixo.
          </p>
        </div>
      </Card>

      <Card className="flex items-start gap-3 border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/10">
        <Cpu className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
        <div className="text-sm text-indigo-900/90 dark:text-indigo-200/90">
          <p className="font-semibold">O que é um worker?</p>
          <p className="mt-0.5">
            É o agente que compila o APK de verdade (com Android SDK + JDK). Ele pode rodar em 3 lugares:
            <b> na nuvem (GitHub Actions — ideal para celular)</b>, no seu PC, ou num servidor/Docker.
          </p>
        </div>
      </Card>

      <WorkersClient workers={items} appUrl={appUrl} />
    </div>
  );
}
