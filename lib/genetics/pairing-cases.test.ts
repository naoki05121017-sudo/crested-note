import { describe, expect, it } from "vitest";
import { calculatePairing } from "./calculate";
import { formatCopiesAsGenotype } from "./display";
import { resolveParentGenotype } from "./parent-input";
import { formatGenotypeLabel, genotypeFromCopies } from "./phenotype";
import type { PairingResult } from "./types";

function prob(result: PairingResult, phenotype: string) {
  return result.outcomes.find((row) => row.phenotype === phenotype)?.probability ?? 0;
}

function expectLocusSurvives(result: PairingResult, locusId: string) {
  const locus = result.loci.find((row) => row.locusId === locusId);
  expect(locus, `${locusId} missing from locus breakdown`).toBeTruthy();
  const inPhenotype = result.outcomes.some((row) => (row.copies[locusId] ?? 0) > 0);
  const inLocus =
    locus?.outcomes.some((row) => row.copies > 0 && row.probability > 0) ?? false;
  expect(inPhenotype || inLocus, `${locusId} dropped from offspring`).toBe(true);
}

function phenotypeSum(result: PairingResult) {
  return result.outcomes.reduce((sum, row) => sum + row.probability, 0);
}

describe("pairing cases: parent signals must reach offspring", () => {
  it("1. ノーマル × ノーマル", () => {
    const result = calculatePairing({}, {});
    expect(prob(result, "ノーマル")).toBe(1);
    expect(phenotypeSum(result)).toBeCloseTo(1);
  });

  it("2. ファントム（見た目） × ノーマル", () => {
    const parentA = { phantom: "visual" as const };
    const result = calculatePairing(parentA, {});
    expect(formatGenotypeLabel(parentA)).toBe("ファントム");
    expect(prob(result, "het ファントム")).toBeCloseTo(1);
    expectLocusSurvives(result, "phantom");
    expect(formatCopiesAsGenotype(result.outcomes[0]?.copies ?? {})).toContain(
      "ファントム",
    );
  });

  it("3. ファントム（見た目） × リリーホワイト", () => {
    const result = calculatePairing(
      { phantom: "visual" },
      { lillyWhite: "het" },
    );
    expect(prob(result, "het ファントム")).toBeCloseTo(0.5);
    expect(prob(result, "リリーホワイト het ファントム")).toBeCloseTo(0.5);
    expect(prob(result, "リリーホワイト")).toBe(0);
    expectLocusSurvives(result, "phantom");
    expectLocusSurvives(result, "lillyWhite");
    expect(phenotypeSum(result)).toBeCloseTo(1);
  });

  it("4. hetファントム × リリーホワイト", () => {
    const result = calculatePairing({ phantom: "het" }, { lillyWhite: "het" });
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(prob(result, "リリーホワイト")).toBeCloseTo(0.25);
    expect(prob(result, "het ファントム")).toBeCloseTo(0.25);
    expect(prob(result, "リリーホワイト het ファントム")).toBeCloseTo(0.25);
    expectLocusSurvives(result, "phantom");
    expectLocusSurvives(result, "lillyWhite");
  });

  it("5. リリーホワイト × ノーマル", () => {
    const result = calculatePairing({ lillyWhite: "het" }, {});
    expect(prob(result, "ノーマル")).toBeCloseTo(0.5);
    expect(prob(result, "リリーホワイト")).toBeCloseTo(0.5);
    expectLocusSurvives(result, "lillyWhite");
  });

  it("6. リリーホワイト × セーブル", () => {
    const mergedB = resolveParentGenotype({}, ["sable"]);
    expect(mergedB).toEqual({ cappuccino: "het" });
    const result = calculatePairing(
      { lillyWhite: "het" },
      {},
      { visualB: ["sable"] },
    );
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(prob(result, "セーブル")).toBeCloseTo(0.25);
    expect(prob(result, "リリーホワイト")).toBeCloseTo(0.25);
    expect(prob(result, "リリーセーブル")).toBeCloseTo(0.25);
    expectLocusSurvives(result, "lillyWhite");
    expectLocusSurvives(result, "cappuccino");
    const combo = result.outcomes.find((row) => row.phenotype === "リリーセーブル");
    expect(combo?.copies.lillyWhite).toBe(1);
    expect(combo?.copies.cappuccino).toBe(1);
    expect(formatCopiesAsGenotype(combo?.copies ?? {}, "sable")).toMatch(/リリーホワイト/);
    expect(formatCopiesAsGenotype(combo?.copies ?? {}, "sable")).toMatch(/セーブル/);
  });

  it("7. セーブル × ノーマル", () => {
    const result = calculatePairing({}, {}, { visualA: ["sable"] });
    expect(prob(result, "ノーマル")).toBeCloseTo(0.5);
    expect(prob(result, "セーブル")).toBeCloseTo(0.5);
    expectLocusSurvives(result, "cappuccino");
  });

  it("8. ファントム（見た目） × セーブル", () => {
    const result = calculatePairing(
      { phantom: "visual" },
      {},
      { visualB: ["sable"] },
    );
    expect(prob(result, "het ファントム")).toBeCloseTo(0.5);
    expect(prob(result, "セーブル het ファントム")).toBeCloseTo(0.5);
    expectLocusSurvives(result, "phantom");
    expectLocusSurvives(result, "cappuccino");
  });

  it("9. リリーホワイト × ファントム（見た目） は左右入れ替えても同じ", () => {
    const ab = calculatePairing({ lillyWhite: "het" }, { phantom: "visual" });
    const ba = calculatePairing({ phantom: "visual" }, { lillyWhite: "het" });
    expect(prob(ab, "het ファントム")).toBeCloseTo(prob(ba, "het ファントム"));
    expect(prob(ab, "リリーホワイト het ファントム")).toBeCloseTo(
      prob(ba, "リリーホワイト het ファントム"),
    );
    expectLocusSurvives(ab, "lillyWhite");
    expectLocusSurvives(ab, "phantom");
  });

  it("10. 2種類以上の遺伝形質を持つ親同士", () => {
    const parentA = resolveParentGenotype(
      { lillyWhite: "het", phantom: "visual" },
      [],
    );
    const parentB = resolveParentGenotype({ patternless: "het" }, ["sable"]);
    expect(parentA).toEqual({ lillyWhite: "het", phantom: "visual" });
    expect(parentB.cappuccino).toBe("het");
    expect(parentB.patternless).toBe("het");

    const result = calculatePairing(parentA, parentB, { visualB: ["sable"] });
    expectLocusSurvives(result, "lillyWhite");
    expectLocusSurvives(result, "phantom");
    expectLocusSurvives(result, "cappuccino");
    expectLocusSurvives(result, "patternless");
    expect(phenotypeSum(result)).toBeCloseTo(1);

    const withAll = result.outcomes.filter(
      (row) =>
        (row.copies.lillyWhite ?? 0) > 0 &&
        (row.copies.phantom ?? 0) > 0 &&
        (row.copies.cappuccino ?? 0) > 0 &&
        (row.copies.patternless ?? 0) > 0,
    );
    expect(withAll.length).toBeGreaterThan(0);
    for (const row of withAll) {
      expect(row.phenotype).not.toBe("het ファントム");
      expect(genotypeFromCopies(row.copies).phantom).toBeTruthy();
      expect(genotypeFromCopies(row.copies).lillyWhite).toBeTruthy();
    }
  });

  it("does not let a later locus overwrite an earlier locus in cartesian expansion", () => {
    const result = calculatePairing(
      { phantom: "visual", lillyWhite: "het", patternless: "het" },
      {},
    );
    expect(result.outcomes.every((row) => (row.copies.phantom ?? 0) === 1)).toBe(
      true,
    );
    expect(result.outcomes.some((row) => (row.copies.lillyWhite ?? 0) === 1)).toBe(
      true,
    );
    expect(result.outcomes.some((row) => (row.copies.patternless ?? 0) === 1)).toBe(
      true,
    );
  });
});
