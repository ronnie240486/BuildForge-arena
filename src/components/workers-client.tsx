"use client";

import { useActionState, useTransition, useState } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { registerWorker, deleteWorker } from "@/lib/platform-actions";
import { timeAgo } from "@/lib/utils";
import { Plus, Loader2, Server, Trash2, Copy, Check, Terminal, Download } from "lucide-react";

export type WorkerItem = {
  id: string;
  name: string;
  token: string;
  os: string | null;
  online: boolean;
  buildsRun: number;
  lastSeen: string | null;
};

export function WorkersClient({ workers, appUrl }: { workers: WorkerItem[]; appUrl: string }) {
  const [state, action, pending] = useActionState(registerWorker, null);
  const primaryToken = workers[0]?.token;

  return (
    <div className="space-y-6">
      {/* One-click installer — the easiest path */}
      <Card className="overflow-hidden border-emerald-200 dark:border-emerald-500/30">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-5 text-white">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h2 className="text-lg font-semibold">Instalador de 1 clique (recomendado)</h2>
          </div>
          <p className="mt-1 text-sm text-emerald-50">
            {primaryToken
              ? "Baixe, dê duplo-clique e pronto — ele verifica tudo e conecta sozinho. Sem digitar comandos."
              : "Primeiro registre um worker abaixo (para gerar seu token), depois baixe o instalador aqui."}
          </p>
          {primaryToken && (
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="/api/worker/installer?os=windows">
                <Button size="sm" variant="secondary"><Download className="h-3.5 w-3.5" /> Windows (.bat)</Button>
              </a>
              <a href="/api/worker/installer?os=mac">
                <Button size="sm" variant="secondary"><Download className="h-3.5 w-3.5" /> macOS (.command)</Button>
              </a>
              <a href="/api/worker/installer?os=linux">
                <Button size="sm" variant="secondary"><Download className="h-3.5 w-3.5" /> Linux (.sh)</Button>
              </a>
            </div>
          )}
        </div>
        {primaryToken && (
          <div className="space-y-1.5 p-4 text-xs text-slate-500 dark:text-slate-400">
            <p><b>Windows:</b> baixe, dê <b>duplo-clique</b> em <code className="font-mono">BuildForge-Worker.bat</code>. Se faltar Node.js, ele abre o site pra você instalar.</p>
            <p><b>Mac:</b> abra o Terminal, arraste o arquivo <code className="font-mono">.command</code> pra dentro e dê Enter (ou duplo-clique).</p>
            <p>Deixe a janela aberta. Dispare um build <b>Real</b> no projeto e ele compila aí no seu PC.</p>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-indigo-500" />
          <h2 className="font-semibold">Registrar novo worker</h2>
        </div>
        <form action={action} className="flex flex-wrap gap-3">
          <input
            name="name"
            placeholder="ex.: macbook-casa, ci-runner-1"
            className="h-10 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
          />
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Gerar token
          </Button>
        </form>
        {state?.error && <p className="mt-2 text-sm text-rose-600">{state.error}</p>}
        <p className="mt-2 text-xs text-slate-400">
          Um token é gerado para autenticar a máquina que roda a compilação real (com JDK + Android SDK).
        </p>
      </Card>

      <Card>
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold">Workers conectados</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {workers.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">Nenhum worker registrado ainda.</p>
          ) : (
            workers.map((w) => <WorkerRow key={w.id} worker={w} />)
          )}
        </div>
      </Card>

      <SetupGuide appUrl={appUrl} token={workers[0]?.token} />
    </div>
  );
}

