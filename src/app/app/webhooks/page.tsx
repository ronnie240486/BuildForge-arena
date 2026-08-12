import { db } from "@/db";
import { webhooks } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { Card, Badge } from "@/components/ui";
import { WebhooksClient, type WebhookItem } from "@/components/webhooks-client";
import { Webhook as WebhookIcon, Code2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  const me = await requireAdmin();
  const rows = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.ownerId, me.id))
    .orderBy(desc(webhooks.createdAt));

  const items: WebhookItem[] = rows.map((w) => ({
    id: w.id,
    url: w.url,
    label: w.label,
    events: (w.events as string[]) ?? [],
    active: w.active,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Webhooks & API</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Integre a BuildForge ao seu pipeline CI/CD com webhooks e uma API REST.
        </p>
      </div>

      <WebhooksClient webhooks={items} />

      {/* REST API docs */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <Code2 className="h-4 w-4 text-indigo-500" />
          <h2 className="font-semibold">API REST</h2>
          <Badge tone="emerald" className="ml-auto">v1</Badge>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge tone="emerald">GET</Badge>
              <code className="font-mono text-xs">/api/projects</code>
            </div>
            <p className="text-slate-500 dark:text-slate-400">Lista projetos da conta autenticada (via cookie de sessão).</p>
            <div className="flex items-center gap-2">
              <Badge tone="amber">POST</Badge>
              <code className="font-mono text-xs">/api/projects</code>
            </div>
            <p className="text-slate-500 dark:text-slate-400">Cria um projeto a partir de uma URL de repositório.</p>
            <div className="flex items-center gap-2">
              <Badge tone="sky">GET</Badge>
              <code className="font-mono text-xs">/api/builds/&#123;id&#125;/stream</code>
            </div>
            <p className="text-slate-500 dark:text-slate-400">Stream de logs em tempo real via Server-Sent Events.</p>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-[12px] leading-relaxed text-slate-300">
{`# Listar projetos
curl -b cookie.txt \\
  https://app/api/projects

# Webhook payload (build.success)
{
  "event": "build.success",
  "project": "payments-app",
  "target": "apk",
  "artifact": "app-release.apk",
  "duration_ms": 47000
}`}
          </pre>
        </div>
      </Card>
    </div>
  );
}
