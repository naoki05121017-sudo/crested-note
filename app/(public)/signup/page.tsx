import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { CrestPhoto, TitleCrown } from "@/app/components/crest-photo";
import { GuestPitch } from "@/app/components/guest-pitch";
import { Card } from "@/app/components/ui";
import { LegalNav } from "@/app/components/legal-nav";
import { signUp } from "@/app/auth/actions";
import { Dela_Gothic_One } from "next/font/google";
import Link from "next/link";

const crestTitle = Dela_Gothic_One({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
});

export const metadata = { title: "新規登録" };

export default function SignupPage() {
  return (
    <div className="nc-hero nc-crest-stage nc-login-stage flex flex-col gap-8">
      <CrestPhoto />
      <div className="nc-crest-stage-copy">
        <div className="nc-home-title-brand">
          <TitleCrown />
          <p className={`nc-home-title-word ${crestTitle.className}`}>クレスノート</p>
          <p className="nc-hero-kicker nc-home-title-by">by N.crest</p>
        </div>
        <div className="mt-6">
          <GuestPitch showCta={false} />
        </div>
        <Card tone="glass" className="mt-8 max-w-md">
          <h1 className="text-lg font-semibold tracking-tight text-white">
            新規登録
          </h1>
          <MutationForm action={signUp} className="mt-4 flex flex-col gap-4">
            <label className="grid gap-1 text-sm text-white/80">
              <span>表示名（任意）</span>
              <input name="displayName" className="nc-input min-h-12" />
            </label>
            <label className="grid gap-1 text-sm text-white/80">
              <span>メールアドレス</span>
              <input name="email" type="email" required autoComplete="email" className="nc-input min-h-12" />
            </label>
            <label className="grid gap-1 text-sm text-white/80">
              <span>パスワード（8文字以上）</span>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="nc-input min-h-12"
              />
            </label>
            <PendingSubmitButton pendingLabel="登録しています…" className="nc-btn min-h-12">
              無料ではじめる
            </PendingSubmitButton>
          </MutationForm>
          <p className="mt-4 text-sm leading-6 text-white/55">
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
          <p className="mt-4 text-sm text-white/55">
            すでにアカウントがある場合は{" "}
            <Link href="/login" className="underline">
              ログイン
            </Link>
          </p>
        </Card>
        <LegalNav className="mt-8 max-w-md justify-start text-white/45" />
      </div>
    </div>
  );
}
