import { PairingWorkbench } from "@/app/components/pairing-workbench";
import { PageHeader } from "@/app/components/ui";
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
  }));
  const projects = (await listProjects()).map((project) => ({
    id: project.id,
    name: project.name,
  }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="SIMULATION"
        title="ブリードシミュレーション"
        description="親♂と親♀を選び、必要な遺伝形質を追加して子の出方を試せます。プロジェクトや予想として保存もできます。"
      />
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
