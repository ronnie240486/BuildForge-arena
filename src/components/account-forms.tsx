"use client";

import { useActionState } from "react";
import { Card, Button } from "@/components/ui";
import { createUserByAdmin, changeMyPassword, saveGithubToken } from "@/lib/platform-actions";
import { UserPlus, KeyRound, Loader2, CheckCircle2, Github } from "lucide-react";

const input =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserByAdmin, null);
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-indigo-500" />
        <h2 className="font-semibold">Criar novo usuário</h2>
      </div>
      <p className="mb-3 text-xs text-slate-400">
        O cadastro público está fechado. Só administradores criam contas aqui.
      </p>
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <input name="name" placeholder="Nome" className={input} />
        <input name="email" type="email" placeholder="email@exemplo.com" className={input} />
        <input name="password" type="text" placeholder="Senha (mín. 6)" className={input} />
        <select name="role" className={input} defaultValue="member">
          <option value="member">Membro</option>
          <option value="admin">Administrador</option>
        </select>
        <div className="sm:col-span-2 flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Criar conta
          </Button>
          {state?.error && <span className="text-sm text-rose-500">{state.error}</span>}
          {state?.ok && <span className="inline-flex items-center gap-1 text-sm text-emerald-500"><CheckCircle2 className="h-4 w-4" /> Criado!</span>}
        </div>
      </form>
    </Card>
  );
}

export function GithubIntegrationForm({ hasToken, githubUser }: { hasToken: boolean; githubUser: string | null }) {
  const [state, action, pending] = useActionState(saveGithubToken, null);
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Github className="h-4 w-4 text-indigo-500" />
        <h2 className="font-semibold">Integração com GitHub</h2>
      </div>
      <p className="mb-3 text-xs text-slate-400">
        Guarde um Personal Access Token para clonar repositórios <b>privados</b>. Escopo mínimo: acesso de leitura ao conteúdo do repositório.
        {hasToken && <span className="ml-1 text-emerald-500">Token configurado{githubUser ? ` (@${githubUser})` : ""}.</span>}
      </p>
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <input name="githubUser" placeholder="seu-usuario-github (opcional)" defaultValue={githubUser ?? ""} className={input} />
        <input name="githubToken" type="password" placeholder={hasToken ? "•••••••••••• (deixe em branco para manter)" : "ghp_... ou github_pat_..."} className={input} />
        <div className="sm:col-span-2 flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />} Salvar
          </Button>
          {state?.error && <span className="text-sm text-rose-500">{state.error}</span>}
          {state?.ok && <span className="inline-flex items-center gap-1 text-sm text-emerald-500"><CheckCircle2 className="h-4 w-4" /> Salvo!</span>}
        </div>
      </form>
      <p className="mt-3 text-[11px] text-slate-400">
        Gere um token em github.com/settings/personal-access-tokens/new, com acesso restrito ao(s) repositório(s) que você vai importar aqui.
      </p>
    </Card>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changeMyPassword, null);
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-indigo-500" />
        <h2 className="font-semibold">Trocar minha senha</h2>
      </div>
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <input name="current" type="password" placeholder="Senha atual" className={input} />
        <input name="next" type="password" placeholder="Nova senha (mín. 6)" className={input} />
        <div className="sm:col-span-2 flex items-center gap-3">
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Atualizar senha
          </Button>
          {state?.error && <span className="text-sm text-rose-500">{state.error}</span>}
          {state?.ok && <span className="inline-flex items-center gap-1 text-sm text-emerald-500"><CheckCircle2 className="h-4 w-4" /> Senha alterada!</span>}
        </div>
      </form>
    </Card>
  );
}
