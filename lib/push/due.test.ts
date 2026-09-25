import { describe, expect, it } from "vitest";
import { CHECK_CADENCE_PRESETS } from "@/lib/care/check-cadence";
import type { WeightLogRecord } from "@/lib/db/types";
import { dueCheckPushes } from "./due";

function log(animalId: string, weighedOn: string): WeightLogRecord {
  return { id: `${animalId}-w`, animalId, weighedOn, weightG: 20, notes: "" };
}

describe("dueCheckPushes", () => {
  it("sends when the last record is older than the animal cadence", () => {
    const weekly = CHECK_CADENCE_PRESETS[0].days;
    const result = dueCheckPushes(
      [
        {
          id: "g",
          name: "根性",
          status: "active",
          checkEveryDays: weekly,
          userId: "u1",
        },
      ],
      new Map([["g", [log("g", "2026-09-18")]]]),
      "2026-09-25",
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("根性のクレスチェックの時間です🦎");
    expect(result[0]?.path).toBe("/animals/g");
  });

  it("does not send before the cadence elapses or without a weight log", () => {
    const weekly = CHECK_CADENCE_PRESETS[0].days;
    expect(
      dueCheckPushes(
        [
          {
            id: "g",
            name: "根性",
            status: "active",
            checkEveryDays: weekly,
          },
        ],
        new Map([["g", [log("g", "2026-09-24")]]]),
        "2026-09-25",
      ),
    ).toEqual([]);
    expect(
      dueCheckPushes(
        [
          {
            id: "g",
            name: "根性",
            status: "active",
            checkEveryDays: weekly,
          },
        ],
        new Map(),
        "2026-09-25",
      ),
    ).toEqual([]);
  });
});
