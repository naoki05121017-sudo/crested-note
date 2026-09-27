import Link from "next/link";
import { Dela_Gothic_One } from "next/font/google";
import { AnimalPhoto } from "@/app/components/animal-photo";
import { CrestPhoto, TitleCrown } from "@/app/components/crest-photo";
import { IncludedFeatures } from "@/app/components/included-features";
import { displayAnimalId } from "@/lib/db/animal-code";
import { SEX_LABEL } from "@/lib/db/labels";
import { formatGenotypeLabel } from "@/lib/genetics";
import type { Animal, WeightLogRecord } from "@/lib/db/types";

const crestTitle = Dela_Gothic_One({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
});

function HomeCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`nc-lift rounded-[2rem] border-transparent bg-gradient-to-br from-[#fff8fb] via-[#f7f2f8] to-[#eef6fb] p-5 text-ink sm:p-6 ${className}`}
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
      className={`nc-lift block rounded-[2rem] p-5 text-ink ${tint}`}
    >
      <p className="text-sm text-ink/60">{label}</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
        {value}
      </p>
    </Link>
  );
}

function AnimalHomeCard({
  animal,
  latest,
  hero = false,
}: {
  animal: Animal;
  latest: { weightG: number; weighedOn: string } | null;
  hero?: boolean;
}) {
  return (
    <Link
      href={`/animals/${animal.id}`}
      className="nc-lift block overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#fff8fb] to-[#eef6fb] text-ink"
    >
      <div className={hero ? "aspect-[4/5] bg-[#f6f3f8] sm:aspect-[5/4]" : "aspect-[4/5] bg-[#f6f3f8] sm:aspect-[4/3]"}>
        {animal.photoUrl ? (
          <AnimalPhoto
            src={animal.photoUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className={hero ? "p-5 sm:p-6" : "p-4 sm:p-5"}>
        <p className={hero ? "text-2xl font-semibold tracking-tight" : "text-lg font-semibold tracking-tight"}>
          {animal.name}
        </p>
        <p className="mt-1 text-sm text-muted">{displayAnimalId(animal)}</p>
        <p className="mt-1 text-sm text-ink/60">
          {SEX_LABEL[animal.sex]}
          {" / "}
          {animal.morphLabel.trim() || formatGenotypeLabel(animal.genotype) || "モルフ未設定"}
        </p>
        <p
          className={`mt-3 font-semibold tabular-nums ${
            hero ? "text-[2.1rem] sm:text-5xl" : "text-3xl"
          }`}
        >
          {latest ? `${latest.weightG}g` : "体重未記録"}
        </p>
        <p className="mt-1 text-sm text-muted">
          {latest ? latest.weighedOn : "タップして記録する"}
        </p>
      </div>
    </Link>
  );
}

export function HomeDashboard({
  collectionName: _collectionName,
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
  checks,
  latestWeights,
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
  checks: {
    id: string;
    name: string;
    due: boolean;
    headline: string;
    body: string;
  }[];
  latestWeights: Record<string, { weightG: number; weighedOn: string } | null>;
  compare: {
    name: string;
    href: string;
    mineWeight: number | null;
    average: number | null;
    sampleSize: number;
    comparable: boolean;
    vsAverage: string | null;
    tone: string;
  } | null;
}) {
  const star = animals[0];
  const rest = animals.slice(1, 6);

  return (
    <div className="flex flex-col gap-12 sm:gap-14">
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
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link href="/animals/new" className="nc-btn w-full sm:w-auto">
              個体を登録
            </Link>
            <Link href="/animals" className="nc-btn-ghost w-full sm:w-auto">
              マイ個体を見る
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-3">
          <h2 className="text-[1.7rem] font-semibold leading-tight tracking-tight sm:text-3xl">
            マイ個体
          </h2>
          <Link href="/animals" className="text-sm text-white/50 underline-offset-2 hover:underline">
            すべて見る
          </Link>
        </div>
        {!star ? (
          <HomeCard>
            <p className="text-base leading-7 text-muted">
              まだ個体がありません。登録すると、写真・体重・成長を残せます。
            </p>
          </HomeCard>
        ) : (
          <div className="flex flex-col gap-5">
            <AnimalHomeCard
              animal={star}
              latest={latestWeights[star.id]}
              hero
            />
            {rest.length > 0 && (
              <ul className="grid gap-5 sm:grid-cols-2">
                {rest.map((animal) => (
                  <li key={animal.id}>
                    <AnimalHomeCard animal={animal} latest={latestWeights[animal.id]} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {checks.length > 0 && (
        <HomeCard className="border-transparent bg-[#fff6e8]">
          <h2 className="mb-4 text-xl font-semibold tracking-tight">クレスチェック</h2>
          <ul className="divide-y divide-line">
            {checks.map((item) => (
              <li key={item.id} className="py-3">
                <Link href={`/animals/${item.id}`} className="block">
                  <p className="font-semibold">{item.name}</p>
                  <p className="mt-1 text-sm text-ink/80">{item.headline}</p>
                  <p className="mt-1 text-sm text-muted">{item.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        </HomeCard>
      )}

      <HomeStat label="飼育中の個体" value={animalCount} href="/animals" tint="bg-[#fde8ef]" />

      <section className="flex flex-col gap-5">
        <h2 className="text-[1.7rem] font-semibold leading-tight tracking-tight sm:text-3xl">
          成長
        </h2>
        <HomeCard>
          <h3 className="mb-4 text-lg font-semibold tracking-tight">最新の体重</h3>
          {recentWeights.length === 0 ? (
            <p className="text-base leading-7 text-muted">
              体重を記録すると、ここに成長が並びます。
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {recentWeights.map(({ animal, log }) => (
                <li key={log.id} className="flex items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <Link href={`/animals/${animal.id}`} className="text-lg font-medium hover:underline">
                      {animal.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted">{log.weighedOn}</p>
                  </div>
                  <p className="text-3xl font-semibold tabular-nums sm:text-4xl">{log.weightG}g</p>
                </li>
              ))}
            </ul>
          )}
        </HomeCard>
        <HomeCard>
          <div className="mb-5 flex items-end justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-tight">成長アルバム</h3>
            <Link href="/animals" className="text-sm text-ink/40 underline-offset-2 hover:underline">
              すべて
            </Link>
          </div>
          {photoAnimals.length === 0 ? (
            <p className="text-base leading-7 text-muted">写真を登録すると、ここに並びます。</p>
          ) : (
            <ul className="grid gap-4">
              {photoAnimals.slice(0, 4).map((animal) => (
                <li key={animal.id}>
                  <Link
                    href={`/animals/${animal.id}`}
                    className="block overflow-hidden rounded-[1.75rem] bg-[#f6f3f8]"
                  >
                    <div className="aspect-[4/5] sm:aspect-[16/10]">
                      {animal.photoUrl ? (
                        <AnimalPhoto
                          src={animal.photoUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <p className="px-4 py-3 text-base font-medium">{animal.name}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </HomeCard>
      </section>

      <HomeCard className="border-transparent bg-[#e7f3fb]">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">全国個体比較</h2>
          <Link href="/compare" className="text-sm text-ink/40 underline-offset-2 hover:underline">
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
                  {compare.comparable && compare.average !== null
                    ? `${compare.average.toFixed(1)}g`
                    : "—"}
                </p>
                {compare.comparable && (
                  <>
                    <p className="mt-1 text-sm text-ink/80">{compare.vsAverage}</p>
                    <p className="mt-1 text-xs text-muted">n={compare.sampleSize}</p>
                  </>
                )}
              </div>
            </div>
            <p className="mt-3 text-sm text-muted">{compare.tone}</p>
            <Link href={compare.href} className="nc-btn mt-4">
              この個体で比較
            </Link>
          </div>
        ) : (
          <p className="text-base leading-7 text-muted">
            体重を記録した個体があると、近い条件の平均と比べられます。
          </p>
        )}
      </HomeCard>

      <HomeCard className="border-transparent bg-[#eef6f1]">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">日本のクレス統計</h2>
          <Link href="/stats" className="text-sm text-ink/40 underline-offset-2 hover:underline">
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
        {japanMeanWeight === null ? (
          <>
            <p className="mt-1 text-lg font-semibold">まだ平均は出していません</p>
            <p className="mt-1 text-xs text-muted">
              公開の体重データが揃うまで、断定的な数字は出しません（n={japanWeightSample}）
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {`${japanMeanWeight.toFixed(1)}g`}
            </p>
            <p className="mt-1 text-xs text-muted">n={japanWeightSample}</p>
          </>
        )}
      </HomeCard>

      <section className="flex flex-col gap-5">
        <h2 className="text-lg font-semibold tracking-tight text-white/80">
          遺伝計算・ブリード
        </h2>
        <p className="text-sm leading-6 text-white/45">
          ペアリングや卵の記録が必要なときだけ使います。
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <HomeStat label="進行中のペア" value={activeBreedings} href="/breedings" tint="bg-[#e7f3fb]" />
          <HomeStat label="孵化待ちの卵" value={incubatingEggs} href="/breedings" tint="bg-[#ece6fb]" />
          <HomeStat label="進行中のプロジェクト" value={projectCount} href="/projects" tint="bg-[#e7f6ee]" />
        </div>
        <HomeCard className="border-transparent bg-[#e7f3fb]">
          <h3 className="mb-4 text-lg font-semibold tracking-tight">近日の孵化予定</h3>
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
        <div className="grid gap-3">
          <Link href="/calculator" className="nc-lift block rounded-[1.75rem] bg-[#ece6fb]/90 p-5 text-ink">
            <h3 className="font-semibold">遺伝計算</h3>
            <p className="mt-1 text-sm leading-6 text-ink/60">ペアの遺伝を計算します。</p>
          </Link>
          <Link href="/simulate" className="nc-lift block rounded-[1.75rem] bg-[#fde8ef]/90 p-5 text-ink">
            <h3 className="font-semibold">シミュレーション</h3>
            <p className="mt-1 text-sm leading-6 text-ink/60">複数世代の遺伝を見ます。</p>
          </Link>
          <Link href="/breedings" className="nc-lift block rounded-[1.75rem] bg-[#e7f6ee]/90 p-5 text-ink">
            <h3 className="font-semibold">ブリード</h3>
            <p className="mt-1 text-sm leading-6 text-ink/60">ペアと卵の記録へ進みます。</p>
          </Link>
        </div>
      </section>

      <HomeCard className="opacity-90">
        <IncludedFeatures compact />
      </HomeCard>
    </div>
  );
}
