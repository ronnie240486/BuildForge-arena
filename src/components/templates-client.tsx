"use client";

import { useActionState, useState } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { createProjectFromTemplate } from "@/lib/template-actions";
import type { TemplateDef } from "@/lib/templates";
import { LayoutTemplate, Loader2, ArrowRight } from "lucide-react";

export function TemplatesClient({ templates }: { templates: TemplateDef[] }) {
  const [selected, setSelected] = useState<TemplateDef | null>(null);
  const [state, action, pending] = useActionState(createProjectFromTemplate, null);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <div key={t.id} onClick={() => setSelected(t)} className="cursor-pointer">
            <Card
              className={`p-5 transition-all ${
                selected?.id === t.id ? "border-indigo-500 ring-2 ring-indigo-500/20" : "hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10">
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <div className="mb-1 flex items-center gap-2">
                <h3 className="font-semibold">{t.label}</h3>
                <Badge tone="sky">{t.category}</Badge>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.description}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">{t.framework}</p>
            </Card>
          </div>
        ))}
      </div>

      {selected && (
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Criar projeto a partir de &quot;{selected.label}&quot;</h2>
          <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input type="hidden" name="templateId" value={selected.id} />
            <input
              name="name"
              placeholder={`${selected.label} App`}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
            />
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Criar projeto
            </Button>
          </form>
          {state && "error" in state && <p className="mt-2 text-sm text-rose-600">{state.error}</p>}
        </Card>
      )}
    </div>
  );
}
