"use client";

import { useActionState, useState } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { createTicket, replyTicket } from "@/lib/support-actions";
import { LifeBuoy, Plus, Loader2, MessageSquare } from "lucide-react";

export type TicketRow = {
  id: string;
  ownerName: string;
  subject: string;
  message: string;
  status: "open" | "answered" | "closed";
  reply: string | null;
  createdAt: string;
};

export function SupportClient({ tickets, isAdmin }: { tickets: TicketRow[]; isAdmin: boolean }) {
  const [state, action, pending] = useActionState(createTicket, null);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-indigo-500" />
          <h2 className="font-semibold">Abrir chamado</h2>
        </div>
        <form action={action} className="space-y-3">
          <input
            name="subject"
            placeholder="Assunto"
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
          />
          <textarea
            name="message"
            rows={4}
            placeholder="Descreva o problema ou dúvida…"
            className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
          />
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LifeBuoy className="h-4 w-4" />} Enviar
          </Button>
        </form>
        {state && "error" in state && <p className="mt-2 text-sm text-rose-600">{state.error}</p>}
      </Card>

      <Card>
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold">{isAdmin ? "Todos os chamados" : "Seus chamados"}</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {tickets.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">Nenhum chamado ainda.</p>
          ) : (
            tickets.map((t) => <TicketRowItem key={t.id} ticket={t} isAdmin={isAdmin} />)
          )}
        </div>
      </Card>
    </div>
  );
}

const statusTone = { open: "amber", answered: "sky", closed: "emerald" } as const;

function TicketRowItem({ ticket, isAdmin }: { ticket: TicketRow; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(replyTicket, null);

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <MessageSquare className="h-4 w-4 shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{ticket.subject}</p>
          <p className="text-xs text-slate-400">{isAdmin ? `${ticket.ownerName} · ` : ""}{new Date(ticket.createdAt).toLocaleString("pt-BR")}</p>
        </div>
        <Badge tone={statusTone[ticket.status]}>{ticket.status}</Badge>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
            {open ? "Fechar" : "Responder"}
          </Button>
        )}
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{ticket.message}</p>
      {ticket.reply && (
        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
          <span className="font-medium text-slate-500">Resposta: </span>{ticket.reply}
        </div>
      )}
      {isAdmin && open && (
        <form action={action} className="mt-3 space-y-2">
          <input type="hidden" name="id" value={ticket.id} />
          <textarea
            name="reply"
            rows={3}
            defaultValue={ticket.reply ?? ""}
            placeholder="Escreva a resposta…"
            className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
          />
          <div className="flex items-center gap-2">
            <select name="status" defaultValue="answered" className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900">
              <option value="answered">Respondido</option>
              <option value="closed">Fechado</option>
              <option value="open">Manter aberto</option>
            </select>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Enviar resposta"}
            </Button>
          </div>
          {state && "error" in state && <p className="text-xs text-rose-600">{state.error}</p>}
        </form>
      )}
    </div>
  );
}
