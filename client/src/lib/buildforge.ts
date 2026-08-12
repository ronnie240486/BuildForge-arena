export const buildStatusLabels = {
  queued: "Na fila",
  running: "Em execução",
  succeeded: "Concluído",
  failed: "Falhou",
  cancelled: "Cancelado",
} as const;

export const buildStatusClasses = {
  queued: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  running: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  succeeded: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  failed: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  cancelled: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
} as const;

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function frameworkLabel(value: string) {
  return {
    android: "Android",
    flutter: "Flutter",
    react_native: "React Native",
    webview: "WebView",
    unknown: "A identificar",
  }[value] ?? value;
}
