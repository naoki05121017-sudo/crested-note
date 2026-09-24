import { describe, expect, it } from "vitest";
import type { WeightLogRecord } from "@/lib/db/types";
import {
  formatDeltaGrams,
  growthAlbumSteps,
  latestMonthlyReport,
  latestWeightChange,
  monthlyGrowthReport,
} from "./weight-growth";

function log(
  id: string,
  weighedOn: string,
  weightG: number,
): WeightLogRecord {
  return { id, animalId: "a", weighedOn, weightG, notes: "" };
}

describe("weight growth", () => {
  it("compares the latest two records", () => {
    const change = latestWeightChange([
      log("1", "2026-09-01", 21),
      log("2", "2026-09-24", 24),
    ]);
    expect(change?.deltaG).toBe(3);
    expect(change?.daysBetween).toBe(23);
    expect(formatDeltaGrams(change!.deltaG)).toBe("+3.0g");
  });

  it("builds an album timeline in date order", () => {
    const steps = growthAlbumSteps([
      log("3", "2026-09-24", 24),
      log("1", "2026-08-01", 5),
      log("2", "2026-09-01", 21),
    ]);
    expect(steps.map((step) => step.log.weightG)).toEqual([5, 21, 24]);
    expect(steps[1]?.deltaG).toBe(16);
  });

  it("hides monthly reports until two records exist in that month", () => {
    const logs = [
      log("1", "2026-09-02", 21),
      log("2", "2026-09-20", 25),
      log("3", "2026-09-24", 24),
    ];
    const september = monthlyGrowthReport(logs, "2026-09");
    expect(september).toMatchObject({
      label: "2026年9月の成長",
      startG: 21,
      endG: 24,
      deltaG: 3,
      count: 3,
    });
    expect(monthlyGrowthReport(logs, "2026-08")).toBeNull();
    expect(latestMonthlyReport(logs, "2026-09-24")?.yearMonth).toBe("2026-09");
  });
});
