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
import WorkersPage from "@/pages/Workers";

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
