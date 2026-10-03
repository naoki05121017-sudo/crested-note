import { saveSettings } from "@/app/(app)/settings/actions";
import { signOut } from "@/app/auth/actions";
import { FeedbackForm } from "@/app/(app)/settings/feedback-form";
import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { Card, Notice, PageHeader } from "@/app/components/ui";
import { LegalNav } from "@/app/components/legal-nav";
import { IncludedFeatures } from "@/app/components/included-features";
import { PushSettingsCard } from "@/app/(app)/settings/push-settings-card";
import { ThemeSettings } from "@/app/components/theme-settings";
import { getSettings } from "@/lib/db/queries";
import { NICKNAME_MAX_LEN } from "@/lib/community/album-comments";
import { PREFECTURES } from "@/lib/db/labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "設定" };

function SectionLabel({ children }: { children: string }) {
  return <p className="mb-2 px-0.5 text-sm text-white/45">{children}</p>;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const settings = await getSettings();
  const params = await searchParams;
  const sent = params.sent === "1";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader kicker="SETTINGS" title="設定" description="ニックネーム、公開、通知。" />

      <section>
        <SectionLabel>テーマ</SectionLabel>
        <Card>
          <ThemeSettings />
        </Card>
      </section>

      <section>
        <SectionLabel>アカウント</SectionLabel>
        <Card>
          <form action={signOut}>
            <PendingSubmitButton pendingLabel="ログアウトしています…" className="nc-btn-ghost min-h-12 w-full sm:w-auto">
              ログアウト
            </PendingSubmitButton>
          </form>
        </Card>
      </section>

      <MutationForm action={saveSettings} className="flex flex-col gap-5">
        <section>
          <SectionLabel>プロフィール</SectionLabel>
          <Card>
            <div className="flex flex-col gap-5">
              <label className="grid gap-1 text-sm">
                <span className="font-medium">ニックネーム</span>
                <input
                  name="displayName"
                  required
                  maxLength={NICKNAME_MAX_LEN}
                  defaultValue={settings.displayName}
                  className="nc-input min-h-12"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">コレクション名</span>
                <input
                  name="collectionName"
                  defaultValue={settings.collectionName}
                  className="nc-input min-h-12"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">都道府県</span>
                <select name="prefecture" defaultValue={settings.prefecture} className="nc-input min-h-12">
                  <option value="">未設定</option>
                  {PREFECTURES.map((pref) => (
                    <option key={pref} value={pref}>
                      {pref}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Card>
        </section>

        <section>
          <SectionLabel>公開</SectionLabel>
          <Card>
            <label className="flex min-h-14 items-center justify-between gap-4">
              <span className="min-w-0">
                <span className="block text-sm font-medium">新規個体を公開</span>
                <span className="mt-1 block text-sm leading-6 text-muted">
                  登録時の初期値。あとから個体ごとに変えられます。
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-medium tabular-nums">
                  {settings.publicByDefault ? "オン" : "オフ"}
                </span>
                <input
                  type="checkbox"
                  name="publicByDefault"
                  defaultChecked={settings.publicByDefault}
                  className="nc-check h-5 w-5"
                />
              </span>
            </label>
          </Card>
        </section>

        <PendingSubmitButton pendingLabel="保存しています…" className="nc-btn min-h-12 w-full sm:w-fit">
          保存する
        </PendingSubmitButton>
      </MutationForm>

      <section>
        <SectionLabel>通知</SectionLabel>
        <Card>
          <PushSettingsCard />
        </Card>
      </section>

      <section>
        <SectionLabel>アプリ</SectionLabel>
        <div className="flex flex-col gap-5">
          <Card>
            <h2 className="mb-1 text-base font-semibold">ご意見</h2>
            {sent ? (
              <Notice>
                運営へのご意見として受け付けました。他の人には表示されません。
              </Notice>
            ) : null}
            <div className={sent ? "mt-4" : ""}>
              <FeedbackForm />
            </div>
          </Card>
          <Card>
            <IncludedFeatures />
          </Card>
          <Card>
            <h2 className="mb-3 text-base font-semibold">規約・表記</h2>
            <LegalNav className="justify-start text-sm text-ink" />
          </Card>
        </div>
      </section>
    </div>
  );
}
