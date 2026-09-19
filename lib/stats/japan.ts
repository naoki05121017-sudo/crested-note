import { formatGenotypeLabel } from "@/lib/genetics";
import { SEX_LABEL } from "@/lib/db/labels";
import type { Animal, WeightLogRecord } from "@/lib/db/types";
import { visualMorphKey, latestWeight } from "./compare";
import { AGE_BUCKETS, ageInMonths, mean, todayIso } from "./math";

export function japanStats(
  animals: Animal[],
  weightsByAnimal: Map<string, WeightLogRecord[]>,
) {
  const living = animals.filter((animal) => animal.status !== "deceased");
  const asOf = todayIso();

  const bySex = {
    male: living.filter((animal) => animal.sex === "male").length,
    female: living.filter((animal) => animal.sex === "female").length,
    unknown: living.filter((animal) => animal.sex === "unknown").length,
  };

  const morphCounts = new Map<string, number>();
  for (const animal of living) {
    const key = visualMorphKey(animal);
    morphCounts.set(key, (morphCounts.get(key) ?? 0) + 1);
  }

  const latestWeights = living
    .map((animal) => latestWeight(weightsByAnimal.get(animal.id) ?? []))
    .filter((row): row is WeightLogRecord => Boolean(row));

  const buckets = AGE_BUCKETS.map((bucket) => {
    const values: number[] = [];
    for (const animal of living) {
      const log = latestWeight(weightsByAnimal.get(animal.id) ?? []);
      if (!log) continue;
      const age = ageInMonths(animal.hatchDate, log.weighedOn);
      if (age === null || age < bucket.min || age >= bucket.max) continue;
      values.push(log.weightG);
    }
    return {
      id: bucket.id,
      label: bucket.label,
      n: values.length,
      average: mean(values),
    };
  });

  const hatchYears = new Map<string, number>();
  for (const animal of living) {
    if (!animal.hatchDate) continue;
    const year = animal.hatchDate.slice(0, 4);
    hatchYears.set(year, (hatchYears.get(year) ?? 0) + 1);
  }

  return {
    registered: animals.length,
    living: living.length,
    publicCount: animals.filter((animal) => animal.isPublic).length,
    bySex,
    morphs: [...morphCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    meanLatestWeight: mean(latestWeights.map((row) => row.weightG)),
    weightSample: latestWeights.length,
    buckets,
    hatchYears: [...hatchYears.entries()]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year.localeCompare(b.year)),
    sexLabels: SEX_LABEL,
    asOf,
    sampleNote:
      "日本国内のクレスノートに蓄積されたデータを、モルフ・性別・月齢・体重などの傾向として見ます。全国の全頭数や全飼育者のデータではありません。件数が少ない項目は参考値です。",
  };
}

export function anonymousAnimalLabel(animal: Animal): string {
  return formatGenotypeLabel(animal.genotype);
}
