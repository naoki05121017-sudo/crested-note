import { saveSettings } from "@/app/settings/actions";
import { signOut } from "@/app/auth/actions";
import { FeedbackForm } from "@/app/settings/feedback-form";
import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { Card, Notice, PageHeader } from "@/app/components/ui";
import { getSettings } from "@/lib/db/queries";
import { PREFECTURES } from "@/lib/db/labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "設定" };

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
      <PageHeader
        kicker="SETTINGS"
        title="設定"
        description="コレクション名と、新規個体の公開初期値など。"
      />
      <Card>
        <h2 className="mb-4 text-lg font-semibold">アカウント</h2>
        <form action={signOut}>
          <PendingSubmitButton pendingLabel="ログアウトしています…" className="nc-btn-ghost">
            ログアウト
          </PendingSubmitButton>
        </form>
      </Card>
      <Card>
      <MutationForm action={saveSettings} className="flex max-w-xl flex-col gap-4">
        <label className="grid gap-1 text-sm">
          <span>表示名</span>
          <input name="displayName" defaultValue={settings.displayName} className="nc-input" />
        </label>
        <label className="grid gap-1 text-sm">
          <span>コレクション名</span>
          <input
            name="collectionName"
            defaultValue={settings.collectionName}
            className="nc-input"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>都道府県</span>
          <select name="prefecture" defaultValue={settings.prefecture} className="nc-input">
            <option value="">未設定</option>
            {PREFECTURES.map((pref) => (
              <option key={pref} value={pref}>
                {pref}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="publicByDefault"
            defaultChecked={settings.publicByDefault}
            className="nc-check"
          />
          新規個体を最初から公開する
        </label>
        <PendingSubmitButton pendingLabel="保存しています…" className="nc-btn w-full sm:w-fit">
          保存する
        </PendingSubmitButton>
      </MutationForm>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">ご意見・不具合を送る</h2>
        {sent ? (
          <Notice>
            運営へのご意見として受け付けました。他の人には表示されません。
          </Notice>
        ) : null}
        <div className={sent ? "mt-4" : ""}>
          <FeedbackForm />
        </div>
      </Card>
    </div>
  );
}
