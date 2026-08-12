"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import { Loader2, Layers } from "lucide-react";

export function AuthForm({
  action,
  mode,
}: {
  action: (prevState: unknown, formData: FormData) => Promise<{ error?: string } | void | never>;
  mode: "login" | "register";
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const isLogin = mode === "login";

  return (
    <form action={formAction} className="space-y-4">
      {!isLogin && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Nome</label>
          <input
            name="name"
            type="text"
            autoComplete="name"
            required
            placeholder="Ada Lovelace"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="seu@email.com"
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
        <input
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
          placeholder="••••••••"
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      {state?.error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {state.error}
        </div>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Entrando…
          </>
        ) : (
          <>
            <Layers className="h-4 w-4" /> {isLogin ? "Entrar no BuildForge" : "Criar conta"}
          </>
        )}
      </Button>
    </form>
  );
}
