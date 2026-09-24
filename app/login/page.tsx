import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { Card, PageHeader } from "@/app/components/ui";
import { signIn } from "@/app/auth/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "ログイン" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";
  const check = params.check === "1";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="ACCOUNT"
        title="ログイン"
        description="自分の個体だけが見えます。他の人の個体は表示されません。"
      />
      <Card className="max-w-md">
        {check ? (
          <p className="mb-4 text-sm text-muted">
            確認メールが届いている場合は、承認してからログインしてください。
          </p>
        ) : null}
        <MutationForm action={signIn} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <label className="grid gap-1 text-sm">
            <span>メールアドレス</span>
            <input name="email" type="email" required autoComplete="email" className="nc-input" />
          </label>
          <label className="grid gap-1 text-sm">
            <span>パスワード</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="nc-input"
            />
          </label>
          <PendingSubmitButton pendingLabel="ログインしています…" className="nc-btn">
            ログイン
          </PendingSubmitButton>
        </MutationForm>
        <p className="mt-4 text-sm text-muted">
          アカウントがない場合は{" "}
          <Link href="/signup" className="underline">
            新規登録
          </Link>
        </p>
      </Card>
    </div>
  );
}