function WorkerRow({ worker }: { worker: WorkerItem }) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800">
        <Server className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{worker.name}</p>
          <Badge tone={worker.online ? "emerald" : "default"} dot>{worker.online ? "online" : "offline"}</Badge>
        </div>
        <p className="text-xs text-slate-400">
          {worker.os || "SO desconhecido"} · {worker.buildsRun} build(s) · visto {timeAgo(worker.lastSeen)}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <code className="truncate rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800">
            {worker.token.slice(0, 12)}…{worker.token.slice(-4)}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(worker.token);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="text-slate-400 hover:text-indigo-500"
            title="Copiar token completo"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      <a href={`/api/worker/installer?os=windows&token=${encodeURIComponent(worker.token)}`}>
        <Button size="sm" variant="outline"><Download className="h-3.5 w-3.5" /> Instalador</Button>
      </a>
      <Button
        size="sm"
        variant="ghost"
        className="text-rose-500"
        disabled={pending}
        onClick={() => start(async () => { await deleteWorker(worker.id); })}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function SetupGuide({ appUrl, token }: { appUrl: string; token?: string }) {
  const [tab, setTab] = useState<"github" | "local" | "docker">("github");
  const [copied, setCopied] = useState(false);
  const t = token || "SEU_TOKEN_AQUI";

  const localCmd = `# Você tem Android Studio? Então já tem SDK + JDK. Instale só o Node.js.
# 1) Baixe o agente:
curl -fsSL ${appUrl}/api/worker/script -o buildforge-worker.js

# 2a) Buildar um projeto do GitHub (clona sozinho):
node buildforge-worker.js --server ${appUrl} --token ${t}

# 2b) OU buildar a pasta que você já tem aberta no PC (sem git):
node buildforge-worker.js --server ${appUrl} --token ${t} \\
  --project "/caminho/do/seu/projeto"`;

  const dockerCmd = `# Container com a toolchain Android já instalada
docker run --rm -it \\
  -e BUILDFORGE_SERVER=${appUrl} \\
  -e BUILDFORGE_TOKEN=${t} \\
  ghcr.io/cirruslabs/android-sdk:34 \\
  bash -c "apt-get update && apt-get install -y nodejs curl && \\
           curl -fsSL ${appUrl}/api/worker/script -o w.js && \\
           node w.js --server $BUILDFORGE_SERVER --token $BUILDFORGE_TOKEN"`;

  const current = tab === "local" ? localCmd : dockerCmd;

  const tabs = [
    { id: "github" as const, label: "GitHub Actions (grátis)" },
    { id: "local" as const, label: "Máquina local" },
    { id: "docker" as const, label: "Docker" },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <Terminal className="h-4 w-4 text-indigo-500" />
        <h2 className="font-semibold">Como conectar um worker real</h2>
      </div>

      <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs dark:border-sky-500/30 dark:bg-sky-500/10">
        <span className="text-base">🩺</span>
        <div className="text-sky-900/90 dark:text-sky-200/90">
          <p className="font-semibold">Tem Android Studio no PC? Você já tem quase tudo.</p>
          <p className="mt-0.5">
            O Android Studio traz o SDK e um JDK. Falta só o <b>Node.js</b>. Rode o diagnóstico para confirmar o que tem e o que falta:
          </p>
          <div className="mt-2">
            <a href="/api/worker/doctor" className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-2.5 py-1 font-medium text-white hover:bg-sky-500">
              <Download className="h-3 w-3" /> Baixar diagnóstico (buildforge-doctor.js)
            </a>
          </div>
          <p className="mt-1.5 text-[11px] text-sky-700/70 dark:text-sky-300/70">
            Depois rode: <code className="font-mono">node buildforge-doctor.js</code>
          </p>
        </div>
      </div>

      <div className="border-b border-slate-100 px-5 pt-4 dark:border-slate-800/60">
        <div className="flex flex-wrap gap-2">
          {tabs.map((x) => (
            <button
              key={x.id}
              onClick={() => setTab(x.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === x.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 p-5 text-sm text-slate-600 dark:text-slate-300">
        {tab === "github" ? (
          <>
            <p className="font-medium text-emerald-600 dark:text-emerald-400">📱 Funciona 100% pelo celular — sem PC, sem terminal</p>
            <p className="text-xs">
              O GitHub compila para você na nuvem. Faça isto uma vez (dá pra fazer tudo pelo navegador do celular):
            </p>
            <ol className="list-decimal space-y-1.5 pl-5 text-xs">
              <li>Tenha o seu app num repositório no <b>GitHub</b> (pode criar pelo celular no site github.com).</li>
              <li>Baixe o arquivo do workflow no botão abaixo (ou copie o conteúdo).</li>
              <li>No GitHub, crie o arquivo <code className="font-mono">.github/workflows/buildforge-worker.yml</code> e cole o conteúdo.</li>
              <li>Em <b>Settings → Secrets and variables → Actions → New secret</b>, crie <code className="font-mono">BUILDFORGE_TOKEN</code> com o token deste worker.</li>
              <li>Em <b>Actions → BuildForge Worker → Run workflow</b>. Pronto! Ele compila na nuvem.</li>
            </ol>
            <div className="flex flex-wrap gap-2">
              <a href={`/api/worker/github-workflow?token=${encodeURIComponent(t)}`}>
                <Button size="sm"><Download className="h-3.5 w-3.5" /> Baixar workflow (.yml)</Button>
              </a>
            </div>
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              ✅ O computador do GitHub já tem JDK + Android SDK + Flutter. Você não instala nada e não usa terminal —
              tudo é feito pelo navegador. Depois é só disparar builds e baixar o APK <b>daqui, do celular</b>.
            </div>
          </>
        ) : (
          <>
            <p>Rode este comando numa {tab === "docker" ? "máquina com Docker" : "máquina com a toolchain Android"}:</p>
            <div className="relative">
              <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 pr-12 font-mono text-[12px] text-slate-300">{current}</pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(current);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
                title="Copiar"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              O worker reivindica builds reais, roda <code className="font-mono">git clone</code> +{" "}
              <code className="font-mono">./gradlew assembleRelease</code> (ou <code className="font-mono">flutter build apk</code>),
              e envia o APK de volta — instalável.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
