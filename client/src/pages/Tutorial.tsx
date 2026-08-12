import { Bot, Download, FolderGit2, PackageCheck, Wrench } from "lucide-react";

const steps = [
  [FolderGit2, "1. Importe um projeto", "Use URL do GitHub, Git, ZIP ou crie a partir de um template e confirme a stack detectada."],
  [Wrench, "2. Conecte um worker", "Em Workers, gere o token e use o instalador automático ou o workflow do GitHub Actions."],
  [PackageCheck, "3. Inicie uma release", "Escolha APK ou AAB, configure versão, ativos e keystore quando a publicação exigir assinatura."],
  [Bot, "4. Corrija com IA", "Se o build falhar, revise o diagnóstico, aprove o patch e reenvie a execução com rastreabilidade."],
  [Download, "5. Baixe e publique", "Acesse Artefatos para gerar um link temporário do APK/AAB e mantenha o histórico no projeto."],
] as const;

export default function TutorialPage() {
  return <div className="mx-auto max-w-4xl space-y-6 pb-8"><header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Guia restaurado</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Tutorial BuildForge</h1><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">O fluxo completo, desde o código-fonte até o artefato assinado, preserva a experiência guiada do projeto original.</p></header><section className="space-y-3">{steps.map(([Icon, title, text]) => <article key={title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"><Icon className="h-5 w-5" /></span><div><h2 className="font-semibold text-slate-950 dark:text-white">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{text}</p></div></article>)}</section></div>;
}
