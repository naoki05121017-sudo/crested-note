import { PairingWorkbench } from "@/app/components/pairing-workbench";
import { listAnimals, listProjects } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "遺伝計算",
};

export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialA = typeof params.a === "string" ? params.a : "";
  const initialB = typeof params.b === "string" ? params.b : "";
  const animals = (await listAnimals()).map((animal) => ({
    id: animal.id,
    name: animal.name,
    code: animal.code,
    sex: animal.sex,
    genotype: animal.genotype,
    traits: animal.traits,
    morphLabel: animal.morphLabel,
  }));
  const projects = (await listProjects()).map((project) => ({
    id: project.id,
    name: project.name,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div className="max-w-2xl">
        <p className="text-[11px] tracking-[0.22em] text-ink/40 uppercase">Genetics</p>
        <h1 className="mt-2 text-[1.85rem] font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
          遺伝計算
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          親を選ぶ → 遺伝を計算する → 子の予測を見る。セーブルなど座位に紐づく見た目は確率に含めます。ピンストライプなど多因子の見た目は確率に含めません。
        </p>
      </div>
      <PairingWorkbench
        animals={animals}
        projects={projects}
        initialA={initialA}
        initialB={initialB}
      />
    </div>
  );
}
