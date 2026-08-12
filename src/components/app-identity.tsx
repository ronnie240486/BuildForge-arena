"use client";

import { useState, useTransition, useRef } from "react";
import { saveAppIdentity } from "@/lib/project-actions";
import { Card, Button } from "@/components/ui";
import { ImagePlus, Loader2, CheckCircle2, Smartphone } from "lucide-react";

export function AppIdentity({
  projectId,
  currentName,
  currentIcon,
}: {
  projectId: string;
  currentName: string;
  currentIcon: string | null;
}) {
  const [name, setName] = useState(currentName);
  const [icon, setIcon] = useState<string | null>(currentIcon);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onFile(file: File) {
    if (file.size > 2_000_000) { setErr("Ícone muito grande (máx 2MB)."); return; }
    setErr(null);
    const reader = new FileReader();
    reader.onload = () => setIcon(String(reader.result));
    reader.readAsDataURL(file);
  }

  function save() {
    setErr(null);
    setSaved(false);
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("appName", name);
    if (icon) fd.set("iconData", icon);
    start(async () => {
      const res = await saveAppIdentity(null, fd);
      if (res?.error) setErr(res.error);
      else setSaved(true);
    });
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-indigo-500" />
        <h2 className="font-semibold">Identidade do app (ícone e nome)</h2>
      </div>

      <div className="flex items-start gap-4">
        {/* Ícone */}
        <div className="shrink-0 text-center">
          <button
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800"
          >
            {icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={icon} alt="ícone" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-7 w-7 text-slate-400" />
            )}
          </button>
          <p className="mt-1 text-[10px] text-slate-400">PNG 512×512</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </div>

        {/* Nome */}
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Nome do aplicativo
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome que aparece no celular"
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            É o nome que aparece embaixo do ícone e na Play Store.
          </p>

          <div className="mt-3 flex items-center gap-3">
            <Button onClick={save} size="sm" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Salvar
            </Button>
            {saved && <span className="inline-flex items-center gap-1 text-sm text-emerald-500"><CheckCircle2 className="h-4 w-4" /> Salvo!</span>}
            {err && <span className="text-sm text-rose-500">{err}</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}
