import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-8">
      <p className="text-[11px] tracking-[0.22em] text-accent-strong uppercase">
        NOT FOUND
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">
        ページが見つかりません
      </h1>
      <p className="text-sm leading-7 text-muted">
        指定された個体・ペア・ページは存在しないか、削除された可能性があります。
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href="/animals" className="nc-btn">
          個体一覧へ
        </Link>
        <Link href="/" className="nc-btn-ghost">
          ホームへ
        </Link>
      </div>
    </div>
  );
}
