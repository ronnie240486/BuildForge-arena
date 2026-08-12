import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { registerAction } from "@/lib/auth-actions";
import { Layers, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  // Cadastro publico fechado -> manda para o login.
  if (process.env.ALLOW_PUBLIC_SIGNUP !== "true") redirect("/login");
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-slate-950 lg:block">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-gradient-to-br from-violet-600/40 to-indigo-600/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-center px-12 text-white">
          <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-indigo-200 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Comece em menos de 1 minuto
          </div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight">
            Um Android Studio simplificado, com IA que pensa contigo.
          </h2>
          <ul className="mt-8 space-y-3 text-slate-300">
            <li className="flex items-center gap-2"><span className="text-indigo-400">✓</span> Projetos ilimitados por GitHub, ZIP ou clone</li>
            <li className="flex items-center gap-2"><span className="text-indigo-400">✓</span> Builds APK, AAB e EXE multi-framework</li>
            <li className="flex items-center gap-2"><span className="text-indigo-400">✓</span> Detecção e correção de erros por IA</li>
            <li className="flex items-center gap-2"><span className="text-indigo-400">✓</span> Webhooks, API REST e cache de dependências</li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-10 inline-flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-600/30">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">BuildForge</span>
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight">Criar sua conta</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Importe seu primeiro repositório em segundos.
          </p>

          <div className="mt-8">
            <AuthForm action={registerAction} mode="register" />
          </div>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
