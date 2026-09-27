import { describe, expect, it } from "vitest";
import {
  GROWTH_GUIDE_MIN_SAMPLE,
  GROWTH_REFERENCE_BY_MONTH,
  growthGuideSeries,
} from "./growth-guide";

describe("growth guide", () => {
  it("keeps the 1–12 month reference table as 参考目安 values", () => {
    expect(GROWTH_GUIDE_MIN_SAMPLE).toBe(5);
    expect(GROWTH_REFERENCE_BY_MONTH.map((row) => [row.month, row.weightG])).toEqual([
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 7],
      [6, 9],
      [7, 11],
      [8, 13],
      [9, 17],
      [10, 21],
      [11, 25],
      [12, 29],
    ]);
  });

  it("switches to measured averages only when that month has at least 5 animals", () => {
    const series = growthGuideSeries([
      { month: 2, sampleSize: 8, averageWeight: 3.4 },
      { month: 3, sampleSize: 3, averageWeight: null },
      { month: 4, sampleSize: 12, averageWeight: 6.1 },
    ]);
    expect(series[1]).toMatchObject({
      month: 2,
      weightG: 3.4,
      source: "measured",
      sampleSize: 8,
    });
    expect(series[2]).toMatchObject({
      month: 3,
      weightG: 4,
      source: "reference",
      sampleSize: 3,
    });
    expect(series[3]).toMatchObject({
      month: 4,
      weightG: 6.1,
      source: "measured",
      sampleSize: 12,
    });
    expect(series[0]).toMatchObject({
      month: 1,
      weightG: 2,
      source: "reference",
    });
  });

  it("does not use a small-n average even if one is present", () => {
    const series = growthGuideSeries([
      { month: 6, sampleSize: 4, averageWeight: 40 },
    ]);
    expect(series[5]).toMatchObject({
      month: 6,
      weightG: 9,
      source: "reference",
    });
  });
});
