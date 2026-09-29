import Link from "next/link";
import { PhotoAlbumGrid } from "@/app/components/photo-album-grid";
import { PageHeader } from "@/app/components/ui";
import { requireSessionUser } from "@/lib/auth/session";
import { listWeightsForAnimals } from "@/lib/db/animal-io";
import { PHOTO_ALBUM_PAGE_SIZE } from "@/lib/db/animal-search";
import { listOwnedPhotoAnimalsPage } from "@/lib/db/owned-tables";
import { latestWeight } from "@/lib/stats/compare";
import type { WeightLogRecord } from "@/lib/db/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "成長アルバム" };

export default async function AlbumPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSessionUser();
  const params = await searchParams;
  const page = Number.parseInt(typeof params.page === "string" ? params.page : "1", 10);
  const listed = await listOwnedPhotoAnimalsPage(user.id, {
    page: Number.isFinite(page) ? page : 1,
    pageSize: PHOTO_ALBUM_PAGE_SIZE,
  });
  const weightRows = await listWeightsForAnimals(listed.records.map((row) => row.id));
  const byWeights = new Map<string, WeightLogRecord[]>();
  for (const row of weightRows) {
    const list = byWeights.get(row.animalId) ?? [];
    list.push(row);
    byWeights.set(row.animalId, list);
  }
  const latestWeights = Object.fromEntries(
    listed.records.map((animal) => {
      const last = latestWeight(byWeights.get(animal.id) ?? []);
      return [animal.id, last ? { weightG: last.weightG } : null];
    }),
  );
  const pageCount = Math.max(1, Math.ceil(listed.total / listed.pageSize));
  function pageHref(target: number) {
    return target > 1 ? `/album?page=${target}` : "/album";
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="ALBUM"
        title="成長アルバム"
        description="写真がある個体をコンパクトに一覧します。タップすると個体の詳細へ進みます。"
      />

      {listed.records.length === 0 ? (
        <section className="nc-lift rounded-[2rem] bg-gradient-to-br from-[#fff8fb] to-[#eef6fb] px-5 py-12 text-center text-ink sm:p-12">
          <p className="text-lg font-semibold">まだ写真がありません</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            個体に写真を登録すると、ここに並びます。
          </p>
          <Link href="/animals" className="nc-btn mt-6">
            マイ個体を見る
          </Link>
        </section>
      ) : (
        <section className="nc-lift rounded-[2rem] bg-gradient-to-br from-[#fff8fb] to-[#eef6fb] p-4 text-ink sm:p-6">
          <PhotoAlbumGrid animals={listed.records} latestWeights={latestWeights} />
        </section>
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
    </div>
  );
}
