import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { PageSkeleton } from "@/app/components/page-skeleton";
import { getOwnStoredDisplayName, getSessionUser } from "@/lib/auth/session";
import { hasSupabaseAuthCookie } from "@/lib/auth/supabase-auth-cookie";
import { cookies } from "next/headers";

function BootMain() {
  return <PageSkeleton />;
}

async function AppWithSession({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  if (!hasSupabaseAuthCookie(cookieStore.getAll())) {
    return <AppShell email={null}>{children}</AppShell>;
  }
  const user = await getSessionUser();
  if (user && !(await getOwnStoredDisplayName(user.id))) {
    redirect("/nickname");
  }
  return <AppShell email={user?.email ?? null}>{children}</AppShell>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <AppShell sessionPending>
          <BootMain />
        </AppShell>
      }
    >
      <AppWithSession>{children}</AppWithSession>
    </Suspense>
  );
}
