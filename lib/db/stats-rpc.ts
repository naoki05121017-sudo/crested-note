import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { retryOnJwtIssuedAtFuture } from "@/lib/supabase/clock-skew-fetch";
import { MIN_COHORT_FOR_AVERAGE, type CohortPoint } from "@/lib/stats/compare";

export type JapanCrestStatsPayload = {
  registered: number;
  living: number;
  bySex: { male: number; female: number; unknown: number };
  morphs: { label: string; count: number }[];
  meanLatestWeight: number | null;
  weightSample: number;
  buckets: { id: string; label: string; n: number; average: number | null }[];
  hatchYears: { year: string; count: number }[];
};

export type CompareCohortPayload = {
  sampleSize: number;
  average: number | null;
  curve: CohortPoint[];
};

export type GrowthGuideMonthPayload = {
  month: number;
  sampleSize: number;
  averageWeight: number | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function requireInt(value: unknown, label: string): number {
  const n = asFiniteNumber(value);
  if (n === null || !Number.isInteger(n) || n < 0) {
    throw new Error(`${label} の集計を読めません。`);
  }
  return n;
}

export function parseJapanCrestStats(raw: unknown): JapanCrestStatsPayload {
  const row = asRecord(raw);
  if (!row) throw new Error("日本のクレス統計を取得できません。");
  const bySex = asRecord(row.bySex);
  if (!bySex) throw new Error("日本のクレス統計を取得できません。");
  const morphs = Array.isArray(row.morphs) ? row.morphs : [];
  const buckets = Array.isArray(row.buckets) ? row.buckets : [];
  const hatchYears = Array.isArray(row.hatchYears) ? row.hatchYears : [];

  return {
    registered: requireInt(row.registered, "登録個体"),
    living: requireInt(row.living, "飼育中"),
    bySex: {
      male: requireInt(bySex.male, "オス"),
      female: requireInt(bySex.female, "メス"),
      unknown: requireInt(bySex.unknown, "性別不明"),
    },
    morphs: morphs.map((item) => {
      const morph = asRecord(item);
      if (!morph || typeof morph.label !== "string") {
        throw new Error("モルフ集計を読めません。");
      }
      return { label: morph.label, count: requireInt(morph.count, "モルフ件数") };
    }),
    meanLatestWeight:
      row.meanLatestWeight === null || row.meanLatestWeight === undefined
        ? null
        : asFiniteNumber(row.meanLatestWeight),
    weightSample: requireInt(row.weightSample, "体重件数"),
    buckets: buckets.map((item) => {
      const bucket = asRecord(item);
      if (!bucket || typeof bucket.id !== "string" || typeof bucket.label !== "string") {
        throw new Error("月齢別集計を読めません。");
      }
      const n = requireInt(bucket.n, "月齢件数");
      const average =
        bucket.average === null || bucket.average === undefined
          ? null
          : asFiniteNumber(bucket.average);
      return { id: bucket.id, label: bucket.label, n, average };
    }),
    hatchYears: hatchYears.map((item) => {
      const year = asRecord(item);
      if (!year || typeof year.year !== "string") {
        throw new Error("孵化年の集計を読めません。");
      }
      return { year: year.year, count: requireInt(year.count, "孵化年件数") };
    }),
  };
}

export function parseCompareCohort(raw: unknown): CompareCohortPayload {
  const row = asRecord(raw);
  if (!row) throw new Error("全国個体比較を取得できません。");
  const sampleSize = requireInt(row.sampleSize, "比較件数");
  const average =
    row.average === null || row.average === undefined
      ? null
      : asFiniteNumber(row.average);
  const curveRaw = Array.isArray(row.curve) ? row.curve : [];
  const curve: CohortPoint[] = curveRaw.map((item) => {
    const point = asRecord(item);
    const month = asFiniteNumber(point?.month);
    const weightG = asFiniteNumber(point?.weightG);
    if (month === null || weightG === null) {
      throw new Error("比較の平均曲線を読めません。");
    }
    return { month, weightG };
  });
  if (sampleSize < MIN_COHORT_FOR_AVERAGE && average !== null) {
    return { sampleSize, average: null, curve: [] };
  }
  return { sampleSize, average, curve };
}

export function parseGrowthGuideMonths(raw: unknown): GrowthGuideMonthPayload[] {
  if (!Array.isArray(raw)) {
    throw new Error("成長の実測集計を取得できません。");
  }
  return raw.map((item) => {
    const row = asRecord(item);
    const month = asFiniteNumber(row?.month);
    const sampleSize = asFiniteNumber(row?.sampleSize);
    if (
      month === null ||
      sampleSize === null ||
      !Number.isInteger(month) ||
      !Number.isInteger(sampleSize) ||
      month < 1 ||
      month > 12 ||
      sampleSize < 0
    ) {
      throw new Error("成長の実測集計を読めません。");
    }
    const averageWeight =
      row?.averageWeight === null || row?.averageWeight === undefined
        ? null
        : asFiniteNumber(row.averageWeight);
    return {
      month,
      sampleSize,
      averageWeight:
        sampleSize >= MIN_COHORT_FOR_AVERAGE ? averageWeight : null,
    };
  });
}

async function rpc(name: string, args?: Record<string, unknown>): Promise<unknown> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc(name, args ?? {});
  if (error) {
    throw new Error(`集計を取得できません: ${error.message}`);
  }
  return data;
}

async function japanCrestStatsRpc(): Promise<unknown> {
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client.rpc("japan_crest_stats"),
  );
  if (error) {
    throw new Error(`集計を取得できません: ${error.message}`);
  }
  return data;
}

export async function fetchJapanCrestStats(): Promise<JapanCrestStatsPayload> {
  return parseJapanCrestStats(await japanCrestStatsRpc());
}

export async function fetchCompareCohort(options: {
  excludeAnimalId: string;
  sex: string;
  morphKey: string;
  ageMonths: number | null;
}): Promise<CompareCohortPayload> {
  return parseCompareCohort(
    await rpc("compare_cohort_stats", {
      p_exclude_animal_id: options.excludeAnimalId,
      p_sex: options.sex,
      p_morph_key: options.morphKey,
      p_age_months: options.ageMonths,
    }),
  );
}

export async function fetchGrowthGuideMonths(): Promise<GrowthGuideMonthPayload[]> {
  try {
    return parseGrowthGuideMonths(await rpc("growth_guide_month_stats"));
  } catch {
    return [];
  }
}
