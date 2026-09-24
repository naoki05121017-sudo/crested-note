import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { Card, PageHeader } from "@/app/components/ui";
import { LegalNav } from "@/app/components/legal-nav";
import { signUp } from "@/app/auth/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "新規登録" };

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="ACCOUNT"
        title="新規登録"
        description="登録した個体は、ログインしたあなただけが管理できます。"
      />
      <Card className="max-w-md">
        <MutationForm action={signUp} className="flex flex-col gap-4">
          <label className="grid gap-1 text-sm">
            <span>表示名（任意）</span>
            <input name="displayName" className="nc-input" />
          </label>
          <label className="grid gap-1 text-sm">
            <span>メールアドレス</span>
            <input name="email" type="email" required autoComplete="email" className="nc-input" />
          </label>
          <label className="grid gap-1 text-sm">
            <span>パスワード（8文字以上）</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="nc-input"
            />
          </label>
          <PendingSubmitButton pendingLabel="登録しています…" className="nc-btn">
            登録する
          </PendingSubmitButton>
        </MutationForm>
        <p className="mt-4 text-sm leading-6 text-muted">
          登録すると
          <Link href="/legal/terms" className="underline">
            利用規約
          </Link>
          および
          <Link href="/legal/privacy" className="underline">
            プライバシーポリシー
          </Link>
          に同意したものとみなします。
        </p>
        <p className="mt-4 text-sm text-muted">
          すでにアカウントがある場合は{" "}
          <Link href="/login" className="underline">
            ログイン
          </Link>
        </p>
      </Card>
      <LegalNav className="max-w-md justify-start text-white/45" />
    </div>
  );
}
