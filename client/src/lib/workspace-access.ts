export type WorkspaceAccessUser = {
  role?: string | null;
  allowedTools?: string[] | null;
};

export const workspaceToolByPath: Record<string, string> = {
  "/": "dashboard",
  "/projects": "projects",
  "/builds": "builds",
  "/notifications": "builds",
  "/artifacts": "artifacts",
  "/releases": "releases",
  "/workers": "__admin__",
  "/monitoring": "__admin__",
  "/backups": "__admin__",
  "/assistant": "__admin__",
  "/templates": "__admin__",
  "/settings": "__admin__",
  "/studio": "__admin__",
  "/toolchain": "__admin__",
  "/tutorial": "__admin__",
  "/webhooks": "__admin__",
  "/fmd": "__admin__",
  "/admin": "__admin__",
  "/reports": "__admin__",
  "/support": "support",
  "/organizations": "__admin__",
  "/schedules": "__admin__",
};

export function canAccessWorkspacePath(user: WorkspaceAccessUser | null | undefined, path: string) {
  if (user?.role === "admin") return true;
  const requiredTool = workspaceToolByPath[path];
  return Boolean(requiredTool && Array.isArray(user?.allowedTools) && user.allowedTools.includes(requiredTool));
}
