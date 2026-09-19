import Link from "next/link";
import { EmptyState, PageHeader } from "@/app/components/ui";
import { listPredictions } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "予想と実績" };

export default async function PredictionsPage() {
  const rows = await listPredictions();
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="PREDICTION"
        title="交配予想 vs 実績"
        description="計算結果を保存し、実際に生まれた子と比べます。"
        actions={
          <Link href="/simulate" className="nc-btn">
            新しく計算する
          </Link>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          title="保存された予想はまだありません"
          body="遺伝計算またはシミュレーションで「計算する」のあと、結果を保存してください。ブリードのペアを作ると自動でも保存されます。"
        />
      ) : (
        <ul className="grid gap-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/predictions/${row.id}`}
                className="block rounded-[1.5rem] border border-line bg-surface p-5 shadow-[0_12px_32px_rgba(28,25,23,0.04)]"
              >
                <h2 className="font-semibold">{row.name}</h2>
                <p className="mt-1 text-sm text-muted">
                  {row.createdAt.slice(0, 10)} / 予想 {row.pairing.outcomes.length} 通り
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
