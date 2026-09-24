import { PairingWorkbench } from "@/app/components/pairing-workbench";
import { listAnimals, listProjects } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "ブリードシミュレーション" };

export default async function SimulatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
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
      <div className="nc-hero">
        <p className="nc-hero-kicker text-[11px] tracking-[0.22em] uppercase">Simulation</p>
        <h1 className="nc-hero-title mt-2 text-[1.85rem] font-semibold leading-tight tracking-tight sm:text-4xl">
          ブリードシミュレーション
        </h1>
        <p className="nc-hero-copy mt-3 max-w-2xl text-sm leading-7">
          親♂と親♀を選び、必要な遺伝形質を追加して子の出方を試せます。プロジェクトや予想として保存もできます。
        </p>
      </div>
      <PairingWorkbench
        animals={animals}
        projects={projects}
        initialA={typeof params.a === "string" ? params.a : ""}
        initialB={typeof params.b === "string" ? params.b : ""}
        saveLabel="シミュレーションとして保存"
      />
    </div>
  );
}
