import { describe, expect, it } from "vitest";
import { japanStats, MIN_MORPH_COUNT, MIN_STATS_FOR_AVERAGE } from "./japan";
import type { Animal, WeightLogRecord } from "@/lib/db/types";

function stubAnimal(id: string, extras: Partial<Animal> = {}): Animal {
  return {
    id,
    crestLinkId: "",
    code: id,
    name: id,
    sex: "female",
    hatchDate: "2025-09-01",
    status: "active",
    sireId: "",
    damId: "",
    morphLabel: "rare-unique",
    traits: [],
    notes: "",
    photoUrl: "",
    isPublic: true,
    shareSlug: id,
    prefecture: "東京都",
    createdAt: "",
    updatedAt: "",
    genotype: {},
    ...extras,
  };
}

describe("japanStats", () => {
  it("hides averages and rare morph labels when the sample is small", () => {
    const animals = [stubAnimal("one"), stubAnimal("two", { morphLabel: "common" })];
    const weights = new Map<string, WeightLogRecord[]>([
      [
        "one",
        [
          {
            id: "w1",
            animalId: "one",
            weighedOn: "2026-09-01",
            weightG: 21,
            notes: "",
          },
        ],
      ],
    ]);
    const stats = japanStats(animals, weights);
    expect(stats.weightSample).toBeLessThan(MIN_STATS_FOR_AVERAGE);
    expect(stats.meanLatestWeight).toBeNull();
    expect(stats.morphs.every((row) => row.count >= MIN_MORPH_COUNT)).toBe(true);
  });
});
