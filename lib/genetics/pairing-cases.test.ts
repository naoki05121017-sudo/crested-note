import { describe, expect, it } from "vitest";
import { calculatePairing } from "./calculate";
import { formatGenotypeDetail, formatParentGenotypeDetail } from "./display";
import { normalizeGenotype, resolveParentGenotype } from "./normalize";
import { formatGenotypeLabel, visualPhenotypeName } from "./phenotype";
import type { PairingResult } from "./types";

function prob(result: PairingResult, phenotype: string) {
  return (
    result.outcomes.find((row) => row.phenotype === phenotype)?.probability ?? 0
  );
}

function expectLocusSurvives(result: PairingResult, locusId: string) {
  const locus = result.loci.find((row) => row.locusId === locusId);
  expect(locus, `${locusId} missing from locus breakdown`).toBeTruthy();
  const inPhenotype = result.outcomes.some((row) => row.genotype[locusId]);
  const inLocus =
    locus?.outcomes.some((row) => !row.wild && row.probability > 0) ?? false;
  expect(inPhenotype || inLocus, `${locusId} dropped from offspring`).toBe(true);
}

function phenotypeSum(result: PairingResult) {
  return result.outcomes.reduce((sum, row) => sum + row.probability, 0);
}

describe("parent signals must reach the offspring", () => {
  it("1. ノーマル × ノーマル", () => {
    const result = calculatePairing({}, {});
    expect(prob(result, "ノーマル")).toBe(1);
    expect(phenotypeSum(result)).toBeCloseTo(1);
  });

  it("2. ファントム（ビジュアル） × ノーマル", () => {
    const parentA = { phantom: "visual" };
    const result = calculatePairing(parentA, {});
    expect(formatGenotypeLabel(parentA)).toBe("ファントム");
    expect(prob(result, "ヘテロ ファントム")).toBeCloseTo(1);
    expectLocusSurvives(result, "phantom");
    expect(formatGenotypeDetail(result.outcomes[0].genotype)).toBe(
      "ヘテロ ファントム（Aa）",
    );
  });

  it("3. ファントム（ビジュアル） × リリーホワイト", () => {
    const result = calculatePairing(
      { phantom: "visual" },
      { lillyWhite: "het" },
    );
    expect(prob(result, "ヘテロ ファントム")).toBeCloseTo(0.5);
    expect(prob(result, "リリーホワイト ヘテロ ファントム")).toBeCloseTo(0.5);
    expect(prob(result, "リリーホワイト")).toBe(0);
    expectLocusSurvives(result, "phantom");
    expectLocusSurvives(result, "lillyWhite");
    expect(phenotypeSum(result)).toBeCloseTo(1);
  });

  it("4. ヘテロ ファントム × リリーホワイト", () => {
    const result = calculatePairing({ phantom: "het" }, { lillyWhite: "het" });
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(prob(result, "リリーホワイト")).toBeCloseTo(0.25);
    expect(prob(result, "ヘテロ ファントム")).toBeCloseTo(0.25);
    expect(prob(result, "リリーホワイト ヘテロ ファントム")).toBeCloseTo(0.25);
  });

  it("5. リリーホワイト × ノーマル", () => {
    const result = calculatePairing({ lillyWhite: "het" }, {});
    expect(prob(result, "ノーマル")).toBeCloseTo(0.5);
    expect(prob(result, "リリーホワイト")).toBeCloseTo(0.5);
    expectLocusSurvives(result, "lillyWhite");
  });

  it("6. リリーホワイト × セーブル", () => {
    expect(resolveParentGenotype({}, ["sable"])).toEqual({
      cappuccino: "sable",
    });
    const result = calculatePairing(
      { lillyWhite: "het" },
      {},
      { traitsB: ["sable"] },
    );
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(prob(result, "セーブル")).toBeCloseTo(0.25);
    expect(prob(result, "リリーホワイト")).toBeCloseTo(0.25);
    expect(prob(result, "セーブル・リリーホワイト")).toBeCloseTo(0.25);
    expectLocusSurvives(result, "lillyWhite");
    expectLocusSurvives(result, "cappuccino");

    const combo = result.outcomes.find(
      (row) => row.phenotype === "セーブル・リリーホワイト",
    );
    expect(combo?.genotype.lillyWhite).toBe("het");
    expect(combo?.genotype.cappuccino).toBe("sable");
    expect(combo?.detail).toBe("セーブル（N/Sable）、リリーホワイト（NLW）");
  });

  it("7. セーブル × ノーマル", () => {
    const result = calculatePairing({}, {}, { traitsA: ["sable"] });
    expect(prob(result, "ノーマル")).toBeCloseTo(0.5);
    expect(prob(result, "セーブル")).toBeCloseTo(0.5);
    expectLocusSurvives(result, "cappuccino");
  });

  it("8. ファントム（ビジュアル） × セーブル", () => {
    const result = calculatePairing(
      { phantom: "visual" },
      {},
      { traitsB: ["sable"] },
    );
    expect(prob(result, "ヘテロ ファントム")).toBeCloseTo(0.5);
    expect(prob(result, "セーブル ヘテロ ファントム")).toBeCloseTo(0.5);
    expectLocusSurvives(result, "phantom");
    expectLocusSurvives(result, "cappuccino");
  });

  it("9. swapping the parents does not change the result", () => {
    const ab = calculatePairing({ lillyWhite: "het" }, { phantom: "visual" });
    const ba = calculatePairing({ phantom: "visual" }, { lillyWhite: "het" });
    expect(ab.outcomes.map((row) => [row.phenotype, row.probability])).toEqual(
      ba.outcomes.map((row) => [row.phenotype, row.probability]),
    );
  });

  it("10. 複数遺伝形質を持つ親同士", () => {
    const parentA = resolveParentGenotype({
      lillyWhite: "het",
      phantom: "visual",
    });
    const parentB = resolveParentGenotype({ patternless: "het" }, ["sable"]);
    expect(parentA).toEqual({ lillyWhite: "het", phantom: "visual" });
    expect(parentB).toEqual({ patternless: "het", cappuccino: "sable" });

    const result = calculatePairing(parentA, parentB);
    for (const locusId of [
      "lillyWhite",
      "phantom",
      "cappuccino",
      "patternless",
    ]) {
      expectLocusSurvives(result, locusId);
    }
    expect(phenotypeSum(result)).toBeCloseTo(1);

    const withAll = result.outcomes.filter(
      (row) =>
        row.genotype.lillyWhite &&
        row.genotype.phantom &&
        row.genotype.cappuccino &&
        row.genotype.patternless,
    );
    expect(withAll.length).toBeGreaterThan(0);
    for (const row of withAll) {
      expect(row.phenotype).not.toBe("ヘテロ ファントム");
      expect(row.detail).toContain("リリーホワイト");
      expect(row.detail).toContain("セーブル");
    }
  });

  it("does not let a later locus overwrite an earlier one", () => {
    const result = calculatePairing(
      { phantom: "visual", lillyWhite: "het", patternless: "het" },
      {},
    );
    expect(
      result.outcomes.every((row) => row.genotype.phantom === "het"),
    ).toBe(true);
    expect(
      result.outcomes.some((row) => row.genotype.lillyWhite === "het"),
    ).toBe(true);
    expect(
      result.outcomes.some((row) => row.genotype.patternless === "het"),
    ).toBe(true);
  });
});

