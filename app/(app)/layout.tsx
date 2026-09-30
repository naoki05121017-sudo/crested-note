import { Suspense } from "react";
import { AppShell } from "@/app/components/app-shell";
import { PageSkeleton } from "@/app/components/page-skeleton";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseAuthCookie } from "@/lib/auth/supabase-auth-cookie";
import { cookies } from "next/headers";

function BootMain() {
  return <PageSkeleton />;
}

async function AppWithSession({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  if (!hasSupabaseAuthCookie(cookieStore.getAll())) {
    return (
      <AppShell email={null}>
        <Suspense fallback={<BootMain />}>{children}</Suspense>
      </AppShell>
    );
  }
  const user = await getSessionUser();
  return (
    <AppShell email={user?.email ?? null}>
      <Suspense fallback={<BootMain />}>{children}</Suspense>
    </AppShell>
  );
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
