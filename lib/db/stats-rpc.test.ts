import { describe, expect, it } from "vitest";
import {
  parseCompareCohort,
  parseGrowthGuideMonths,
  parseJapanCrestStats,
} from "./stats-rpc";

describe("anonymous stats payloads", () => {
  it("accepts aggregate-only Japan stats", () => {
    const stats = parseJapanCrestStats({
      registered: 10,
      living: 9,
      bySex: { male: 4, female: 5, unknown: 0 },
      morphs: [{ label: "pinstripe", count: 3 }],
      meanLatestWeight: 21.5,
      weightSample: 8,
      buckets: [{ id: "0-3", label: "0〜3ヶ月", n: 2, average: null }],
      hatchYears: [{ year: "2025", count: 9 }],
    });
    expect(stats.registered).toBe(10);
    expect(stats.meanLatestWeight).toBe(21.5);
    expect(JSON.stringify(stats)).not.toContain("user_id");
    expect(JSON.stringify(stats)).not.toContain("photo");
  });

  it("drops an average when the compare sample is too small", () => {
    const cohort = parseCompareCohort({
      sampleSize: 2,
      average: 40,
      curve: [{ month: 6, weightG: 18 }],
    });
    expect(cohort.average).toBeNull();
    expect(cohort.curve).toEqual([]);
  });

  it("keeps growth-guide months anonymous and hides small-n averages", () => {
    const months = parseGrowthGuideMonths([
      { month: 2, sampleSize: 8, averageWeight: 3.4 },
      { month: 3, sampleSize: 3, averageWeight: 99 },
    ]);
    expect(months).toEqual([
      { month: 2, sampleSize: 8, averageWeight: 3.4 },
      { month: 3, sampleSize: 3, averageWeight: null },
    ]);
    expect(JSON.stringify(months)).not.toContain("user_id");
    expect(JSON.stringify(months)).not.toContain("photo");
    expect(JSON.stringify(months)).not.toContain("notes");
  });
});
