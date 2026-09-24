import { PREFECTURES } from "@/lib/db/labels";
import { combinePhenotype, LOCI } from "@/lib/genetics";
import type { Animal, WeightLogRecord } from "@/lib/db/types";
import { formatDeltaGrams } from "@/lib/care/weight-growth";
import { ageInMonths, mean, todayIso, weightTone } from "./math";

/** Hide averages until the cohort is large enough to not look like a census. */
export const MIN_COHORT_FOR_AVERAGE = 5;

export function isJapanDomesticAnimal(animal: {
  prefecture?: string;
}): boolean {
  const prefecture = animal.prefecture?.trim() ?? "";
  if (!prefecture) return true;
  return (PREFECTURES as readonly string[]).includes(prefecture);
}

export function visualMorphKey(animal: Animal): string {
  const labeled = animal.morphLabel.trim().toLowerCase();
  if (labeled) return labeled;

  const copies: Record<string, 0 | 1 | 2> = {};
  for (const locus of LOCI) {
    const status = animal.genotype[locus.id] ?? "wild";
    if (status === "visual") copies[locus.id] = 2;
    else if (status === "het" && locus.inheritance === "incomplete_dominant") {
      copies[locus.id] = 1;
    } else {
      copies[locus.id] = 0;
    }
  }
  const phenotype = combinePhenotype(
    LOCI.map((locus) => ({ locus, copies: copies[locus.id] ?? 0 })),
  );
  const traits = [...animal.traits].sort().join("+");
  return traits ? `${phenotype.toLowerCase()}|${traits}` : phenotype.toLowerCase();
}

export function latestWeight(
  logs: WeightLogRecord[],
): WeightLogRecord | undefined {
  return logs
    .slice()
    .sort((a, b) => b.weighedOn.localeCompare(a.weighedOn))[0];
}

export type CohortPoint = { month: number; weightG: number };

export function growthPoints(
  animal: Animal,
  logs: WeightLogRecord[],
): CohortPoint[] {
  if (!animal.hatchDate) return [];
  return logs
    .map((log) => {
      const month = ageInMonths(animal.hatchDate, log.weighedOn);
      if (month === null) return null;
      return { month, weightG: log.weightG };
    })
    .filter((row): row is CohortPoint => row !== null)
    .sort((a, b) => a.month - b.month);
}

export function averageCurve(series: CohortPoint[][]): CohortPoint[] {
  const buckets = new Map<number, number[]>();
  for (const line of series) {
    for (const point of line) {
      const list = buckets.get(point.month) ?? [];
      list.push(point.weightG);
      buckets.set(point.month, list);
    }
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([month, weights]) => ({
      month,
      weightG: mean(weights) ?? 0,
    }));
}

export function compareAnimal(options: {
  animal: Animal;
  logs: WeightLogRecord[];
  others: { animal: Animal; logs: WeightLogRecord[] }[];
}) {
  const asOf = todayIso();
  const mine = latestWeight(options.logs);
  const myAge = mine
    ? ageInMonths(options.animal.hatchDate, mine.weighedOn)
    : ageInMonths(options.animal.hatchDate, asOf);
  const morph = visualMorphKey(options.animal);

  const cohort = options.others.filter(({ animal, logs }) => {
    if (animal.id === options.animal.id) return false;
    if (!isJapanDomesticAnimal(animal)) return false;
    if (animal.sex !== options.animal.sex) return false;
    if (visualMorphKey(animal) !== morph) return false;
    const otherLatest = latestWeight(logs);
    if (!otherLatest || !mine || myAge === null) return Boolean(otherLatest);
    const otherAge = ageInMonths(animal.hatchDate, otherLatest.weighedOn);
    if (otherAge === null) return false;
    return Math.abs(otherAge - myAge) <= 3;
  });

  const cohortWeights = cohort
    .map(({ logs }) => latestWeight(logs)?.weightG)
    .filter((value): value is number => typeof value === "number");
  const sampleSize = cohortWeights.length;
  const comparable = sampleSize >= MIN_COHORT_FOR_AVERAGE;
  const average = comparable ? mean(cohortWeights) : null;
  const mineWeight = mine?.weightG ?? null;
  const diff =
    mineWeight !== null && average !== null ? mineWeight - average : null;

  return {
    morph,
    ageMonths: myAge,
    mineWeight,
    average,
    diff,
    sampleSize,
    comparable,
    vsAverage:
      diff === null ? null : `平均より${formatDeltaGrams(diff)}`,
    tone:
      diff !== null && average !== null
        ? weightTone(diff, average)
        : comparable
          ? "比較できません"
          : "近い条件の公開データがまだ少ないので、平均は出していません。",
    mineCurve: growthPoints(options.animal, options.logs),
    averageCurve: comparable
      ? averageCurve(
          cohort.map(({ animal, logs }) => growthPoints(animal, logs)),
        )
      : [],
  };
}
