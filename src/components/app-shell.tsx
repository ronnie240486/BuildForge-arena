"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "@/lib/theme";
import { avatarGradient, initials, cn, timeAgo } from "@/lib/utils";
import { logoutAction } from "@/lib/auth-actions";
import {
  LayoutDashboard,
  FolderGit2,
  Hammer,
  Wrench,
  Sparkles,
  Webhook,
  Server,
  GraduationCap,
  Settings,
  Sun,
  Moon,
  Bell,
  LogOut,
  Menu,
  X,
  Layers,
  Search,
  LayoutTemplate,
  Archive,
  ShieldCheck,
  Rocket,
  Users,
  CalendarClock,
  BarChart3,
  LifeBuoy,
  FileArchive,
} from "lucide-react";

const nav = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/app/tutorial", label: "Como usar", icon: GraduationCap, adminOnly: false },
  { href: "/app/create", label: "Criar com IA", icon: Sparkles, adminOnly: false },
  { href: "/app/templates", label: "Templates", icon: LayoutTemplate, adminOnly: false },
  { href: "/app/projects", label: "Projetos", icon: FolderGit2, adminOnly: false },
  { href: "/app/builds", label: "Builds", icon: Hammer, adminOnly: false },
  { href: "/app/schedules", label: "Agendamentos", icon: CalendarClock, adminOnly: false },
  { href: "/app/artifacts", label: "Artefatos", icon: FileArchive, adminOnly: false },
  { href: "/app/releases", label: "Releases", icon: Rocket, adminOnly: false },
  { href: "/app/workers", label: "Workers", icon: Server, adminOnly: false },
  { href: "/app/ai", label: "IA Assistant", icon: Sparkles, adminOnly: false },
  { href: "/app/organizations", label: "Organizações", icon: Users, adminOnly: false },
  { href: "/app/reports", label: "Relatórios", icon: BarChart3, adminOnly: false },
  { href: "/app/support", label: "Suporte", icon: LifeBuoy, adminOnly: false },
  // Recursos administrativos — só o dono/admin vê:
  { href: "/app/toolchain", label: "Instalador", icon: Wrench, adminOnly: true },
  { href: "/app/webhooks", label: "Webhooks", icon: Webhook, adminOnly: true },
  { href: "/app/backups", label: "Backups", icon: Archive, adminOnly: true },
  { href: "/app/admin", label: "Administração", icon: ShieldCheck, adminOnly: true },
  { href: "/app/settings", label: "Configurações", icon: Settings, adminOnly: false },
];

export type ShellNotif = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export function AppShell({
  children,
  user,
  notifications,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; role: string; avatarColor: string };
  notifications: ShellNotif[];
}) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <Link href="/app" className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-600/30">
          <Layers className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-semibold tracking-tight">BuildForge</span>
      </Link>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {nav.filter((item) => !item.adminOnly || user.role === "admin").map((item) => {
          const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60",
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white", avatarGradient(user.avatarColor))}>
            {initials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-slate-800/60">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900/50">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 text-slate-400">
              <X className="h-5 w-5" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-xl sm:px-6 dark:border-slate-800 dark:bg-slate-950/80">
          <button onClick={() => setMobileOpen(true)} className="text-slate-500 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative hidden flex-1 max-w-md sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Buscar projetos, builds…"
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900"
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={toggle}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Alternar tema"
            >
              {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <Bell className="h-[18px] w-[18px]" />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-800">
                      Notificações {unread > 0 && <span className="text-slate-400">· {unread} nova(s)</span>}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-slate-400">Nenhuma notificação ainda.</p>
                      ) : (
                        notifications.slice(0, 8).map((n) => (
                          <div key={n.id} className={cn("flex gap-3 border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-800/60", !n.read && "bg-indigo-50/50 dark:bg-indigo-500/5")}>
                            <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-slate-300 dark:bg-slate-700" : "bg-indigo-500")} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{n.title}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
                              <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(n.createdAt)}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className={cn("ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white", avatarGradient(user.avatarColor))}>
              {initials(user.name)}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
