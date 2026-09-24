import { describe, expect, it } from "vitest";
import { compareAnimal, isJapanDomesticAnimal, MIN_COHORT_FOR_AVERAGE } from "./compare";
import type { Animal, WeightLogRecord } from "@/lib/db/types";

describe("isJapanDomesticAnimal", () => {
  it("treats empty prefecture as Japan collection data", () => {
    expect(isJapanDomesticAnimal({})).toBe(true);
    expect(isJapanDomesticAnimal({ prefecture: "" })).toBe(true);
  });

  it("keeps Japanese prefectures and excludes overseas labels", () => {
    expect(isJapanDomesticAnimal({ prefecture: "沖縄県" })).toBe(true);
    expect(isJapanDomesticAnimal({ prefecture: "California" })).toBe(false);
  });
});

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
    morphLabel: "pinstripe",
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

function logs(animalId: string, weightG: number): WeightLogRecord[] {
  return [
    {
      id: `${animalId}-w`,
      animalId,
      weighedOn: "2026-09-01",
      weightG,
      notes: "",
    },
  ];
}

describe("compareAnimal", () => {
  it("does not present a tiny cohort as a national average", () => {
    const mine = stubAnimal("mine");
    const result = compareAnimal({
      animal: mine,
      logs: logs("mine", 24),
      others: [
        { animal: stubAnimal("a"), logs: logs("a", 20) },
        { animal: stubAnimal("b"), logs: logs("b", 22) },
      ],
    });
    expect(result.sampleSize).toBeLessThan(MIN_COHORT_FOR_AVERAGE);
    expect(result.comparable).toBe(false);
    expect(result.average).toBeNull();
    expect(result.vsAverage).toBeNull();
  });

  it("shows vs-average copy when the cohort is large enough", () => {
    const mine = stubAnimal("mine");
    const others = Array.from({ length: MIN_COHORT_FOR_AVERAGE }, (_, index) => ({
      animal: stubAnimal(`o${index}`),
      logs: logs(`o${index}`, 20),
    }));
    const result = compareAnimal({
      animal: mine,
      logs: logs("mine", 24),
      others,
    });
    expect(result.comparable).toBe(true);
    expect(result.average).toBe(20);
    expect(result.vsAverage).toBe("平均より+4.0g");
  });
});
