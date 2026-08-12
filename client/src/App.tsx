import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import BuildForgeWorkspace from "@/pages/BuildForgeWorkspace";
import LandingPage from "@/pages/Landing";
import ClientAccessPage from "@/pages/ClientAccess";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

function EntryRouter() {
  const [location] = useLocation();
  const { user, loading } = useAuth();
  if (location === "/login") return <ClientAccessPage mode="login" />;
  if (location === "/register") return <ClientAccessPage mode="register" />;
  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-950"><div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" /></div>;
  if (!user) return <LandingPage />;
  return <BuildForgeWorkspace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <EntryRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
