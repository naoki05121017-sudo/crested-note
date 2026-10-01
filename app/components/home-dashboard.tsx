import Link from "next/link";
import type { ReactNode } from "react";
import { Dela_Gothic_One } from "next/font/google";
import { CrestPhoto, TitleCrown } from "@/app/components/crest-photo";
import { HomeAnimalPreview } from "@/app/components/home-animal-preview";
import { HomeSectionTitle } from "@/app/components/home-section-title";
import { PhotoAlbumGrid, type PhotoAlbumItem } from "@/app/components/photo-album-grid";
import { HomeCheckList } from "@/app/components/home-check-list";
import { HOME_PHOTO_PREVIEW } from "@/lib/db/animal-search";
import { averageCollectionCopy } from "@/lib/stats/japan";
import type { CrestCheckItem } from "@/lib/care/crest-check-list";
import type { Animal, WeightLogRecord } from "@/lib/db/types";

const crestTitle = Dela_Gothic_One({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
});

export type HomeCompareCard = {
  name: string;
  href: string;
  mineWeight: number | null;
  average: number | null;
  sampleSize: number;
  comparable: boolean;
  vsAverage: string | null;
  tone: string;
} | null;

export function HomeJapanFallback() {
  return (
    <section className="mt-8 min-w-0" aria-hidden>
      <HomeSectionTitle kicker="JAPAN" title="自分と全国" tone="blush" href="/compare" action="比較" />
      <div className="nc-skel h-24 w-full rounded-[1rem]" />
    </section>
  );
}

export function HomeJapanBlock({
  compare,
  japanRegistered,
  japanLiving,
  japanMeanWeight,
  japanWeightSample,
}: {
  compare: HomeCompareCard;
  japanRegistered: number;
  japanLiving: number;
  japanMeanWeight: number | null;
  japanWeightSample: number;
}) {
  const japanMeanCopy = averageCollectionCopy(japanWeightSample);
  return (
    <section className="mt-8 min-w-0">
      <HomeSectionTitle kicker="JAPAN" title="自分と全国" tone="blush" href="/compare" action="比較" />
      {compare ? (
        <div className="min-w-0">
          <p className="truncate text-[11px] text-white/32">{compare.name}</p>
          <div className="mt-2.5 grid grid-cols-2 gap-3">
            <div className="min-w-0 border-r border-white/10 pr-3">
              <p className="text-[1.7rem] font-semibold tabular-nums leading-none nc-tone-mint">
                {compare.mineWeight === null ? "—" : `${compare.mineWeight.toFixed(1)}g`}
              </p>
              <p className="mt-2 text-[11px] leading-4 text-white/40">この子</p>
            </div>
            <div className="min-w-0">
              <p className="text-[1.7rem] font-semibold tabular-nums leading-none text-white/75">
                {compare.comparable && compare.average !== null
                  ? `${compare.average.toFixed(1)}g`
                  : "—"}
              </p>
              <p className="mt-2 text-[11px] leading-4 text-white/40">近い条件の平均</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-white/35">{compare.tone}</p>
        </div>
      ) : (
        <p className="text-sm leading-6 text-white/40">
          体重を記録した個体があると、近い条件の平均と比べられます。
        </p>
      )}
      <p className="mt-5 text-[11px] text-white/28">
        登録 {japanRegistered} ・飼育中 {japanLiving}
        {japanMeanCopy
          ? ` ・${japanMeanCopy.title}`
          : japanMeanWeight != null
            ? ` ・平均 ${japanMeanWeight.toFixed(1)}g`
            : ""}
      </p>
      <Link href="/stats" className="mt-2 inline-block text-sm text-white/32 underline-offset-2 hover:underline">
        日本のクレス統計
      </Link>
    </section>
  );
}

