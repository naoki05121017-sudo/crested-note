import { Suspense } from "react";
import {
  HomeBreedingBlock,
  HomeDashboard,
  HomeJapanBlock,
  HomeJapanFallback,
} from "@/app/components/home-dashboard";
import { cadenceIdFromDays, checkReminder } from "@/lib/care/check-cadence";
import { crestCheckItemFromReminder, sortCrestCheckItems } from "@/lib/care/crest-check-list";
import { fetchCompareCohort, fetchJapanCrestStats } from "@/lib/db/stats-rpc";
import { HOME_ANIMAL_PREVIEW, HOME_CHECK_PREVIEW, HOME_PHOTO_PREVIEW } from "@/lib/db/animal-search";
import { requireAppUser } from "@/lib/auth/session";
import {
  getOwnedAnimalsByIds,
  listGenesForAnimals,
  listLatestWeightsForAnimals,
  listOwnedAnimalsPage,
} from "@/lib/db/animal-io";
import {
  dashboardCounts,
  listOwnedCheckAnimals,
  listOwnedPhotoAnimals,
  listRecentOwnedWeights,
} from "@/lib/db/owned-tables";
import { hydrateAnimal } from "@/lib/db/queries";
import {
  compareAgeFilterMonths,
  latestWeight,
  presentComparison,
  visualMorphKey,
} from "@/lib/stats/compare";
import { todayIso } from "@/lib/stats/math";
import type { Animal, AnimalRecord, DatabaseFile, WeightLogRecord } from "@/lib/db/types";

export const dynamic = "force-dynamic";

function emptyGeneDb(records: AnimalRecord[], genes: DatabaseFile["genes"]): DatabaseFile {
  return {
    animals: records,
    genes,
    weights: [],
    breedings: [],
    clutches: [],
    eggs: [],
    projects: [],
    projectMembers: [],
    predictions: [],
    settings: {
      displayName: "",
      collectionName: "",
      prefecture: "",
      publicByDefault: false,
    },
    feedback: [],
    crestLinkSeq: 0,
    animalCodeSeq: 0,
    crestLinks: [],
    crestLinkTransfers: [],
  };
}

function asAnimals(records: AnimalRecord[], genes: DatabaseFile["genes"]): Animal[] {
  const db = emptyGeneDb(records, genes);
  return records.map((record) => hydrateAnimal(db, record));
}

type HomeCompareSource = {
  animal: Animal;
  logs: WeightLogRecord[];
} | null;

async function loadHomePrimary(userId: string) {
  const recentPromise = listRecentOwnedWeights(userId, 6);
  const [preview, checkRecords, photoRecords] = await Promise.all([
    listOwnedAnimalsPage(userId, {
      page: 1,
      pageSize: HOME_ANIMAL_PREVIEW,
    }),
    listOwnedCheckAnimals(userId),
    listOwnedPhotoAnimals(userId, HOME_PHOTO_PREVIEW),
  ]);
  const homeRecords = [
    ...preview.records,
    ...checkRecords,
    ...photoRecords,
  ];
  const uniqueHome = [...new Map(homeRecords.map((row) => [row.id, row])).values()];
  const homeIds = uniqueHome.map((row) => row.id);
  const [homeGenes, weightRows, recentLogs] = await Promise.all([
    listGenesForAnimals(homeIds),
    listLatestWeightsForAnimals(homeIds),
    recentPromise,
  ]);
  const known = new Set(homeIds);
  const extraIds = [...new Set(recentLogs.map((row) => row.animalId).filter((id) => !known.has(id)))];
  const [extraRecords, extraGenes] = extraIds.length
    ? await Promise.all([
        getOwnedAnimalsByIds(userId, extraIds),
        listGenesForAnimals(extraIds),
      ])
    : [[], [] as typeof homeGenes];
  const genes = [...homeGenes, ...extraGenes];
  const records = [
    ...new Map([...uniqueHome, ...extraRecords].map((row) => [row.id, row])).values(),
  ];
  const animals = asAnimals(
    preview.records,
    genes.filter((gene) => preview.records.some((row) => row.id === gene.animalId)),
  );
  const allHydrated = asAnimals(records, genes);
  const byId = new Map(allHydrated.map((row) => [row.id, row]));
  const byWeights = new Map<string, WeightLogRecord[]>();
  for (const row of weightRows) {
    byWeights.set(row.animalId, [row]);
  }
  for (const row of recentLogs) {
    const current = byWeights.get(row.animalId);
    if (!current) {
      byWeights.set(row.animalId, [row]);
      continue;
    }
    if (row.weighedOn.localeCompare(current[0]?.weighedOn ?? "") > 0) {
      byWeights.set(row.animalId, [row]);
    }
  }
  const asOf = todayIso();

  const recentWeights = recentLogs.flatMap((log) => {
    const animal = byId.get(log.animalId);
    return animal ? [{ animal, log }] : [];
  });
  const photoAnimals = asAnimals(
    photoRecords,
    genes.filter((gene) => photoRecords.some((row) => row.id === gene.animalId)),
  );
  const checkAnimals = asAnimals(
    checkRecords,
    genes.filter((gene) => checkRecords.some((row) => row.id === gene.animalId)),
  );
  const allChecks = sortCrestCheckItems(
    checkAnimals.flatMap((animal) => {
      const reminder = checkReminder({
        checkEveryDays: animal.checkEveryDays,
        lastWeighedOn: latestWeight(byWeights.get(animal.id) ?? [])?.weighedOn,
        asOf,
      });
      return reminder ? [crestCheckItemFromReminder(animal, reminder)] : [];
    }),
  );
  const checks = allChecks.slice(0, HOME_CHECK_PREVIEW);
  const unsetCadence = records.filter(
    (row) =>
      cadenceIdFromDays(row.checkEveryDays) === "unset" &&
      row.status !== "sold" &&
      row.status !== "deceased",
  );
  const unsetCadenceGuide =
    unsetCadence[0]
      ? {
          id: unsetCadence[0].id,
          name: unsetCadence[0].name,
          more: unsetCadence.length - 1,
        }
      : null;

  const compareAnimal =
    animals.find((animal) => (byWeights.get(animal.id) ?? []).length > 0) ??
    allHydrated.find((animal) => (byWeights.get(animal.id) ?? []).length > 0);
  const compareSource: HomeCompareSource = compareAnimal
    ? { animal: compareAnimal, logs: byWeights.get(compareAnimal.id) ?? [] }
    : null;

  return {
    animals,
    recentWeights,
    photoAnimals,
    checks,
    checkTotal: allChecks.length,
    unsetCadenceGuide,
    latestWeights: Object.fromEntries(
      [...new Map([...animals, ...photoAnimals].map((animal) => [animal.id, animal])).values()].map(
        (animal) => {
          const last = latestWeight(byWeights.get(animal.id) ?? []);
          return [
            animal.id,
            last
              ? { weightG: last.weightG, weighedOn: last.weighedOn }
              : null,
          ];
        },
      ),
    ),
    compareSource,
  };
}

