import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { EmptyState } from "@/app/components/ui";

export default function NotFound() {
  return (
    <AppShell email={null}>
      <EmptyState
        title="ページが見つかりません"
        body="指定された個体・ペア・ページは存在しないか、削除された可能性があります。"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/animals" className="nc-btn">
              個体一覧へ
            </Link>
            <Link href="/" className="nc-btn-ghost">
              ホームへ
            </Link>
          </div>
        }
      />
    </AppShell>
  );
}
