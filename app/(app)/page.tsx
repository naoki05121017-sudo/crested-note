import { Suspense } from "react";
import {
  HomeBelowFoldFallback,
  HomeBreedingBlock,
  HomeCareAlbumBlocks,
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
  listGenesForAnimals,
  listLatestWeightsForAnimals,
  listOwnedAnimalsPage,
} from "@/lib/db/animal-io";
import {
  dashboardCounts,
  listOwnedCheckAnimals,
  listOwnedPhotoAnimals,
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

async function loadHomeHero(userId: string) {
  const preview = await listOwnedAnimalsPage(userId, {
    page: 1,
    pageSize: HOME_ANIMAL_PREVIEW,
  });
  const previewIds = preview.records.map((row) => row.id);
  const [homeGenes, weightRows] = await Promise.all([
    listGenesForAnimals(previewIds),
    listLatestWeightsForAnimals(previewIds),
  ]);
  const animals = asAnimals(preview.records, homeGenes);
  const byId = new Map(animals.map((row) => [row.id, row]));
  const byWeights = new Map<string, WeightLogRecord[]>();
  for (const row of weightRows) {
    byWeights.set(row.animalId, [row]);
  }
  const recentWeights = weightRows
    .slice()
    .sort((a, b) => b.weighedOn.localeCompare(a.weighedOn))
    .flatMap((log) => {
      const animal = byId.get(log.animalId);
      return animal ? [{ animal, log }] : [];
    });
  const compareAnimal = animals.find((animal) => (byWeights.get(animal.id) ?? []).length > 0);

  return {
    animals,
    previewRecords: preview.records,
    recentWeights,
    latestWeights: Object.fromEntries(
      animals.map((animal) => {
        const last = latestWeight(byWeights.get(animal.id) ?? []);
        return [
          animal.id,
          last ? { weightG: last.weightG, weighedOn: last.weighedOn } : null,
        ];
      }),
    ),
    compareSource: compareAnimal
      ? { animal: compareAnimal, logs: byWeights.get(compareAnimal.id) ?? [] }
      : null,
  };
}

async function HomeCareAlbumSection({
  userId,
  previewRecords,
  heroLatest,
}: {
  userId: string;
  previewRecords: AnimalRecord[];
  heroLatest: Record<string, { weightG: number; weighedOn: string } | null>;
}) {
  const [checkRecords, photoRecords] = await Promise.all([
    listOwnedCheckAnimals(userId),
    listOwnedPhotoAnimals(userId, HOME_PHOTO_PREVIEW),
  ]);
  const extraIds = [
    ...new Set(
      [...checkRecords, ...photoRecords]
        .map((row) => row.id)
        .filter((id) => !previewRecords.some((row) => row.id === id)),
    ),
  ];
  const extraWeights = extraIds.length ? await listLatestWeightsForAnimals(extraIds) : [];
  const byWeights = new Map<string, WeightLogRecord[]>();
  for (const [animalId, last] of Object.entries(heroLatest)) {
    if (last) {
      byWeights.set(animalId, [
        {
          id: `${animalId}-latest`,
          animalId,
          weighedOn: last.weighedOn,
          weightG: last.weightG,
          notes: "",
        },
      ]);
    }
  }
  for (const row of extraWeights) {
    byWeights.set(row.animalId, [row]);
  }
  const photoAnimals = photoRecords.map((row) => ({
    id: row.id,
    name: row.name,
    photoUrl: row.photoUrl,
  }));
  const asOf = todayIso();
  const allChecks = sortCrestCheckItems(
    checkRecords.flatMap((animal) => {
      const reminder = checkReminder({
        checkEveryDays: animal.checkEveryDays,
        lastWeighedOn: latestWeight(byWeights.get(animal.id) ?? [])?.weighedOn,
        asOf,
      });
      return reminder ? [crestCheckItemFromReminder(animal, reminder)] : [];
    }),
  );
  const records = [
    ...new Map([...previewRecords, ...checkRecords, ...photoRecords].map((row) => [row.id, row])).values(),
  ];
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
  const latestWeights: Record<string, { weightG: number; weighedOn: string } | null> = {
    ...heroLatest,
  };
  for (const row of extraWeights) {
    latestWeights[row.animalId] = { weightG: row.weightG, weighedOn: row.weighedOn };
  }

  return (
    <HomeCareAlbumBlocks
      photoAnimals={photoAnimals}
      checks={allChecks.slice(0, HOME_CHECK_PREVIEW)}
      checkTotal={allChecks.length}
      unsetCadenceGuide={unsetCadenceGuide}
      latestWeights={latestWeights}
    />
  );
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
  const hero = await loadHomeHero(user.id);
  return (
    <HomeDashboard
      collectionName="クレスノート"
      animalCount={0}
      animals={hero.animals}
      recentWeights={hero.recentWeights}
      latestWeights={hero.latestWeights}
      careAlbumSection={
        <Suspense fallback={<HomeBelowFoldFallback />}>
          <HomeCareAlbumSection
            userId={user.id}
            previewRecords={hero.previewRecords}
            heroLatest={hero.latestWeights}
          />
        </Suspense>
      }
      japanSection={
        <Suspense fallback={<HomeJapanFallback />}>
          <HomeJapanSection japanPromise={japanPromise} compareSource={hero.compareSource} />
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
