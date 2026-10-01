import { HomeDashboard } from "@/app/components/home-dashboard";
import { cadenceIdFromDays, checkReminder } from "@/lib/care/check-cadence";
import { crestCheckItemFromReminder, sortCrestCheckItems } from "@/lib/care/crest-check-list";
import { fetchCompareCohort, fetchJapanCrestStats } from "@/lib/db/stats-rpc";
import { HOME_ANIMAL_PREVIEW, HOME_CHECK_PREVIEW, HOME_PHOTO_PREVIEW } from "@/lib/db/animal-search";
import { requireAppUser } from "@/lib/auth/session";
import {
  countOwnedAnimals,
  getOwnedAnimalsByIds,
  listGenesForAnimals,
  listOwnedAnimalsPage,
  listWeightsForAnimals,
} from "@/lib/db/animal-io";
import {
  dashboardCounts,
  listOwnedCheckAnimals,
  listOwnedPhotoAnimals,
  listRecentOwnedWeights,
} from "@/lib/db/owned-tables";
import { getSettings, hydrateAnimal } from "@/lib/db/queries";
import {
  compareAgeFilterMonths,
  latestWeight,
  presentComparison,
  visualMorphKey,
} from "@/lib/stats/compare";
import { todayIso } from "@/lib/stats/math";
import type { Animal, AnimalRecord, DatabaseFile } from "@/lib/db/types";

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

export default async function Home() {
  const user = await requireAppUser();
  const [
    settings,
    preview,
    checkRecords,
    photoRecords,
    recentLogs,
    japan,
    animalCount,
    rest,
  ] = await Promise.all([
    getSettings(),
    listOwnedAnimalsPage(user.id, {
      page: 1,
      pageSize: HOME_ANIMAL_PREVIEW,
    }),
    listOwnedCheckAnimals(user.id),
    listOwnedPhotoAnimals(user.id, HOME_PHOTO_PREVIEW),
    listRecentOwnedWeights(user.id, 6),
    fetchJapanCrestStats(),
    countOwnedAnimals(user.id, { excludeDeceased: true }),
    dashboardCounts(user.id),
  ]);
  const homeRecords = [
    ...preview.records,
    ...checkRecords,
    ...photoRecords,
  ];
  const uniqueHome = [...new Map(homeRecords.map((row) => [row.id, row])).values()];
  const recentAnimalIds = recentLogs.map((row) => row.animalId);
  const neededIds = [...new Set([...uniqueHome.map((row) => row.id), ...recentAnimalIds])];
  const [extraRecords, genes, weightRows] = await Promise.all([
    getOwnedAnimalsByIds(user.id, recentAnimalIds),
    listGenesForAnimals(neededIds),
    listWeightsForAnimals(neededIds),
  ]);
  const records = [
    ...new Map([...uniqueHome, ...extraRecords].map((row) => [row.id, row])).values(),
  ];
  const animals = asAnimals(
    preview.records,
    genes.filter((gene) => preview.records.some((row) => row.id === gene.animalId)),
  );
  const allHydrated = asAnimals(records, genes);
  const byId = new Map(allHydrated.map((row) => [row.id, row]));
  const byWeights = new Map<string, typeof recentLogs>();
  for (const row of weightRows) {
    const list = byWeights.get(row.animalId) ?? [];
    list.push(row);
    byWeights.set(row.animalId, list);
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

  const compareSource = animals.find((animal) => (byWeights.get(animal.id) ?? []).length > 0) ?? allHydrated.find((animal) => (byWeights.get(animal.id) ?? []).length > 0);
  const compareLogs = compareSource ? (byWeights.get(compareSource.id) ?? []) : [];
  const cohort = compareSource
    ? await fetchCompareCohort({
        excludeAnimalId: compareSource.id,
        sex: compareSource.sex,
        morphKey: visualMorphKey(compareSource),
        ageMonths: compareAgeFilterMonths(compareSource, compareLogs),
      })
    : null;
  const comparison =
    compareSource && cohort
      ? presentComparison({
          animal: compareSource,
          logs: compareLogs,
          sampleSize: cohort.sampleSize,
          average: cohort.average,
          averageCurve: cohort.curve,
        })
      : null;

  return (
    <HomeDashboard
      collectionName={settings.collectionName || "クレスノート"}
      animalCount={animalCount}
      activeBreedings={rest.activeBreedings}
      incubatingEggs={rest.incubatingEggs}
      projectCount={rest.projectCount}
      upcomingHatches={rest.upcomingHatches}
      animals={animals}
      recentWeights={recentWeights}
      photoAnimals={photoAnimals}
      japanRegistered={japan.registered}
      japanLiving={japan.living}
      japanMeanWeight={japan.meanLatestWeight}
      japanWeightSample={japan.weightSample}
      checks={checks}
      checkTotal={allChecks.length}
      unsetCadenceGuide={unsetCadenceGuide}
      latestWeights={Object.fromEntries(
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
      )}
      compare={
        compareSource && comparison
          ? {
              name: compareSource.name,
              href: `/compare?animalId=${compareSource.id}`,
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
