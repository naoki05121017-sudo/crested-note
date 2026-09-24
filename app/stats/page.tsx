import { Card, PageHeader, SectionTitle, Stat } from "@/app/components/ui";
import { listPublicAnimals, publicWeightsByAnimal } from "@/lib/db/queries";
import { japanStats } from "@/lib/stats/japan";

export const dynamic = "force-dynamic";
export const metadata = { title: "日本のクレス統計" };

export default async function StatsPage() {
  const stats = japanStats(await listPublicAnimals(), await publicWeightsByAnimal());

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="JAPAN"
        title="日本のクレス統計"
        description={stats.sampleNote}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="登録個体" value={stats.registered} tone="ink" />
        <Stat label="飼育中" value={stats.living} tone="blush" />
        <Stat
          label="最新体重の平均"
          value={
            stats.meanLatestWeight === null
              ? "—"
              : `${stats.meanLatestWeight.toFixed(1)}g`
          }
          hint={`n=${stats.weightSample}`}
          tone="mist"
        />
      </div>

      <Card>
        <SectionTitle>性別</SectionTitle>
        <ul className="grid gap-3 text-sm sm:grid-cols-3">
          <li className="rounded-2xl bg-mist px-4 py-4">
            <p className="text-muted">オス</p>
            <p className="mt-1 text-3xl font-semibold">{stats.bySex.male}</p>
          </li>
          <li className="rounded-2xl bg-blush px-4 py-4">
            <p className="text-muted">メス</p>
            <p className="mt-1 text-3xl font-semibold">{stats.bySex.female}</p>
          </li>
          <li className="rounded-2xl bg-sand px-4 py-4">
            <p className="text-muted">不明</p>
            <p className="mt-1 text-3xl font-semibold">{stats.bySex.unknown}</p>
          </li>
        </ul>
      </Card>

      <Card>
        <SectionTitle>月齢別の平均体重</SectionTitle>
        <ul className="divide-y divide-line text-sm">
          {stats.buckets.map((bucket) => (
            <li key={bucket.id} className="flex items-center justify-between py-4">
              <span>{bucket.label}</span>
              <span className="text-2xl font-semibold tabular-nums">
                {bucket.average === null ? "—" : `${bucket.average.toFixed(1)}g`}
                <span className="ml-2 text-sm font-normal text-muted">n={bucket.n}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card tone="lilac">
        <SectionTitle>モルフの内訳</SectionTitle>
        {stats.morphs.length === 0 ? (
          <p className="text-sm text-muted">まだ集計できる個体がありません。</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {stats.morphs.map((row) => (
              <li key={row.label} className="flex justify-between py-3">
                <span>{row.label}</span>
                <span className="text-lg font-semibold">{row.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
