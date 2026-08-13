import { requireUser } from "@/lib/auth";
import { TEMPLATES } from "@/lib/templates";
import { TemplatesClient } from "@/components/templates-client";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  await requireUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Comece rápido com um modelo pronto. Escolha o tipo de aplicativo e confirme o nome.
        </p>
      </div>
      <TemplatesClient templates={TEMPLATES} />
    </div>
  );
}
