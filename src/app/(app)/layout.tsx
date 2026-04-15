import { requireSession } from "@/lib/server/session";
import { AppShellClient } from "@/components/layout/app-shell-client";

import { logoutAction } from "../(auth)/login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <AppShellClient username={session.username} logoutAction={logoutAction}>
      {children}
    </AppShellClient>
  );
}
