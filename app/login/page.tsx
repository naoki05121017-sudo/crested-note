import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { CrestPhoto, TitleCrown } from "@/app/components/crest-photo";
import { Card, PageHeader } from "@/app/components/ui";
import { LegalNav } from "@/app/components/legal-nav";
import { signIn } from "@/app/auth/actions";
import { Dela_Gothic_One } from "next/font/google";
import Link from "next/link";

const crestTitle = Dela_Gothic_One({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
});

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
    <div className="nc-hero nc-crest-stage nc-login-stage flex flex-col gap-8">
      <CrestPhoto />
      <div className="nc-crest-stage-copy">
        <div className="nc-home-title-brand">
          <TitleCrown />
          <p className={`nc-home-title-word ${crestTitle.className}`}>クレスノート</p>
          <p className="nc-hero-kicker nc-home-title-by">by N.crest</p>
        </div>
        <PageHeader
          kicker="ACCOUNT"
          title="ログイン"
          description="自分の個体だけが見えます。他の人の個体は表示されません。"
        />
        <Card tone="glass" className="mt-8 max-w-md">
        {check ? (
          <p className="mb-4 text-sm text-white/55">
            確認メールが届いている場合は、承認してからログインしてください。
          </p>
        ) : null}
        <MutationForm action={signIn} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <label className="grid gap-1 text-sm text-white/80">
            <span>メールアドレス</span>
            <input name="email" type="email" required autoComplete="email" className="nc-input" />
          </label>
          <label className="grid gap-1 text-sm text-white/80">
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
        <p className="mt-4 text-sm text-white/55">
          アカウントがない場合は{" "}
          <Link href="/signup" className="underline">
            新規登録
          </Link>
        </p>
        </Card>
        <LegalNav className="mt-8 max-w-md justify-start text-white/45" />
      </div>
    </div>
  );
}
