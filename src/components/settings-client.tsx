"use client";

import { useTransition, useState } from "react";
import { useTheme } from "@/lib/theme";
import { Card, Button, Badge } from "@/components/ui";
import { setUserRole, setUserBuildLimit, resetUserBuilds } from "@/lib/platform-actions";
import { avatarGradient, initials, cn } from "@/lib/utils";
import { Sun, Moon, Loader2, Crown, User as UserIcon, RotateCcw, Check } from "lucide-react";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarColor: string;
  createdAt: string;
  buildLimit: number;
  buildsUsed: number;
};

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Card className="p-5">
      <h2 className="font-semibold">Aparência</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Escolha o tema da interface.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => theme !== "light" && toggle()}
          className={cn(
            "flex items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors",
            theme === "light" ? "border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10" : "border-slate-200 text-slate-500 dark:border-slate-700",
          )}
        >
          <Sun className="h-4 w-4" /> Claro
        </button>
        <button
          onClick={() => theme !== "dark" && toggle()}
          className={cn(
            "flex items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors",
            theme === "dark" ? "border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10" : "border-slate-200 text-slate-500 dark:border-slate-700",
          )}
        >
          <Moon className="h-4 w-4" /> Escuro
        </button>
      </div>
    </Card>
  );
}

export function UserAdmin({ users, currentUserId }: { users: AdminUser[]; currentUserId: string }) {
  return (
    <Card>
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h2 className="font-semibold">Usuários</h2>
        <p className="text-xs text-slate-400">Gerencie papéis da equipe.</p>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {users.map((u) => (
          <UserRow key={u.id} user={u} isSelf={u.id === currentUserId} />
        ))}
      </div>
    </Card>
  );
}

function UserRow({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const [pending, start] = useTransition();
  const [limitInput, setLimitInput] = useState(String(user.buildLimit));
  const nextRole = user.role === "admin" ? "member" : "admin";
  const isAdmin = user.role === "admin";
  const unlimited = user.buildLimit === -1;

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white", avatarGradient(user.avatarColor))}>
        {initials(user.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {user.name} {isSelf && <span className="text-xs text-slate-400">(você)</span>}
        </p>
        <p className="truncate text-xs text-slate-400">{user.email}</p>
        {!isAdmin && (
          <p className="mt-0.5 text-[11px] text-slate-400">
            Builds: <b className={user.buildsUsed >= user.buildLimit && !unlimited ? "text-rose-500" : "text-emerald-500"}>{user.buildsUsed}</b>
            {" / "}{unlimited ? "∞" : user.buildLimit}
          </p>
        )}
      </div>

      <Badge tone={isAdmin ? "violet" : "default"}>
        {isAdmin ? <Crown className="mr-1 h-3 w-3" /> : <UserIcon className="mr-1 h-3 w-3" />}
        {user.role}
      </Badge>

      {/* Cota de builds (só para membros) */}
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
        </div>
      )}

      <Button
        size="sm"
        variant="outline"
        disabled={pending || isSelf}
        onClick={() => start(async () => { await setUserRole(user.id, nextRole as "admin" | "member"); })}
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : `Tornar ${nextRole}`}
      </Button>
    </div>
  );
}
