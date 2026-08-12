import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { Card, Badge, Button } from "@/components/ui";
import { ThemeToggle, UserAdmin, type AdminUser } from "@/components/settings-client";
import { CreateUserForm, ChangePasswordForm } from "@/components/account-forms";
import { AiSettings } from "@/components/ai-settings";
import { aiSettings } from "@/db/schema";
import { avatarGradient, initials, cn, timeAgo } from "@/lib/utils";
import { Download, Monitor, Apple, RefreshCw, ShieldCheck, Database, Package, MonitorSmartphone } from "lucide-react";

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
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Perfil, equipe, distribuição e backup.</p>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <ThemeToggle />

        {/* Distribution (Phase 8) */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <MonitorSmartphone className="h-4 w-4 text-indigo-500" />
            <h2 className="font-semibold">Distribuição</h2>
          </div>
          <div className="space-y-3">
            <InstallerCard icon={<Monitor className="h-4 w-4" />} os="Windows" file="BuildForge-Setup.exe" note="Instalador NSIS com atualizador automático" />
            <InstallerCard icon={<Apple className="h-4 w-4" />} os="Linux" file="BuildForge.AppImage" note="AppImage + .deb para Debian/Ubuntu" />
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium">Atualizador automático</p>
                  <p className="text-[11px] text-slate-400">Verifica novas versões ao iniciar</p>
                </div>
              </div>
              <Badge tone="emerald" dot>ativo</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* IA — Claude / GPT / Gemini (admin) */}
      {me.role === "admin" && <AiSettings current={aiCurrent} />}

      {/* Segurança da conta */}
      <ChangePasswordForm />

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

function InstallerCard({ icon, os, file, note }: { icon: React.ReactNode; os: string; file: string; note: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{icon}</div>
        <div>
          <p className="text-sm font-medium">{os}</p>
          <p className="font-mono text-[11px] text-slate-400">{file}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-[11px] text-slate-400 sm:block">{note}</span>
        <Button size="sm" variant="ghost"><Package className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}
