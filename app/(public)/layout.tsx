import { AppShell } from "@/app/components/app-shell";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <AppShell email={null}>{children}</AppShell>;
}
