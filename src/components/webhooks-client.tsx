"use client";

import { useActionState, useTransition, useState } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { addWebhook, deleteWebhook, toggleWebhook } from "@/lib/platform-actions";
import { Plus, Trash2, Webhook, Loader2, Power, Link2 } from "lucide-react";

export type WebhookItem = {
  id: string;
  url: string;
  label: string | null;
  events: string[];
  active: boolean;
};

export function WebhooksClient({ webhooks }: { webhooks: WebhookItem[] }) {
  const [state, action, pending] = useActionState(addWebhook, null);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-indigo-500" />
          <h2 className="font-semibold">Novo webhook</h2>
        </div>
        <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            name="url"
            placeholder="https://seu-servidor.com/hooks/buildforge"
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
          />
          <input
            name="label"
            placeholder="Rótulo (ex.: Slack CI)"
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
          />
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Adicionar
          </Button>
        </form>
        {state?.error && <p className="mt-2 text-sm text-rose-600">{state.error}</p>}
        <p className="mt-2 text-xs text-slate-400">Eventos padrão: build.success, build.failed. Separe por vírgula no campo abaixo se desejar customizar.</p>
      </Card>

      <Card>
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold">Endpoints configurados</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {webhooks.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">Nenhum webhook configurado.</p>
          ) : (
            webhooks.map((w) => <WebhookRow key={w.id} webhook={w} />)
          )}
        </div>
      </Card>
    </div>
  );
}

function WebhookRow({ webhook }: { webhook: WebhookItem }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800">
        <Webhook className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{webhook.label || webhook.url}</p>
          <Badge tone={webhook.active ? "emerald" : "default"} dot>{webhook.active ? "ativo" : "pausado"}</Badge>
        </div>
        <p className="flex items-center gap-1 truncate font-mono text-xs text-slate-400"><Link2 className="h-3 w-3" />{webhook.url}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {webhook.events.map((e) => (
            <code key={e} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800">{e}</code>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => start(async () => { await toggleWebhook(webhook.id, webhook.active); })}
        >
          <Power className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          className="text-rose-500"
          onClick={() => start(async () => { await deleteWebhook(webhook.id); })}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
