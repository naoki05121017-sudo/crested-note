"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-8">
      <p className="text-[11px] tracking-[0.22em] text-accent-strong uppercase">
        ERROR
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">
        表示できませんでした
      </h1>
      <p className="text-sm leading-7 text-muted">
        画面の読み込みで問題が起きました。もう一度試すか、個体一覧へ戻ってください。
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="nc-btn" onClick={() => reset()}>
          再試行
        </button>
        <Link href="/animals" className="nc-btn-ghost">
          個体一覧へ
        </Link>
      </div>
    </div>
  );
}
