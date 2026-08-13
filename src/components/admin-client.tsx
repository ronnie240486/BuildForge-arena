"use client";

import { useTransition, useState } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { setUserRole, setUserBuildLimit, resetUserBuilds } from "@/lib/platform-actions";
import { deleteUser } from "@/lib/admin-actions";
import { RotateCcw, Trash2, Hammer, FolderGit2, Crown, User as UserIcon, Check, Loader2 } from "lucide-react";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  buildLimit: number;
  buildsUsed: number;
  projectCount: number;
  buildCount: number;
  createdAt: string;
  isMe: boolean;
};

export function AdminClient({ users }: { users: AdminUserRow[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h2 className="font-semibold">Usuários ({users.length})</h2>
        <p className="text-xs text-slate-400">Papéis e limites de build também podem ser ajustados em Configurações — aqui você tem a visão de auditoria e exclusão de conta.</p>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {users.map((u) => (
          <AdminUserRowItem key={u.id} user={u} />
        ))}
      </div>
    </Card>
  );
}

function AdminUserRowItem({ user }: { user: AdminUserRow }) {
  const [pending, start] = useTransition();
  const [limitInput, setLimitInput] = useState(String(user.buildLimit));
  const [deleted, setDeleted] = useState(false);
  const nextRole = user.role === "admin" ? "member" : "admin";
  const isAdmin = user.role === "admin";
  const unlimited = user.buildLimit === -1;

  if (deleted) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {user.name} {user.isMe && <span className="text-xs text-slate-400">(você)</span>}
        </p>
        <p className="truncate text-xs text-slate-400">{user.email}</p>
      </div>

      <Badge tone={isAdmin ? "violet" : "default"}>
        {isAdmin ? <Crown className="mr-1 h-3 w-3" /> : <UserIcon className="mr-1 h-3 w-3" />}
        {user.role}
      </Badge>

      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1" title="Projetos"><FolderGit2 className="h-3.5 w-3.5" />{user.projectCount}</span>
        <span className="flex items-center gap-1" title="Builds"><Hammer className="h-3.5 w-3.5" />{user.buildCount}</span>
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={limitInput}
            onChange={(e) => setLimitInput(e.target.value)}
            className="h-8 w-16 rounded-lg border border-slate-300 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900"
            title="Nº de builds grátis (-1 = ilimitado)"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => start(async () => { await setUserBuildLimit(user.id, parseInt(limitInput || "0", 10)); })}
            title="Salvar limite"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => start(async () => { await resetUserBuilds(user.id); })}
            title="Zerar contador de builds usados"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[11px] text-slate-400">{user.buildsUsed}/{unlimited ? "∞" : user.buildLimit} usados</span>
        </div>
      )}

      <Button
        size="sm"
        variant="outline"
        disabled={pending || user.isMe}
        onClick={() => start(async () => { await setUserRole(user.id, nextRole); })}
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : `Tornar ${nextRole}`}
      </Button>

      {!user.isMe && (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Excluir ${user.name}? Essa ação não pode ser desfeita.`)) return;
            start(async () => {
              const res = await deleteUser(user.id);
              if (res && "ok" in res && res.ok) setDeleted(true);
            });
          }}
          title="Excluir usuário"
        >
          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
        </Button>
      )}
    </div>
  );
}
