"use client";

import { useActionState, useState, useTransition } from "react";
import { Card, Button, Badge } from "@/components/ui";
import { saveAiSettings, testAiConnection } from "@/lib/platform-actions";
import { Sparkles, Loader2, CheckCircle2, XCircle, KeyRound } from "lucide-react";

const input =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900";

const PROVIDERS = [
  { id: "anthropic", label: "Claude (Anthropic)", placeholder: "sk-ant-...", model: "claude-3-5-sonnet-20241022", url: "console.anthropic.com" },
  { id: "openai", label: "GPT (OpenAI)", placeholder: "sk-...", model: "gpt-4o-mini", url: "platform.openai.com" },
  { id: "google", label: "Gemini (Google)", placeholder: "AIza...", model: "gemini-1.5-flash", url: "aistudio.google.com" },
];

export function AiSettings({
  current,
}: {
  current: { provider: string; hasKey: boolean; model: string | null; enabled: boolean } | null;
}) {
  const [state, action, pending] = useActionState(saveAiSettings, null);
  const [provider, setProvider] = useState(current?.provider || "anthropic");
  const [testing, startTest] = useTransition();
  const [testResult, setTestResult] = useState<null | boolean>(null);
  const p = PROVIDERS.find((x) => x.id === provider) || PROVIDERS[0];

  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <h2 className="font-semibold">Inteligência Artificial (Claude / GPT / Gemini)</h2>
        {current?.enabled && current?.hasKey ? (
          <Badge tone="emerald" className="ml-auto">ativa</Badge>
        ) : (
          <Badge tone="amber" className="ml-auto">usando modo básico</Badge>
        )}
      </div>
      <p className="mb-4 text-xs text-slate-400">
        Conecte uma IA real para análises e correções muito mais inteligentes. Sem chave, a plataforma usa o
        analisador básico (padrões). A chave fica salva no servidor e nunca é exposta ao navegador.
      </p>

      <form action={action} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Provedor</label>
            <select name="provider" value={provider} onChange={(e) => setProvider(e.target.value)} className={input}>
              {PROVIDERS.map((x) => (
                <option key={x.id} value={x.id}>{x.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Modelo (opcional)</label>
            <input name="model" placeholder={p.model} defaultValue={current?.model || ""} className={input} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            <KeyRound className="mr-1 inline h-3 w-3" /> Chave de API
            {current?.hasKey && <span className="ml-2 text-emerald-500">(chave já salva — deixe em branco para manter)</span>}
          </label>
          <input name="apiKey" type="password" placeholder={p.placeholder} className={input} />
          <p className="mt-1 text-[11px] text-slate-400">
            Pegue sua chave em <b>{p.url}</b>.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={current?.enabled ?? true} className="h-4 w-4" />
          Ativar IA nas análises de erro
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Salvar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={testing}
            onClick={() => startTest(async () => { const r = await testAiConnection(); setTestResult(r.ok); })}
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Testar conexão"}
          </Button>
          {testResult === true && <span className="inline-flex items-center gap-1 text-sm text-emerald-500"><CheckCircle2 className="h-4 w-4" /> Funcionando!</span>}
          {testResult === false && <span className="inline-flex items-center gap-1 text-sm text-rose-500"><XCircle className="h-4 w-4" /> Falhou (verifique a chave)</span>}
          {state?.ok && <span className="inline-flex items-center gap-1 text-sm text-emerald-500"><CheckCircle2 className="h-4 w-4" /> Salvo!</span>}
          {state?.error && <span className="text-sm text-rose-500">{state.error}</span>}
        </div>
      </form>
    </Card>
  );
}
