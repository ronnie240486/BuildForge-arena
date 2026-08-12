import { db } from "@/db";
import { toolchain } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { Card, Badge, Button } from "@/components/ui";
import { ToolchainControls, VerifyButton } from "@/components/toolchain-client";
import { CheckCircle2, Cpu, Terminal, Wrench, RefreshCw } from "lucide-react";

export const dynamic = "force-dynamic";

function detectOs() {
  const p = process.platform;
  const arch = process.arch;
  if (p === "linux") return { os: "Linux", icon: "🐧", arch };
  if (p === "darwin") return { os: "macOS", icon: "🍎", arch };
  if (p.startsWith("win")) return { os: "Windows", icon: "🪟", arch };
  return { os: p, icon: "💻", arch };
}

export default async function ToolchainPage() {
  await requireAdmin();
  const tools = await db.select().from(toolchain).orderBy(toolchain.required);
  const os = detectOs();
  const requiredCount = tools.filter((t) => t.required).length;
  const installedRequired = tools.filter((t) => t.required && t.state === "installed").length;
  const allGood = installedRequired === requiredCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Instalador & Ambiente</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Detecção de SO, instalação de toolchain e variáveis de ambiente.
          </p>
        </div>
        <VerifyButton />
      </div>

      {/* Host card */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm text-slate-400"><Cpu className="h-4 w-4" /> Sistema operacional</div>
          <p className="mt-2 text-lg font-semibold">{os.os}</p>
          <p className="text-xs text-slate-400">{os.icon} · arquitetura {os.arch}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm text-slate-400"><Wrench className="h-4 w-4" /> Ferramentas obrigatórias</div>
          <p className="mt-2 text-lg font-semibold">{installedRequired}/{requiredCount} instaladas</p>
          <p className="text-xs text-slate-400">{allGood ? "Ambiente completo" : "Pendências detectadas"}</p>
        </Card>
        <Card className={`p-5 ${allGood ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10" : "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"}`}>
          <div className="flex items-center gap-2 text-sm text-slate-400"><CheckCircle2 className="h-4 w-4" /> Status geral</div>
          <p className={`mt-2 text-lg font-semibold ${allGood ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
            {allGood ? "Pronto para compilar" : "Requer atenção"}
          </p>
          <p className="text-xs text-slate-400">{allGood ? "Todas as dependências resolvidas" : "Instale os componentes pendentes"}</p>
        </Card>
      </div>

      {/* Tools */}
      <Card>
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold">Catálogo de ferramentas</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {tools.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg dark:bg-slate-800">
                {t.tool === "jdk" ? "☕" : t.tool === "flutter" ? "🐦" : t.tool === "node" ? "⬢" : t.tool === "android-sdk" ? "🤖" : t.tool === "gradle" ? "🐘" : "🔧"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{t.label}</p>
                  {t.version && <Badge tone="default">{t.version}</Badge>}
                  {!t.required && <Badge tone="sky">opcional</Badge>}
                </div>
                {t.env && Object.keys(t.env).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {Object.entries(t.env).map(([k, v]) => (
                      <code key={k} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800">
                        {k}=<span className="text-slate-700 dark:text-slate-300">{v}</span>
                      </code>
                    ))}
                  </div>
                )}
              </div>
              <ToolchainControls tool={t.tool} state={t.state} />
            </div>
          ))}
        </div>
      </Card>

      {/* Env block */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <Terminal className="h-4 w-4 text-indigo-500" />
          <h2 className="font-semibold">Variáveis de ambiente consolidadas</h2>
          <Button variant="ghost" size="sm" className="ml-auto"><RefreshCw className="h-3.5 w-3.5" /> Reaplicar</Button>
        </div>
        <pre className="overflow-x-auto bg-slate-950 p-5 font-mono text-[12.5px] leading-relaxed text-slate-300">
{`# /etc/profile.d/buildforge.sh — gerado automaticamente
${tools
  .filter((t) => t.env)
  .flatMap((t) => Object.entries(t.env!).map(([k, v]) => `export ${k}="${v}"`))
  .join("\n")}

# PATH consolidado
export PATH="/opt/flutter/bin:/usr/local/node/bin:$PATH"`}
        </pre>
      </Card>
    </div>
  );
}