describe("normalisation of stored parents", () => {
  it("folds the sable trait tag onto the allelic seat", () => {
    expect(normalizeGenotype({}, ["sable"])).toEqual({
      genotype: { cappuccino: "sable" },
      unrecognizedLocusIds: [],
    });
  });

  it("promotes trait tags that the reference treats as genes", () => {
    expect(resolveParentGenotype({}, ["albino"])).toEqual({ albino: "visual" });
    expect(resolveParentGenotype({}, ["chocho"])).toEqual({ chocho: "visual" });
    expect(resolveParentGenotype({}, ["emptyBack"])).toEqual({
      emptyBack: "het",
    });
    expect(resolveParentGenotype({}, ["superStripe"])).toEqual({
      superStripe: "visual",
    });
    expect(resolveParentGenotype({}, ["redBase"])).toEqual({
      redBase: "visual",
    });
  });

  it("leaves polygenic tags out of the genotype", () => {
    expect(resolveParentGenotype({}, ["pinstripe", "lavender"])).toEqual({});
  });

  it("keeps an explicit state over a trait tag", () => {
    expect(resolveParentGenotype({ cappuccino: "luwak" }, ["sable"])).toEqual({
      cappuccino: "luwak",
    });
  });

  it("describes a stored parent from the same catalog", () => {
    expect(
      formatParentGenotypeDetail({ cappuccino: "sable", phantom: "possible_50" }),
    ).toBe("50%ヘテロ ファントム、セーブル（N/Sable）");
  });

  it("reports only the visible morphs for cohort matching", () => {
    expect(
      visualPhenotypeName(
        resolveParentGenotype({ cappuccino: "sable", phantom: "het" }),
      ),
    ).toBe("セーブル");
  });
});
