import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { Card, Badge, Button } from "@/components/ui";
import { ThemeToggle, UserAdmin, type AdminUser } from "@/components/settings-client";
import { CreateUserForm, ChangePasswordForm, GithubIntegrationForm } from "@/components/account-forms";
import { AiSettings } from "@/components/ai-settings";
import { aiSettings } from "@/db/schema";
import { avatarGradient, initials, cn, timeAgo } from "@/lib/utils";
import { Download, ShieldCheck, Database } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await requireUser();
  const allUsers = me.role === "admin" ? await db.select().from(users).orderBy(users.createdAt) : [];

  let aiCurrent: { provider: string; hasKey: boolean; model: string | null; enabled: boolean } | null = null;
  if (me.role === "admin") {
    const [row] = await db.select().from(aiSettings).limit(1);
    if (row) aiCurrent = { provider: row.provider, hasKey: Boolean(row.apiKey), model: row.model, enabled: row.enabled };
  }

  const adminUsers: AdminUser[] = allUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatarColor: u.avatarColor,
    createdAt: u.createdAt.toISOString(),
    buildLimit: u.buildLimit,
    buildsUsed: u.buildsUsed,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Perfil, equipe e backup.</p>
      </div>

      {/* Profile */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-semibold text-white", avatarGradient(me.avatarColor))}>
            {initials(me.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">{me.name}</h2>
              <Badge tone={me.role === "admin" ? "violet" : "default"}>{me.role}</Badge>
            </div>
            <p className="text-sm text-slate-400">{me.email}</p>
            {me.githubUser && <p className="text-xs text-slate-400">GitHub: @{me.githubUser}</p>}
            <p className="mt-0.5 text-xs text-slate-400">Membro desde {timeAgo(me.createdAt)}</p>
          </div>
        </div>
      </Card>

      <ThemeToggle />

      {/* IA — Claude / GPT / Gemini (admin) */}
      {me.role === "admin" && <AiSettings current={aiCurrent} />}

      {/* Segurança da conta */}
      <ChangePasswordForm />

      {/* Integração GitHub — token para clonar repositórios privados */}
      <GithubIntegrationForm hasToken={Boolean(me.githubToken)} githubUser={me.githubUser} />

      {/* User management (admin) */}
      {me.role === "admin" ? (
        <>
          <CreateUserForm />
          <UserAdmin users={adminUsers} currentUserId={me.id} />
        </>
      ) : (
        <Card className="p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            O gerenciamento de usuários está disponível apenas para administradores.
          </p>
        </Card>
      )}

      {/* Backup (Phase 8) — admin only */}
      {me.role === "admin" && (
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Database className="h-4 w-4 text-indigo-500" />
            <h2 className="font-semibold">Backup & restauração</h2>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Exportar configurações</p>
              <p className="text-xs text-slate-400">Baixe um snapshot JSON de projetos, toolchain e integrações.</p>
            </div>
            <a href="/api/backup">
              <Button><Download className="h-4 w-4" /> Exportar backup</Button>
            </a>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            Backups automáticos diários estão ativos. As senhas e keystores nunca são incluídos no export.
          </div>
        </Card>
      )}

      {/* Código-fonte (admin) */}
      {me.role === "admin" && (
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Database className="h-4 w-4 text-indigo-500" />
            <h2 className="font-semibold">Código-fonte do projeto</h2>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Baixar código-fonte completo (.zip)</p>
              <p className="text-xs text-slate-400">
                Frontend + backend (Next.js). Sem node_modules/.env — rode <code className="font-mono">npm install</code> após extrair.
              </p>
            </div>
            <a href="/download/buildforge-source.zip" download>
              <Button><Download className="h-4 w-4" /> Baixar código-fonte</Button>
            </a>
          </div>
        </Card>
      )}
    </div>
  );
}