export function HomeBreedingBlock({
  activeBreedings,
  incubatingEggs,
  projectCount,
  upcomingHatches,
}: {
  activeBreedings: number;
  incubatingEggs: number;
  projectCount: number;
  upcomingHatches: { egg: { id: string; expectedHatchOn: string }; breedingId: string }[];
}) {
  const showBreeding =
    activeBreedings > 0 ||
    incubatingEggs > 0 ||
    projectCount > 0 ||
    upcomingHatches.length > 0;
  if (!showBreeding) return null;
  return (
    <section className="mt-9 min-w-0">
      <HomeSectionTitle kicker="BREED" title="進行中のブリード" tone="lilac" href="/breedings" />
      <div className="grid grid-cols-3 gap-3 text-sm">
        <Link href="/breedings" className="min-w-0">
          <p className="text-[11px] text-white/32">ペア</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-white/75">{activeBreedings}</p>
        </Link>
        <Link href="/breedings" className="min-w-0">
          <p className="text-[11px] text-white/32">孵化待ち</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-white/75">{incubatingEggs}</p>
        </Link>
        <Link href="/projects" className="min-w-0">
          <p className="text-[11px] text-white/32">プロジェクト</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-white/75">{projectCount}</p>
        </Link>
      </div>
      {upcomingHatches.length > 0 ? (
        <ul className="mt-2">
          {upcomingHatches.map(({ egg, breedingId }) => (
            <li
              key={egg.id}
              className="flex min-h-11 min-w-0 items-center justify-between gap-2 border-b border-white/8 py-2 last:border-0"
            >
              <span className="tabular-nums text-white/75">{egg.expectedHatchOn}</span>
              <Link href={`/breedings/${breedingId}`} className="text-sm text-white/35">
                ペアを見る
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function HomeBelowFoldFallback() {
  return (
    <div className="mt-8" aria-hidden>
      <div className="nc-skel h-28 w-full rounded-[1rem]" />
    </div>
  );
}

export function HomeCareAlbumBlocks({
  photoAnimals,
  checks,
  checkTotal,
  unsetCadenceGuide,
  latestWeights,
}: {
  photoAnimals: PhotoAlbumItem[];
  checks: CrestCheckItem[];
  checkTotal: number;
  unsetCadenceGuide: { id: string; name: string; more: number } | null;
  latestWeights: Record<string, { weightG: number; weighedOn: string } | null>;
}) {
  const careItems = checks.slice(0, 3);
  const careLine = unsetCadenceGuide ? (
    <p className="mt-2 text-sm leading-6 text-white/38">
      今日のケアは未設定です。
      <Link
        href={`/animals/${unsetCadenceGuide.id}#check-cadence`}
        className="ml-1 underline-offset-2 hover:underline"
      >
        間隔を決める
      </Link>
      {unsetCadenceGuide.more > 0 ? (
        <span className="text-white/26"> ・ほか{unsetCadenceGuide.more}匹</span>
      ) : null}
    </p>
  ) : null;

  return (
    <>
      {careItems.length > 0 ? (
        <section className="mt-8 min-w-0">
          <HomeSectionTitle
            kicker="CARE"
            title="今日のケア"
            tone="care"
            href={checkTotal > careItems.length ? "/checks" : undefined}
          />
          <HomeCheckList items={careItems} compact />
          {careLine}
        </section>
      ) : careLine ? (
        <div className="mt-8">{careLine}</div>
      ) : null}

      <section className="mt-9 min-w-0">
        <HomeSectionTitle kicker="ALBUM" title="アルバム" tone="mist" href="/album" />
        {photoAnimals.length === 0 ? (
          <p className="text-sm leading-6 text-white/40">写真を登録すると、ここに並びます。</p>
        ) : (
          <PhotoAlbumGrid
            animals={photoAnimals.slice(0, HOME_PHOTO_PREVIEW)}
            latestWeights={latestWeights}
            tone="light"
          />
        )}
      </section>
    </>
  );
}

export function HomeDashboard({
  collectionName: _collectionName,
  animalCount: _animalCount,
  animals,
  recentWeights,
  latestWeights,
  careAlbumSection,
  japanSection,
  breedingSection,
}: {
  collectionName: string;
  animalCount: number;
  animals: Animal[];
  recentWeights: { animal: Animal; log: WeightLogRecord }[];
  latestWeights: Record<string, { weightG: number; weighedOn: string } | null>;
  careAlbumSection: ReactNode;
  japanSection: ReactNode;
  breedingSection: ReactNode;
}) {
  const emptyCollection = animals.length === 0;
  const latestLogs = recentWeights.slice(0, 2);
  const growthAnimal = latestLogs[0]?.animal ?? animals[0];

  return (
    <div className="flex min-w-0 max-w-full flex-col">
      {emptyCollection ? (
        <section className="nc-hero nc-crest-stage nc-home-title">
          <CrestPhoto />
          <div className="nc-home-title-copy">
            <div className="nc-home-title-brand">
              <TitleCrown />
              <h1 className={`nc-home-title-word ${crestTitle.className}`}>
                クレスノート
              </h1>
              <p className="nc-hero-kicker nc-home-title-by">by N.crest</p>
            </div>
            <p className="nc-hero-copy mt-4 max-w-[16.5rem] text-[15px] leading-7 sm:max-w-sm">
              自分のクレスの体重と成長を、かんたんに残そう。
            </p>
            <Link href="/animals/new" className="nc-btn mt-5 w-full sm:w-auto">
              個体を登録
            </Link>
          </div>
        </section>
      ) : (
        <HomeAnimalPreview animals={animals} latestWeights={latestWeights} />
      )}

      <div className="mt-1 border-t border-white/10 pt-5">
      <section className="min-w-0">
        <HomeSectionTitle kicker="WEIGHT" title="最新の体重" tone="mint" />
        {latestLogs.length === 0 ? (
          <p className="text-sm leading-6 text-white/40">
            体重を記録すると、ここに並びます。
            {emptyCollection ? (
              <>
                {" "}
                <Link href="/animals/new" className="underline-offset-2 hover:underline">
                  個体を登録
                </Link>
              </>
            ) : null}
          </p>
        ) : (
          <ul>
            {latestLogs.map(({ animal, log }) => (
              <li key={log.id} className="border-b border-white/8 last:border-0">
                <Link
                  href={`/animals/${animal.id}`}
                  className="flex min-h-12 min-w-0 items-center justify-between gap-3 py-2.5 active:opacity-70"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] text-white/80">{animal.name}</p>
                    <p className="mt-0.5 text-xs text-white/32">{log.weighedOn}</p>
                  </div>
                  <p className="shrink-0 text-[1.65rem] font-semibold tabular-nums leading-none nc-tone-mint">
                    {log.weightG}g
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 min-w-0">
        <HomeSectionTitle kicker="GROWTH" title="成長" tone="lilac" compact />
        {growthAnimal ? (
          <Link
            href={`/animals/${growthAnimal.id}`}
            className="flex min-h-9 items-center justify-between gap-3 py-0 active:opacity-70"
          >
            <p className="min-w-0 truncate text-[15px] text-white/70">{growthAnimal.name}</p>
            <p className="shrink-0 text-sm text-white/38">グラフを見る →</p>
          </Link>
        ) : (
          <p className="text-sm leading-6 text-white/40">記録を続けると、成長が見えます。</p>
        )}
      </section>
      </div>

      {careAlbumSection}
      {japanSection}
      {breedingSection}
    </div>
  );
}
