import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { AppShell, type ShellNotif } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const notifs = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(12);

  return (
    <AppShell
      user={{ name: user.name, email: user.email, role: user.role, avatarColor: user.avatarColor }}
      notifications={notifs.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }))}
    >
      {children}
    </AppShell>
  );
}
