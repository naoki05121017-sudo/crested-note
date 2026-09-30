"use client";

import Link from "next/link";
import { EmptyState } from "@/app/components/ui";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      title="表示できませんでした"
      body="画面の読み込みで問題が起きました。もう一度試すか、個体一覧へ戻ってください。"
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className="nc-btn" onClick={() => reset()}>
            再試行
          </button>
          <Link href="/animals" className="nc-btn-ghost">
            個体一覧へ
          </Link>
        </div>
      }
    />
  );
}
