import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { loginAction } from "@/lib/auth-actions";
import { getCurrentUser } from "@/lib/auth";
import { Layers, GitBranch, Sparkles, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Se já estiver logado, vai direto pro app (evita loop de login).
  const user = await getCurrentUser();
  if (user) redirect("/app");
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-10 inline-flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-600/30">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">BuildForge</span>
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight">Bem-vindo de volta</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Entre para gerenciar e compilar seus projetos.
          </p>

          <div className="mt-8">
            <AuthForm action={loginAction} mode="login" />
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Acesso restrito. Contas são criadas por um administrador.
          </p>
        </div>
      </div>

      {/* Visual side */}
      <div className="relative hidden overflow-hidden bg-slate-950 lg:block">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute -right-40 top-0 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-600/40 to-violet-600/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-center px-12 text-white">
          <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-indigo-200 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Plataforma com IA integrada
          </div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight">
            Do repositório ao APK assinado — automaticamente.
          </h2>
          <div className="mt-8 space-y-4">
            {[
              { icon: GitBranch, t: "Importa por GitHub", d: "Detecção automática de stack" },
              { icon: Sparkles, t: "IA corrige erros", d: "Explica e aplica correções simples" },
              { icon: ShieldCheck, t: "Assina builds", d: "Keystore e release prontos" },
            ].map((f) => (
              <div key={f.t} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{f.t}</p>
                  <p className="text-sm text-slate-400">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
