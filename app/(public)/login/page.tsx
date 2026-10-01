import { Suspense } from "react";
import { CrestPhoto, TitleCrown } from "@/app/components/crest-photo";
import { GuestPitch } from "@/app/components/guest-pitch";
import { Card } from "@/app/components/ui";
import { LegalNav } from "@/app/components/legal-nav";
import { LoginCheckNotice, LoginNextField } from "@/app/components/login-form";
import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { signIn } from "@/app/auth/actions";
import { Dela_Gothic_One } from "next/font/google";
import Link from "next/link";

const crestTitle = Dela_Gothic_One({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
});

export const metadata = { title: "ログイン" };

export default function LoginPage() {
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
          <GuestPitch />
        </div>
        <Card tone="glass" className="mt-8 max-w-md">
          <h1 className="text-lg font-semibold tracking-tight text-white">ログイン</h1>
          <p className="mt-1 text-sm text-white/45">すでにアカウントがある場合</p>
          <Suspense>
            <LoginCheckNotice />
          </Suspense>
          <MutationForm action={signIn} className="mt-4 flex flex-col gap-4">
            <Suspense fallback={<input type="hidden" name="next" value="/" />}>
              <LoginNextField />
            </Suspense>
            <label className="grid gap-1 text-sm text-white/80">
              <span>メールアドレス</span>
              <input name="email" type="email" required autoComplete="email" className="nc-input min-h-12" />
            </label>
            <label className="grid gap-1 text-sm text-white/80">
              <span>パスワード</span>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="nc-input min-h-12"
              />
            </label>
            <PendingSubmitButton pendingLabel="ログインしています…" className="nc-btn min-h-12">
              ログイン
            </PendingSubmitButton>
          </MutationForm>
          <p className="mt-4 text-sm text-white/55">
            アカウントがない場合は{" "}
            <Link href="/signup" className="underline">
              無料ではじめる
            </Link>
          </p>
        </Card>
        <LegalNav className="mt-8 max-w-md justify-start text-white/45" />
      </div>
    </div>
  );
}
