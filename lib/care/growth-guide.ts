export const GROWTH_GUIDE_MIN_SAMPLE = 5;

export const GROWTH_REFERENCE_BY_MONTH = [
  { month: 1, weightG: 2 },
  { month: 2, weightG: 3 },
  { month: 3, weightG: 4 },
  { month: 4, weightG: 5 },
  { month: 5, weightG: 7 },
  { month: 6, weightG: 9 },
  { month: 7, weightG: 11 },
  { month: 8, weightG: 13 },
  { month: 9, weightG: 17 },
  { month: 10, weightG: 21 },
  { month: 11, weightG: 25 },
  { month: 12, weightG: 29 },
] as const;

export type GrowthGuideMonthStat = {
  month: number;
  sampleSize: number;
  averageWeight: number | null;
};

export type GrowthGuideSource = "reference" | "measured";

export type GrowthGuidePoint = {
  month: number;
  weightG: number;
  source: GrowthGuideSource;
  sampleSize: number;
};

export function growthGuideSeries(
  measured: GrowthGuideMonthStat[],
): GrowthGuidePoint[] {
  const byMonth = new Map(
    measured.map((row) => [row.month, row] as const),
  );
  return GROWTH_REFERENCE_BY_MONTH.map((ref) => {
    const row = byMonth.get(ref.month);
    const sampleSize = row?.sampleSize ?? 0;
    const averageWeight = row?.averageWeight;
    if (
      sampleSize >= GROWTH_GUIDE_MIN_SAMPLE &&
      averageWeight != null &&
      Number.isFinite(averageWeight)
    ) {
      return {
        month: ref.month,
        weightG: averageWeight,
        source: "measured",
        sampleSize,
      };
    }
    return {
      month: ref.month,
      weightG: ref.weightG,
      source: "reference",
      sampleSize,
    };
  });
}
