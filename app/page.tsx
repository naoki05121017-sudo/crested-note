import { HomeDashboard } from "@/app/components/home-dashboard";
import {
  dashboardStats,
  getSettings,
  listAnimals,
  listPublicAnimals,
  publicWeightsByAnimal,
  weightsByAnimal,
} from "@/lib/db/queries";
import { compareAnimal } from "@/lib/stats/compare";
import { japanStats } from "@/lib/stats/japan";

export const dynamic = "force-dynamic";

export default async function Home() {
  const stats = await dashboardStats();
  const settings = await getSettings();
  const animals = await listAnimals();
  const byWeights = await weightsByAnimal();
  const publicAnimals = await listPublicAnimals();
  const publicWeights = await publicWeightsByAnimal();
  const japan = japanStats(publicAnimals, publicWeights);

  const recentWeights = animals
    .flatMap((animal) =>
      (byWeights.get(animal.id) ?? []).map((log) => ({ animal, log })),
    )
    .sort((a, b) => b.log.weighedOn.localeCompare(a.log.weighedOn))
    .slice(0, 6);

  const photoAnimals = animals.filter((animal) => animal.photoUrl).slice(0, 8);

  const compareSource = animals.find((animal) => (byWeights.get(animal.id) ?? []).length > 0);
  const comparison = compareSource
    ? compareAnimal({
        animal: compareSource,
        logs: byWeights.get(compareSource.id) ?? [],
        others: publicAnimals.map((row) => ({
          animal: row,
          logs: publicWeights.get(row.id) ?? [],
        })),
      })
    : null;

  return (
    <HomeDashboard
      collectionName={settings.collectionName || "クレスノート"}
      animalCount={stats.animalCount}
      activeBreedings={stats.activeBreedings}
      incubatingEggs={stats.incubatingEggs}
      projectCount={stats.projectCount}
      upcomingHatches={stats.upcomingHatches}
      animals={animals}
      recentWeights={recentWeights}
      photoAnimals={photoAnimals}
      japanRegistered={japan.registered}
      japanLiving={japan.living}
      japanMeanWeight={japan.meanLatestWeight}
      japanWeightSample={japan.weightSample}
      compare={
        compareSource && comparison
          ? {
              name: compareSource.name,
              href: `/compare?animalId=${compareSource.id}`,
              mineWeight: comparison.mineWeight,
              average: comparison.average,
              sampleSize: comparison.sampleSize,
              tone: comparison.tone,
            }
          : null
      }
    />
  );
}
