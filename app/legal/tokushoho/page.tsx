import { LegalArticle } from "@/app/legal/legal-article";
import { legalOperator } from "@/lib/legal/operator";

export const dynamic = "force-dynamic";
export const metadata = { title: "特定商取引法に基づく表記" };

const ROWS: { label: string; key: keyof ReturnType<typeof legalOperator> }[] = [
  { label: "販売事業者名", key: "sellerName" },
  { label: "運営責任者", key: "operatorName" },
  { label: "所在地", key: "address" },
  { label: "電話番号", key: "phone" },
  { label: "メールアドレス", key: "email" },
  { label: "販売価格", key: "price" },
  { label: "支払方法", key: "paymentMethod" },
  { label: "支払時期", key: "paymentTiming" },
  { label: "サービス提供時期", key: "serviceTiming" },
  { label: "解約方法", key: "cancelMethod" },
  { label: "返品・キャンセル等", key: "returns" },
];

export default function TokushohoPage() {
  const operator = legalOperator();

  return (
    <LegalArticle
      kicker="LEGAL"
      title="特定商取引法に基づく表記"
      description="通信販売に該当する場合に備え、法定の表示項目を用意しています。料金や事業者情報は決まり次第更新します。架空の記載はしていません。"
    >
      <dl className="divide-y divide-line">
        {ROWS.map((row) => (
          <div
            key={row.key}
            className="grid gap-1 py-4 first:pt-0 last:pb-0 sm:grid-cols-[10rem_1fr] sm:gap-4"
          >
            <dt className="text-sm font-medium text-ink">{row.label}</dt>
            <dd className="text-sm leading-7 text-muted">{operator[row.key]}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm leading-7 text-muted">
        電話番号が未設定の間は、メールでのお問い合わせをお願いします。メールアドレスも未設定の場合は、決まり次第本ページを更新します。
      </p>
    </LegalArticle>
  );
}
