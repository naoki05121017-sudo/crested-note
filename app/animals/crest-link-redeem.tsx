import { redeemAnimalTransfer } from "@/app/animals/crest-link-actions";
import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { Card, SectionTitle } from "@/app/components/ui";
import { getSettings } from "@/lib/db/queries";

export async function CrestLinkRedeemCard() {
  const settings = await getSettings();
  return (
    <Card>
      <SectionTitle>Crest Link を引き継ぐ</SectionTitle>
      <p className="mb-4 text-sm text-muted">
        譲渡された個体の引き継ぎコードを入力すると、出生・親・体重・繁殖などの個体データを受け取れます。前の所有者の個人情報は表示されません。
      </p>
      <MutationForm action={redeemAnimalTransfer} className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>引き継ぎコード</span>
          <input
            name="code"
            required
            placeholder="ABCD-EFGH"
            className="nc-input font-mono tracking-widest uppercase"
            autoComplete="off"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>新しい所有者名</span>
          <input
            name="ownerLabel"
            required
            defaultValue={settings.displayName}
            placeholder="受け取り後の表示名"
            className="nc-input"
          />
        </label>
        <PendingSubmitButton pendingLabel="引き継いでいます…" className="nc-btn w-full sm:col-span-2 sm:w-fit">
          引き継ぐ
        </PendingSubmitButton>
      </MutationForm>
    </Card>
  );
}
