import Link from "next/link";
import { Card, PageHeader, SectionTitle, Stat } from "@/app/components/ui";
import { dashboardStats, getSettings } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const stats = await dashboardStats();
  const settings = await getSettings();

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        kicker="by N.crest"
        title={settings.collectionName || "クレスノート"}
        description="クレスとともに、もっと楽しく、もっと深く。"
        actions={
          <>
            <Link href="/animals/new" className="nc-btn">
              個体を登録
            </Link>
            <Link href="/calculator" className="nc-btn-ghost">
              遺伝計算
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="飼育中の個体" value={stats.animalCount} href="/animals" />
        <Stat label="進行中のペア" value={stats.activeBreedings} href="/breedings" />
        <Stat label="孵化待ちの卵" value={stats.incubatingEggs} href="/breedings" />
        <Stat label="進行中のプロジェクト" value={stats.projectCount} href="/projects" />
      </div>

      <Card>
        <SectionTitle>近日の孵化予定</SectionTitle>
        {stats.upcomingHatches.length === 0 ? (
          <p className="text-sm text-muted">予定日が入っている卵はありません。</p>
        ) : (
          <ul className="divide-y divide-line">
            {stats.upcomingHatches.map(({ egg, breedingId }) => (
              <li
                key={egg.id}
                className="flex min-h-14 flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span className="text-lg font-semibold tabular-nums">
                  {egg.expectedHatchOn}
                </span>
                <Link href={`/breedings/${breedingId}`} className="nc-btn-ghost">
                  ペアを見る
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            href: "/simulate",
            title: "ブリードシミュ",
            body: "仮想ペアで子の出方を試して保存します。",
            tone: "bg-accent",
          },
          {
            href: "/compare",
            title: "全国比較",
            body: "同条件の平均と比べて、重め・軽めを柔らかく見ます。",
            tone: "bg-mist",
          },
          {
            href: "/stats",
            title: "日本の統計",
            body: "登録データを匿名集計した成長・体重の様子です。",
            tone: "bg-blush",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-[1.5rem] border border-line bg-surface p-6 shadow-[0_12px_32px_rgba(28,25,23,0.04)] transition hover:-translate-y-0.5"
          >
            <span className={`mb-4 inline-block h-2 w-10 rounded-full ${item.tone}`} />
            <h2 className="text-lg font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
