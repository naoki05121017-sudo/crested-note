import { Suspense } from "react";
import Link from "next/link";
import { AnimalsCollection } from "@/app/(app)/animals/animals-collection";
import { AnimalsFilter } from "@/app/(app)/animals/animals-filter";
import {
  CrestLinkRedeemCard,
  CrestLinkRedeemFallback,
} from "@/app/(app)/animals/crest-link-redeem";
import { requireAppUser } from "@/lib/auth/session";
import {
  listGenesForAnimals,
  listLatestWeightsForAnimals,
  listOwnedAnimalsPage,
} from "@/lib/db/animal-io";
import { hydrateAnimal } from "@/lib/db/queries";
import type { AnimalRecord, DatabaseFile } from "@/lib/db/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "個体" };

function emptyGeneDb(records: AnimalRecord[], genes: DatabaseFile["genes"]): DatabaseFile {
  return {
    animals: records,
    genes,
    weights: [],
    breedings: [],
    clutches: [],
    eggs: [],
    projects: [],
    projectMembers: [],
    predictions: [],
    settings: {
      displayName: "",
      collectionName: "",
      prefecture: "",
      publicByDefault: false,
    },
    feedback: [],
    crestLinkSeq: 0,
    animalCodeSeq: 0,
    crestLinks: [],
    crestLinkTransfers: [],
  };
}

export default async function AnimalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const sex = typeof params.sex === "string" ? params.sex : "";
  const status = typeof params.status === "string" ? params.status : "";
  const page = Number.parseInt(typeof params.page === "string" ? params.page : "1", 10);
  const user = await requireAppUser();
  const listed = await listOwnedAnimalsPage(user.id, {
    q,
    sex,
    status,
    page: Number.isFinite(page) ? page : 1,
  });
  const ids = listed.records.map((row) => row.id);
  const [genes, latestRows] = await Promise.all([
    listGenesForAnimals(ids),
    listLatestWeightsForAnimals(ids),
  ]);
  const db = emptyGeneDb(listed.records, genes);
  const animals = listed.records.map((record) => hydrateAnimal(db, record));
  const latestById: Record<string, { weightG: number } | undefined> = {};
  for (const row of latestRows) {
    latestById[row.animalId] = { weightG: row.weightG };
  }
  const pageCount = Math.max(1, Math.ceil(listed.total / listed.pageSize));
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (sex) query.set("sex", sex);
  if (status) query.set("status", status);
  function pageHref(target: number) {
    const next = new URLSearchParams(query);
    if (target > 1) next.set("page", String(target));
    const text = next.toString();
    return text ? `/animals?${text}` : "/animals";
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-white sm:text-3xl">
          個体
        </h1>
        <Link href="/animals/new" className="nc-btn h-10 min-h-10 px-4 text-sm">
          新規登録
        </Link>
      </div>
      <AnimalsFilter q={q} sex={sex} status={status} />

      {animals.length === 0 ? (
        <section className="nc-panel px-5 py-10 text-center text-ink sm:p-12">
          <p className="text-lg font-semibold">まずクレスを登録しましょう</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            写真・体重・成長を残せます。
          </p>
          <Link href="/animals/new" className="nc-btn mt-6 min-h-12">
            個体を登録
          </Link>
        </section>
      ) : (
        <AnimalsCollection animals={animals} latestById={latestById} />
      )}

      {listed.total > listed.pageSize ? (
        <nav className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/70">
          <p>
            {listed.total}件中 {(listed.page - 1) * listed.pageSize + 1}–
            {Math.min(listed.page * listed.pageSize, listed.total)}件
          </p>
          <div className="flex gap-2">
            {listed.page > 1 ? (
              <Link href={pageHref(listed.page - 1)} className="nc-btn-ghost">
                前へ
              </Link>
            ) : null}
            {listed.page < pageCount ? (
              <Link href={pageHref(listed.page + 1)} className="nc-btn-ghost">
                次へ
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}

      <Suspense fallback={<CrestLinkRedeemFallback />}>
        <CrestLinkRedeemCard />
      </Suspense>
    </div>
  );
}