async function HomeJapanSection({
  japanPromise,
  compareSource,
}: {
  japanPromise: ReturnType<typeof fetchJapanCrestStats>;
  compareSource: HomeCompareSource;
}) {
  const [japan, cohort] = await Promise.all([
    japanPromise,
    compareSource
      ? fetchCompareCohort({
          excludeAnimalId: compareSource.animal.id,
          sex: compareSource.animal.sex,
          morphKey: visualMorphKey(compareSource.animal),
          ageMonths: compareAgeFilterMonths(compareSource.animal, compareSource.logs),
        })
      : Promise.resolve(null),
  ]);
  const comparison =
    compareSource && cohort
      ? presentComparison({
          animal: compareSource.animal,
          logs: compareSource.logs,
          sampleSize: cohort.sampleSize,
          average: cohort.average,
          averageCurve: cohort.curve,
        })
      : null;
  return (
    <HomeJapanBlock
      japanRegistered={japan.registered}
      japanLiving={japan.living}
      japanMeanWeight={japan.meanLatestWeight}
      japanWeightSample={japan.weightSample}
      compare={
        compareSource && comparison
          ? {
              name: compareSource.animal.name,
              href: `/compare?animalId=${compareSource.animal.id}`,
              mineWeight: comparison.mineWeight,
              average: comparison.average,
              sampleSize: comparison.sampleSize,
              comparable: comparison.comparable,
              vsAverage: comparison.vsAverage,
              tone: comparison.tone,
            }
          : null
      }
    />
  );
}

async function HomeBreedingSection({
  countsPromise,
}: {
  countsPromise: ReturnType<typeof dashboardCounts>;
}) {
  const rest = await countsPromise;
  return (
    <HomeBreedingBlock
      activeBreedings={rest.activeBreedings}
      incubatingEggs={rest.incubatingEggs}
      projectCount={rest.projectCount}
      upcomingHatches={rest.upcomingHatches}
    />
  );
}

export default async function Home() {
  const user = await requireAppUser();
  const japanPromise = fetchJapanCrestStats();
  const countsPromise = dashboardCounts(user.id);
  const primary = await loadHomePrimary(user.id);

  return (
    <HomeDashboard
      collectionName="クレスノート"
      animalCount={0}
      animals={primary.animals}
      recentWeights={primary.recentWeights}
      photoAnimals={primary.photoAnimals}
      checks={primary.checks}
      checkTotal={primary.checkTotal}
      unsetCadenceGuide={primary.unsetCadenceGuide}
      latestWeights={primary.latestWeights}
      japanSection={
        <Suspense fallback={<HomeJapanFallback />}>
          <HomeJapanSection japanPromise={japanPromise} compareSource={primary.compareSource} />
        </Suspense>
      }
      breedingSection={
        <Suspense fallback={null}>
          <HomeBreedingSection countsPromise={countsPromise} />
        </Suspense>
      }
    />
  );
}
