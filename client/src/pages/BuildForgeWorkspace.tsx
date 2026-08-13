import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import AdminPage from "@/pages/Admin";
import AiAssistantPage from "@/pages/AiAssistant";
import ArtifactsPage from "@/pages/Artifacts";
import BackupsPage from "@/pages/Backups";
import BuildsPage from "@/pages/Builds";
import DashboardPage from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";
import ProjectsPage from "@/pages/Projects";
import ReleasesPage from "@/pages/Releases";
import TemplatesPage from "@/pages/Templates";
import SettingsPage from "@/pages/Settings";
import StudioPage from "@/pages/Studio";
import ToolchainPage from "@/pages/Toolchain";
import TutorialPage from "@/pages/Tutorial";
import WorkersPage from "@/pages/Workers";
import WebhooksPage from "@/pages/Webhooks";
import FmdPage from "@/pages/Fmd";
import { useAuth } from "@/_core/hooks/useAuth";
import { canAccessWorkspacePath } from "@/lib/workspace-access";

const pages: Record<string, React.ComponentType> = {
  "/": DashboardPage,
  "/projects": ProjectsPage,
  "/builds": BuildsPage,
  "/workers": WorkersPage,
  "/artifacts": ArtifactsPage,
  "/backups": BackupsPage,
  "/assistant": AiAssistantPage,
  "/templates": TemplatesPage,
  "/releases": ReleasesPage,
  "/settings": SettingsPage,
  "/studio": StudioPage,
  "/toolchain": ToolchainPage,
  "/tutorial": TutorialPage,
  "/webhooks": WebhooksPage,
  "/fmd": FmdPage,
  "/admin": AdminPage,
};

export default function BuildForgeWorkspace() {
  const [location] = useLocation();
  const { user } = useAuth();
  const Page = pages[location];

  if (!Page) return <NotFound />;

  const isBlocked = Boolean(user && !canAccessWorkspacePath(user, location));

  return (
    <DashboardLayout>
      {isBlocked ? <div className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"><h1 className="text-xl font-semibold">Ferramenta não liberada</h1><p className="mt-2 text-sm leading-6">Esta área não foi incluída pelo administrador da sua conta. Solicite a liberação da ferramenta necessária.</p></div> : <Page />}
    </DashboardLayout>
  );
}
