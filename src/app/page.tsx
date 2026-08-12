import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LandingHeader } from "@/components/landing-header";
import {
  GitBranch,
  Boxes,
  Cpu,
  Sparkles,
  ShieldCheck,
  Layers,
  Bell,
  Container,
  Webhook,
  Workflow,
  ArrowRight,
  Terminal,
} from "lucide-react";

export const dynamic = "force-dynamic";

const features = [
  { icon: GitBranch, title: "Importa por GitHub, ZIP ou clone", desc: "Cola a URL do repositório e a IA detecta a stack automaticamente." },
  { icon: Cpu, title: "Engine de build multi-framework", desc: "Android (Java/Kotlin), Flutter e React Native — APK, AAB e EXE." },
  { icon: Sparkles, title: "IA que explica e corrige erros", desc: "Detecta falhas de compilação, explica a causa e aplica correções simples." },
  { icon: ShieldCheck, title: "Assinatura automática de APK", desc: "Gera keystore e assina builds de release para publicação." },
  { icon: Container, title: "Isolamento com Docker", desc: "Builds em paralelo, em containers isolados, com cache de dependências." },
  { icon: Webhook, title: "Webhooks & API REST", desc: "Integre com seu pipeline CI/CD através de webhooks e uma API completa." },
];

const phases = [
  "Núcleo & autenticação",
  "Gerenciador de projetos",
  "Instalador automático",
  "Engine de build",
  "Inteligência (IA)",
  "Recursos avançados",
  "Interface moderna",
  "Distribuição",
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/app");

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <LandingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="absolute -top-40 left-1/2 h-96 w-[44rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-500/30 via-violet-500/20 to-transparent blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              Android Studio simplificado, com IA integrada
            </div>
            <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Cole o repositório.
              <br />
              <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
                Receba o APK assinado.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-slate-600 dark:text-slate-400">
              A BuildForge analisa o código, instala dependências, corrige erros simples,
              compila, assina e entrega o artefato. Tudo automatizado, com explicação em tempo real.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-base font-medium text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500"
              >
                Entrar na plataforma <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-300 px-6 text-base font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Terminal className="h-4 w-4" /> Ver como funciona
              </a>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Peça acesso para começar seu teste grátis.
            </p>
          </div>

          {/* Terminal preview */}
          <div className="mx-auto mt-16 max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <span className="h-3 w-3 rounded-full bg-rose-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="ml-2 font-mono text-xs text-slate-400">buildforge — live build</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
{`$ buildforge import https://github.com/acme/payments-app
✓ Detected framework: Android (Kotlin) · Gradle 8.7
✓ Resolved 42 dependencies · 1 issue found

> ./gradlew :app:assembleRelease
✦ BuildForge AI: Material3 missing → patched build.gradle.kts
> Task :app:signRelease SUCCESS
BUILD SUCCESSFUL in 47s

📦 app-release.apk (28.4 MB) · signed ✔`}
            </pre>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Tudo que um builder precisa — e mais</h2>
          <p className="mt-4 text-slate-600 dark:text-slate-400">
            Da detecção do framework à assinatura do APK, em uma plataforma só.
          </p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/50"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white dark:bg-indigo-500/10 dark:text-indigo-400">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-slate-200 bg-slate-50 py-20 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Workflow className="h-3.5 w-3.5" /> Fluxo automatizado
            </div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Do código ao APK em 6 passos</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3 lg:grid-cols-6">
            {[
              { n: 1, t: "Importa", d: "GitHub, ZIP ou clone" },
              { n: 2, t: "Analisa", d: "Detecta stack & gaps" },
              { n: 3, t: "Instala", d: "Dependências & SDK" },
              { n: 4, t: "Corrige", d: "IA aplica fixes" },
              { n: 5, t: "Compila", d: "APK, AAB, EXE" },
              { n: 6, t: "Entrega", d: "Assinado e pronto" },
            ].map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
                  {s.n}
                </div>
                <p className="mt-3 font-semibold">{s.t}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Phases roadmap */}
      <section id="phases" className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Um plano em 8 fases</h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              Construída fase a fase, do núcleo de autenticação à distribuição multiplataforma.
              Cada bloco é uma funcionalidade entregue e funcional.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {phases.map((p, i) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  <Boxes className="h-3.5 w-3.5 text-indigo-500" /> Fase {i + 1} · {p}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-8 dark:border-slate-800 dark:from-indigo-500/10 dark:to-violet-500/10">
            <Bell className="h-8 w-8 text-indigo-500" />
            <p className="mt-4 text-xl font-medium">
              &ldquo;Não é só um builder. É um Android Studio simplificado, com IA que pensa contigo.&rdquo;
            </p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Migração assistida entre tecnologias (ex.: React Native → Kotlin) com relatório do que é conversível automaticamente e do que exige intervenção humana — no roadmap.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-8 py-14 text-center shadow-2xl shadow-indigo-600/30">
          <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Pronto para forjar seu próximo build?</h2>
          <p className="mx-auto mt-3 max-w-xl text-indigo-100">
            Crie sua conta e importe seu primeiro repositório em menos de um minuto.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-indigo-600 hover:bg-indigo-50"
          >
            Entrar <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-500" /> BuildForge
          </div>
          <p>Plataforma de build de apps com IA · {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
