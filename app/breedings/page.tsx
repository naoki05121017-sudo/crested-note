import Link from "next/link";
import { EmptyState, PageHeader, Badge } from "@/app/components/ui";
import { listBreedings, getAnimal } from "@/lib/db/queries";
import { BREEDING_STATUS_LABEL, animalTitle } from "@/lib/db/labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "ブリード" };

export default async function BreedingsPage() {
  const breedings = await listBreedings();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="BREEDING"
        title="ブリード"
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
        <ul className="grid gap-4">
          {await Promise.all(
            breedings.map(async (breeding) => {
              const male = await getAnimal(breeding.maleId);
              const female = await getAnimal(breeding.femaleId);
              const eggs = breeding.clutches.flatMap((clutch) => clutch.eggs);
              return (
                <li key={breeding.id}>
                  <Link
                    href={`/breedings/${breeding.id}`}
                    className="block rounded-[1.75rem] border border-line bg-white p-5 shadow-[0_10px_28px_rgba(23,20,28,0.05)] sm:p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="text-lg font-semibold tracking-tight">
                        {male ? animalTitle(male) : "?"} × {female ? animalTitle(female) : "?"}
                      </p>
                      <Badge tone={breeding.status === "active" ? "sage" : "sand"}>
                        {BREEDING_STATUS_LABEL[breeding.status]}
                      </Badge>
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted">開始</p>
                        <p className="mt-1 text-sm font-medium">{breeding.startedOn}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted">卵</p>
                        <p className="text-3xl font-semibold tabular-nums">{eggs.length}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            }),
          )}
        </ul>
      )}
    </div>
  );
}
