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
  "/admin": AdminPage,
};

export default function BuildForgeWorkspace() {
  const [location] = useLocation();
  const Page = pages[location];

  if (!Page) return <NotFound />;

  return (
    <DashboardLayout>
      <Page />
    </DashboardLayout>
  );
}
