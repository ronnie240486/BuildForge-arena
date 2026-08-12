import { useAuth } from "@/_core/hooks/useAuth";
import { useIsMobile } from "@/hooks/useMobile";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ArchiveRestore,
  Bot,
  Boxes,
  ChevronRight,
  Cpu,
  HardDriveDownload,
  LayoutDashboard,
  LogOut,
  Moon,
  PanelLeft,
  Rocket,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  BookOpen,
  Settings2,
  Sun,
  UsersRound,
  Webhook,
  MonitorCog,
} from "lucide-react";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "./ui/sidebar";

const items = [
  { icon: LayoutDashboard, label: "Visão geral", path: "/" },
  { icon: Boxes, label: "Projetos", path: "/projects" },
  { icon: ChevronRight, label: "Fila de builds", path: "/builds" },
  { icon: Cpu, label: "Workers", path: "/workers" },
  { icon: HardDriveDownload, label: "Artefatos", path: "/artifacts" },
  { icon: ArchiveRestore, label: "Backups", path: "/backups" },
  { icon: Bot, label: "Assistente IA", path: "/assistant" },
  { icon: WandSparkles, label: "Studio IA", path: "/studio" },
  { icon: Sparkles, label: "Templates", path: "/templates" },
  { icon: Rocket, label: "Releases", path: "/releases" },
  { icon: Cpu, label: "Toolchain", path: "/toolchain" },
  { icon: MonitorCog, label: "FMD", path: "/fmd" },
  { icon: BookOpen, label: "Tutorial", path: "/tutorial" },
  { icon: Settings2, label: "Configurações", path: "/settings" },
  { icon: Webhook, label: "Webhooks", path: "/webhooks" },
  { icon: UsersRound, label: "Administração", path: "/admin", adminOnly: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-950"><div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-300 border-t-transparent" /></div>;
  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-2xl shadow-indigo-900/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 text-white"><Boxes className="h-6 w-6" /></div>
          <h1 className="mt-6 text-2xl font-semibold">Acesse a BuildForge</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Entre para criar projetos, acompanhar builds e administrar seus artefatos com segurança.</p>
          <Button onClick={() => window.location.href = "/login"} className="mt-7 h-11 w-full bg-indigo-600 hover:bg-indigo-500">Entrar ou criar conta</Button>
        </section>
      </main>
    );
  }
  return <SidebarProvider><Shell user={user}>{children}</Shell></SidebarProvider>;
}

function Shell({ children, user }: { children: React.ReactNode; user: { name?: string | null; email?: string | null; role?: string } }) {
  const [location, setLocation] = useLocation();
  const { toggleSidebar, state } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const isMobile = useIsMobile();
  const visibleItems = items.filter((item) => !item.adminOnly || user.role === "admin");
  const pageName = visibleItems.find((item) => item.path === location)?.label ?? "BuildForge";

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <SidebarHeader className="px-3 py-4">
          <button onClick={() => setLocation("/")} className="flex w-full items-center gap-3 rounded-xl px-2 text-left">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30"><Boxes className="h-5 w-5" /></span>
            {state !== "collapsed" && <span className="min-w-0"><span className="block truncate text-sm font-bold tracking-tight text-slate-950 dark:text-white">BuildForge</span><span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">Mobile CI/CD</span></span>}
          </button>
        </SidebarHeader>
        <SidebarContent className="px-2 pt-2">
          <SidebarMenu>
            {visibleItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton isActive={location === item.path} tooltip={item.label} onClick={() => setLocation(item.path)} className="h-10 rounded-xl">
                  <item.icon className="h-4 w-4" /><span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="border-t border-slate-100 p-3 dark:border-slate-800">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-xl p-1 text-left hover:bg-slate-100 dark:hover:bg-slate-900">
                <Avatar className="h-8 w-8"><AvatarFallback className="bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">{user.name?.slice(0, 1).toUpperCase() ?? "U"}</AvatarFallback></Avatar>
                {state !== "collapsed" && <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-900 dark:text-white">{user.name ?? "Membro"}</span><span className="block truncate text-[11px] text-slate-500">{user.role === "admin" ? "Administrador" : "Membro"}</span></span>}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={toggleTheme}><>{theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}</>{theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}</DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="text-rose-600 focus:text-rose-600"><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-slate-50/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
          <div className="flex items-center gap-3"><SidebarTrigger className="rounded-xl" /><div><p className="text-sm font-semibold text-slate-950 dark:text-white">{pageName}</p><p className="text-xs text-slate-500">Build e entrega de aplicativos móveis</p></div></div>
          <div className="flex items-center gap-2"><button onClick={toggleTheme} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}>{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>{user.role === "admin" && <span className="hidden items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex dark:text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" />Admin</span>}</div>
        </header>
        {isMobile && <button onClick={toggleSidebar} className="sr-only">Abrir menu</button>}
        <main className="p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
