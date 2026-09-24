import Link from "next/link";
import { AnimalPhoto } from "@/app/components/animal-photo";
import { displayAnimalId } from "@/lib/db/animal-code";
import { formatGenotypeLabel } from "@/lib/genetics";
import type { Animal, WeightLogRecord } from "@/lib/db/types";

function morphText(animal: Animal) {
  return animal.morphLabel.trim() || formatGenotypeLabel(animal.genotype);
}

function HomeCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[1.75rem] border border-line bg-white p-5 shadow-[0_10px_28px_rgba(23,20,28,0.05)] sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

function HomeStat({
  label,
  value,
  href,
  tint,
}: {
  label: string;
  value: string | number;
  href: string;
  tint: string;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-[1.75rem] p-5 ${tint}`}
    >
      <p className="text-sm text-ink/60">{label}</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
        {value}
      </p>
    </Link>
  );
}

export function HomeDashboard({
  collectionName,
  animalCount,
  activeBreedings,
  incubatingEggs,
  projectCount,
  upcomingHatches,
  animals,
  recentWeights,
  photoAnimals,
  japanRegistered,
  japanLiving,
  japanMeanWeight,
  japanWeightSample,
  compare,
}: {
  collectionName: string;
  animalCount: number;
  activeBreedings: number;
  incubatingEggs: number;
  projectCount: number;
  upcomingHatches: { egg: { id: string; expectedHatchOn: string }; breedingId: string }[];
  animals: Animal[];
  recentWeights: { animal: Animal; log: WeightLogRecord }[];
  photoAnimals: Animal[];
  japanRegistered: number;
  japanLiving: number;
  japanMeanWeight: number | null;
  japanWeightSample: number;
  compare: {
    name: string;
    href: string;
    mineWeight: number | null;
    average: number | null;
    sampleSize: number;
    tone: string;
  } | null;
}) {
  const featured = animals.slice(0, 6);

  return (
    <div className="flex flex-col gap-8">
      <HomeCard className="overflow-hidden bg-gradient-to-br from-[#fde8ef] via-white to-[#e7f3fb]">
        <p className="text-[11px] tracking-[0.22em] text-ink/40 uppercase">Welcome</p>
        <h1 className="mt-2 max-w-xl text-[1.85rem] font-semibold leading-tight tracking-tight sm:text-4xl">
          {collectionName}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-ink/60">
          クレスとともに、もっと楽しく、もっと深く。
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/animals/new" className="nc-btn">
            個体を登録
          </Link>
          <Link href="/calculator" className="nc-btn-ghost">
            遺伝計算
          </Link>
        </div>
      </HomeCard>

      <div>
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">マイ個体</h2>
          <Link href="/animals" className="text-sm text-muted underline-offset-2 hover:underline">
            すべて見る
          </Link>
        </div>
        {featured.length === 0 ? (
          <HomeCard>
            <p className="text-sm text-muted">まだ個体がありません。</p>
          </HomeCard>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {featured.map((animal) => (
              <li key={animal.id}>
                <Link
                  href={`/animals/${animal.id}`}
                  className="block overflow-hidden rounded-[1.75rem] border border-line bg-white shadow-[0_10px_28px_rgba(23,20,28,0.05)]"
                >
                  <div className="aspect-[4/3] bg-[#f6f3f8]">
                    {animal.photoUrl ? (
                      <AnimalPhoto
                        src={animal.photoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-4">
                    <p className="font-semibold">{animal.name}</p>
                    <p className="mt-1 text-sm text-muted">{displayAnimalId(animal)}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-ink/55">{morphText(animal)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">記録サマリー</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HomeStat label="飼育中の個体" value={animalCount} href="/animals" tint="bg-[#fde8ef]" />
          <HomeStat label="進行中のペア" value={activeBreedings} href="/breedings" tint="bg-[#e7f3fb]" />
          <HomeStat label="孵化待ちの卵" value={incubatingEggs} href="/breedings" tint="bg-[#ece6fb]" />
          <HomeStat label="進行中のプロジェクト" value={projectCount} href="/projects" tint="bg-[#e7f6ee]" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HomeCard>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">全国個体比較</h2>
            <Link href="/compare" className="text-sm text-muted underline-offset-2 hover:underline">
              開く
            </Link>
          </div>
          {compare ? (
            <div>
              <p className="text-sm text-muted">{compare.name}</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-ink/50">あなたの個体</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums">
                    {compare.mineWeight === null ? "—" : `${compare.mineWeight.toFixed(1)}g`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-ink/50">同条件の平均</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums">
                    {compare.average === null ? "—" : `${compare.average.toFixed(1)}g`}
                  </p>
                  <p className="mt-1 text-xs text-muted">n={compare.sampleSize}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted">{compare.tone}</p>
              <Link href={compare.href} className="nc-btn-ghost mt-4">
                この個体で比較
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted">体重を記録した個体があると、公開個体の平均と比べられます。</p>
          )}
        </HomeCard>

        <HomeCard>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">日本のクレス統計</h2>
            <Link href="/stats" className="text-sm text-muted underline-offset-2 hover:underline">
              開く
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-ink/50">公開の登録個体</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{japanRegistered}</p>
            </div>
            <div>
              <p className="text-sm text-ink/50">飼育中</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{japanLiving}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-ink/50">最新体重の平均</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {japanMeanWeight === null ? "—" : `${japanMeanWeight.toFixed(1)}g`}
          </p>
          <p className="mt-1 text-xs text-muted">n={japanWeightSample}</p>
        </HomeCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HomeCard>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">最近の記録</h2>
          {recentWeights.length === 0 ? (
            <p className="text-sm text-muted">体重記録はまだありません。</p>
          ) : (
            <ul className="divide-y divide-line">
              {recentWeights.map(({ animal, log }) => (
                <li key={log.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/animals/${animal.id}`} className="font-medium hover:underline">
                      {animal.name}
                    </Link>
                    <p className="text-sm text-muted">{log.weighedOn}</p>
                  </div>
                  <p className="text-2xl font-semibold tabular-nums">{log.weightG}g</p>
                </li>
              ))}
            </ul>
          )}
        </HomeCard>

        <HomeCard>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">近日の孵化予定</h2>
          {upcomingHatches.length === 0 ? (
            <p className="text-sm text-muted">予定日が入っている卵はありません。</p>
          ) : (
            <ul className="divide-y divide-line">
              {upcomingHatches.map(({ egg, breedingId }) => (
                <li
                  key={egg.id}
                  className="flex min-h-14 flex-wrap items-center justify-between gap-2 py-3"
                >
                  <span className="text-lg font-semibold tabular-nums">{egg.expectedHatchOn}</span>
                  <Link href={`/breedings/${breedingId}`} className="nc-btn-ghost">
                    ペアを見る
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </HomeCard>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">お迎え記念フォト</h2>
        {photoAnimals.length === 0 ? (
          <HomeCard>
            <p className="text-sm text-muted">写真が登録されている個体はありません。</p>
          </HomeCard>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photoAnimals.map((animal) => (
              <li key={animal.id}>
                <Link
                  href={`/animals/${animal.id}`}
                  className="block overflow-hidden rounded-[1.5rem] border border-line bg-white"
                >
                  <div className="aspect-square bg-[#f6f3f8]">
                    {animal.photoUrl ? (
                      <AnimalPhoto
                        src={animal.photoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <p className="truncate px-3 py-2 text-sm font-medium">{animal.name}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/calculator"
          className="rounded-[1.75rem] bg-[#ece6fb] p-6"
        >
          <h2 className="text-lg font-semibold">遺伝計算</h2>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            ペアの遺伝を計算します。
          </p>
        </Link>
        <Link href="/breedings" className="rounded-[1.75rem] bg-[#e7f6ee] p-6">
          <h2 className="text-lg font-semibold">ブリード</h2>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            ペアと卵の記録へ進みます。
          </p>
        </Link>
      </div>
    </div>
  );
}
