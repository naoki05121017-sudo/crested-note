import { Suspense } from "react";
import { CrestPhoto, TitleCrown } from "@/app/components/crest-photo";
import { LegalNav } from "@/app/components/legal-nav";
import { LoginGalleryPreviewSlot } from "@/app/components/login-gallery-preview";
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
    <div className="nc-hero nc-crest-stage nc-login-stage nc-login-enter flex flex-col">
      <CrestPhoto />
      <div className="nc-crest-stage-copy">
        <div className="nc-home-title-brand">
          <TitleCrown />
          <h1 className={`nc-home-title-word ${crestTitle.className}`}>クレスノート</h1>
          <p className="nc-hero-kicker nc-home-title-by">by N.crest</p>
        </div>
        <p className="nc-hero-copy mt-7 max-w-[12.75rem] text-[15px] leading-7">
          クレスの飼育・成長・繁殖をひとつに。
        </p>
        <p className="mt-3 text-sm tracking-wide text-white/42">
          記録 → 成長 → 比較 → 繁殖
        </p>
        <Link href="/signup" className="nc-btn mt-6 w-full max-w-md min-h-12">
          無料ではじめる
        </Link>
        <div className="mt-5 max-w-md">
          <Suspense>
            <LoginCheckNotice />
          </Suspense>
          <p className="text-sm text-white/40">
            すでにアカウントをお持ちですか？
          </p>
          <details className="nc-login-details mt-2">
            <summary className="nc-btn-ghost mt-2 flex min-h-11 w-full cursor-pointer items-center justify-center text-sm">
              ログイン
            </summary>
            <MutationForm action={signIn} className="mt-5 flex flex-col gap-4">
              <Suspense fallback={<input type="hidden" name="next" value="/" />}>
                <LoginNextField />
              </Suspense>
              <label className="grid gap-1 text-sm text-white/80">
                <span>メールアドレス</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="nc-input min-h-12"
                />
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
              <PendingSubmitButton
                pendingLabel="ログインしています…"
                className="nc-btn-ghost min-h-12"
              >
                ログイン
              </PendingSubmitButton>
            </MutationForm>
          </details>
        </div>
        <Suspense fallback={null}>
          <LoginGalleryPreviewSlot />
        </Suspense>
        <LegalNav className="mt-5 max-w-md justify-start text-white/45" />
      </div>
    </div>
  );
}
