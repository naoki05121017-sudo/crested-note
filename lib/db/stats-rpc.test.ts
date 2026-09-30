import { readFileSync } from "node:fs";
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

  it("keeps the home animal preview separate from nationwide Japan stats", () => {
    const home = readFileSync("app/(app)/page.tsx", "utf8");
    expect(home).toContain("pageSize: HOME_ANIMAL_PREVIEW");
    expect(home).toContain("fetchJapanCrestStats()");
    expect(home).toContain("countOwnedAnimals");
    expect(home).toContain("japanRegistered={japan.registered}");
    expect(home).toContain("animalCount={animalCount}");
  });

  it("loads Japan stats with the service-role client instead of the signed-in user", () => {
    const source = readFileSync("lib/db/stats-rpc.ts", "utf8");
    expect(source).toContain("createAdminClient");
    expect(source).toMatch(
      /function japanCrestStatsRpc[\s\S]*client\.rpc\("japan_crest_stats"\)/,
    );
    expect(source).not.toMatch(
      /fetchJapanCrestStats[\s\S]*rpc\("japan_crest_stats"\)/,
    );
  });

  it("does not filter Japan totals by is_public in the live SQL replacement", () => {
    const sql = readFileSync(
      "supabase/migrations/20260928_japan_crest_stats_all_animals.sql",
      "utf8",
    );
    expect(sql).not.toContain("is_public");
    expect(sql).toContain("set row_security = off");
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
