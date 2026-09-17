import Link from "next/link";
import { EmptyState, PageHeader, Badge } from "@/app/components/ui";
import { listBreedings, getAnimal } from "@/lib/db/queries";
import { BREEDING_STATUS_LABEL, animalTitle } from "@/lib/db/labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "繁殖" };

export default async function BreedingsPage() {
  const breedings = await listBreedings();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="BREEDING"
        title="繁殖"
        description="ペア、クラッチ、卵、孵化まで。"
        actions={
          <Link href="/breedings/new" className="nc-btn">
            ペアを作成
          </Link>
        }
      />
      {breedings.length === 0 ? (
        <EmptyState
          title="まだペアがありません"
          body="個体を選んで最初のペアを作ります。"
          action={
            <Link href="/breedings/new" className="nc-btn">
              ペアを作成
            </Link>
          }
        />
      ) : (
        <div className="nc-table-wrap">
          <table className="nc-table min-w-[32rem]">
            <thead>
              <tr>
                <th>ペア</th>
                <th>開始</th>
                <th>状態</th>
                <th>卵</th>
              </tr>
            </thead>
            <tbody>
              {await Promise.all(
                breedings.map(async (breeding) => {
                const male = await getAnimal(breeding.maleId);
                const female = await getAnimal(breeding.femaleId);
                const eggs = breeding.clutches.flatMap((clutch) => clutch.eggs);
                return (
                  <tr key={breeding.id}>
                    <td>
                      <Link href={`/breedings/${breeding.id}`} className="font-medium hover:underline">
                        {male ? animalTitle(male) : "?"} × {female ? animalTitle(female) : "?"}
                      </Link>
                    </td>
                    <td>{breeding.startedOn}</td>
                    <td>
                      <Badge tone={breeding.status === "active" ? "sage" : "sand"}>
                        {BREEDING_STATUS_LABEL[breeding.status]}
                      </Badge>
                    </td>
                    <td className="text-xl font-semibold tabular-nums">{eggs.length}</td>
                  </tr>
                );
              }),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
