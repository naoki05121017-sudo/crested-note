import { saveNickname } from "@/app/(public)/nickname/actions";
import { signOut } from "@/app/auth/actions";
import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { Card, PageHeader } from "@/app/components/ui";
import { NICKNAME_MAX_LEN } from "@/lib/community/album-comments";
import { getOwnStoredDisplayName, requireSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "ニックネーム" };

export default async function NicknamePage() {
  const user = await requireSessionUser();
  const nickname = await getOwnStoredDisplayName(user.id);
  if (nickname) redirect("/");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <PageHeader
        kicker="NICKNAME"
        title="ニックネームを設定してください"
        description="みんなのクレスなど、公開の場で表示されます。メールや本名、コレクション名は使わないでください。"
      />
      <Card tone="mist">
        <MutationForm action={saveNickname} className="flex flex-col gap-4">
          <label className="grid gap-1 text-sm">
            <span>ニックネーム</span>
            <input
              name="displayName"
              required
              maxLength={NICKNAME_MAX_LEN}
              autoComplete="nickname"
              className="nc-input"
            />
          </label>
          <PendingSubmitButton pendingLabel="保存しています…" className="nc-btn w-full sm:w-fit">
            保存して始める
          </PendingSubmitButton>
        </MutationForm>
      </Card>
      <form action={signOut}>
        <PendingSubmitButton pendingLabel="ログアウトしています…" className="nc-btn-ghost">
          ログアウト
        </PendingSubmitButton>
      </form>
    </div>
  );
}
