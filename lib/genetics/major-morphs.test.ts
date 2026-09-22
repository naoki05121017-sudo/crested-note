import { describe, expect, it } from "vitest";
import {
  addCalculatorTrait,
  runCalculatorPairing,
  type CalculatorParentState,
} from "@/app/components/calculator-pairing";
import { calculatorTraitOptions } from "@/app/components/calculator-traits";
import { calculatePairing } from "./calculate";
import type { Genotype, PairingResult } from "./types";

function p(result: PairingResult, phenotype: string) {
  return result.outcomes.find((row) => row.phenotype === phenotype)?.probability ?? 0;
}

function sum(result: PairingResult) {
  return result.outcomes.reduce((total, row) => total + row.probability, 0);
}

function expectRows(
  result: PairingResult,
  rows: { phenotype: string; probability: number }[],
) {
  expect(sum(result)).toBeCloseTo(1, 10);
  expect(result.outcomes.every((row) => row.probability > 0)).toBe(true);
  for (const row of rows) {
    expect(p(result, row.phenotype), row.phenotype).toBeCloseTo(row.probability);
  }
  expect(result.outcomes.map((row) => row.phenotype).sort()).toEqual(
    rows.map((row) => row.phenotype).sort(),
  );
}

function option(id: string) {
  const found = calculatorTraitOptions().find((row) => row.id === id);
  if (!found) throw new Error(`missing option ${id}`);
  return found;
}

function empty(): CalculatorParentState {
  return { genotype: {}, visualTags: [], addedTraits: [] };
}

function pick(id: string, status?: Genotype[string]) {
  let parent = addCalculatorTrait(empty(), option(id));
  if (status && id !== "sable" && id !== "axanthic") {
    parent = { ...parent, genotype: { ...parent.genotype, [id]: status } };
  }
  if (status && id === "axanthic") {
    parent = {
      ...parent,
      genotype: { ...parent.genotype, axanthicTug: status as never },
    };
  }
  if (status && id === "sable") {
    parent = {
      ...parent,
      genotype: { ...parent.genotype, cappuccino: status as never },
    };
  }
  return parent;
}

describe("major morph grid (Lilly White / Sable / Cappuccino / Axanthic / Phantom / Patternless)", () => {
  it("Lilly White × Lilly White is incomplete dominant 1:2:1", () => {
    expectRows(calculatePairing({ lillyWhite: "het" }, { lillyWhite: "het" }), [
      { phenotype: "ノーマル", probability: 0.25 },
      { phenotype: "リリーホワイト", probability: 0.5 },
      { phenotype: "スーパーリリーホワイト", probability: 0.25 },
    ]);
  });

  it("Sable × Sable is incomplete dominant 1:2:1, never het", () => {
    const result = calculatePairing({}, {}, { visualA: ["sable"], visualB: ["sable"] });
    expectRows(result, [
      { phenotype: "ノーマル", probability: 0.25 },
      { phenotype: "セーブル", probability: 0.5 },
      { phenotype: "スーパーセーブル", probability: 0.25 },
    ]);
    expect(result.outcomes.some((row) => /het|ヘテロ セーブル/.test(row.phenotype))).toBe(
      false,
    );
  });

  it("Cappuccino × Cappuccino is incomplete dominant 1:2:1, never het", () => {
    expectRows(calculatePairing({ cappuccino: "het" }, { cappuccino: "het" }), [
      { phenotype: "ノーマル", probability: 0.25 },
      { phenotype: "カプチーノ", probability: 0.5 },
      { phenotype: "スーパーカプチーノ", probability: 0.25 },
    ]);
  });

  it("Axanthic / Phantom / Patternless follow recessive 1-copy het rules", () => {
    expectRows(calculatePairing({ axanthicTug: "visual" }, {}), [
      { phenotype: "ヘテロ アザンティック", probability: 1 },
    ]);
    expectRows(calculatePairing({ phantom: "het" }, { phantom: "het" }), [
      { phenotype: "ノーマル", probability: 0.25 },
      { phenotype: "ヘテロ ファントム", probability: 0.5 },
      { phenotype: "ファントム", probability: 0.25 },
    ]);
    expectRows(calculatePairing({ patternless: "visual" }, {}), [
      { phenotype: "ヘテロ パターンレス", probability: 1 },
    ]);
    expectRows(calculatePairing({ patternless: "het" }, { patternless: "het" }), [
      { phenotype: "ノーマル", probability: 0.25 },
      { phenotype: "ヘテロ パターンレス", probability: 0.5 },
      { phenotype: "パターンレス", probability: 0.25 },
    ]);
    expectRows(calculatePairing({ patternless: "visual" }, { patternless: "het" }), [
      { phenotype: "ヘテロ パターンレス", probability: 0.5 },
      { phenotype: "パターンレス", probability: 0.5 },
    ]);
  });

  it("Lilly White 1-copy × Sable 1-copy is 4×25% with no super", () => {
    const result = calculatePairing(
      { lillyWhite: "het" },
      {},
      { visualB: ["sable"] },
    );
    expectRows(result, [
      { phenotype: "ノーマル", probability: 0.25 },
      { phenotype: "セーブル", probability: 0.25 },
      { phenotype: "リリーホワイト", probability: 0.25 },
      { phenotype: "リリーセーブル", probability: 0.25 },
    ]);
    expect(result.outcomes.some((row) => row.phenotype.includes("スーパー"))).toBe(
      false,
    );
  });

  it("Lilly White 1-copy × Cappuccino 1-copy is フラペチーノ 25%, no super", () => {
    const result = calculatePairing({ lillyWhite: "het" }, { cappuccino: "het" });
    expectRows(result, [
      { phenotype: "ノーマル", probability: 0.25 },
      { phenotype: "カプチーノ", probability: 0.25 },
      { phenotype: "リリーホワイト", probability: 0.25 },
      { phenotype: "フラペチーノ", probability: 0.25 },
    ]);
    expect(result.outcomes.some((row) => row.phenotype.includes("スーパー"))).toBe(
      false,
    );
  });

  it("Cappuccino × Sable stay on one CSH locus (ルアク, no independent het)", () => {
    const result = calculatePairing(
      { cappuccino: "het" },
      {},
      { visualB: ["sable"] },
    );
    expectRows(result, [
      { phenotype: "ノーマル", probability: 0.25 },
      { phenotype: "カプチーノ", probability: 0.25 },
      { phenotype: "セーブル", probability: 0.25 },
      { phenotype: "ルアク", probability: 0.25 },
    ]);
  });

  it("Lilly White 1-copy × visual recessive is 50/50 het and LW(het)", () => {
    expectRows(calculatePairing({ lillyWhite: "het" }, { phantom: "visual" }), [
      { phenotype: "ヘテロ ファントム", probability: 0.5 },
      { phenotype: "リリーホワイト（ヘテロ ファントム）", probability: 0.5 },
    ]);
    expectRows(calculatePairing({ lillyWhite: "het" }, { axanthicTug: "visual" }), [
      { phenotype: "ヘテロ アザンティック", probability: 0.5 },
      { phenotype: "リリーホワイト（ヘテロ アザンティック）", probability: 0.5 },
    ]);
    expectRows(calculatePairing({ lillyWhite: "het" }, { patternless: "visual" }), [
      { phenotype: "ヘテロ パターンレス", probability: 0.5 },
      { phenotype: "リリーホワイト（ヘテロ パターンレス）", probability: 0.5 },
    ]);
  });

  it("Sable 1-copy × visual recessive keeps sable and het, no super sable", () => {
    const phantom = calculatePairing(
      { phantom: "visual" },
      {},
      { visualB: ["sable"] },
    );
    expectRows(phantom, [
      { phenotype: "ヘテロ ファントム", probability: 0.5 },
      { phenotype: "セーブル（ヘテロ ファントム）", probability: 0.5 },
    ]);
    const ax = calculatePairing(
      { axanthicTug: "visual" },
      {},
      { visualB: ["sable"] },
    );
    expectRows(ax, [
      { phenotype: "ヘテロ アザンティック", probability: 0.5 },
      { phenotype: "セーブル（ヘテロ アザンティック）", probability: 0.5 },
    ]);
    const patternless = calculatePairing(
      { patternless: "visual" },
      {},
      { visualB: ["sable"] },
    );
    expectRows(patternless, [
      { phenotype: "ヘテロ パターンレス", probability: 0.5 },
      { phenotype: "セーブル（ヘテロ パターンレス）", probability: 0.5 },
    ]);
  });

  it("Cappuccino 1-copy × visual recessive keeps cappuccino and het, no super capp", () => {
    expectRows(calculatePairing({ cappuccino: "het" }, { phantom: "visual" }), [
      { phenotype: "ヘテロ ファントム", probability: 0.5 },
      { phenotype: "カプチーノ（ヘテロ ファントム）", probability: 0.5 },
    ]);
    expectRows(calculatePairing({ cappuccino: "het" }, { axanthicTug: "visual" }), [
      { phenotype: "ヘテロ アザンティック", probability: 0.5 },
      { phenotype: "カプチーノ（ヘテロ アザンティック）", probability: 0.5 },
    ]);
    expectRows(calculatePairing({ cappuccino: "het" }, { patternless: "visual" }), [
      { phenotype: "ヘテロ パターンレス", probability: 0.5 },
      { phenotype: "カプチーノ（ヘテロ パターンレス）", probability: 0.5 },
    ]);
  });

  it("visual recessives on different loci stay independent (no fake 25% visual fusion)", () => {
    expectRows(calculatePairing({ phantom: "visual" }, { patternless: "visual" }), [
      {
        phenotype: "ヘテロ ファントム / ヘテロ パターンレス",
        probability: 1,
      },
    ]);
    expectRows(calculatePairing({ phantom: "visual" }, { axanthicTug: "visual" }), [
      {
        phenotype: "ヘテロ ファントム / ヘテロ アザンティック",
        probability: 1,
      },
    ]);
    expectRows(
      calculatePairing({ axanthicTug: "visual" }, { patternless: "visual" }),
      [
        {
          phenotype: "ヘテロ パターンレス / ヘテロ アザンティック",
          probability: 1,
        },
      ],
    );
  });

  it("visual × visual on the same recessive locus is 100% visual", () => {
    expectRows(calculatePairing({ phantom: "visual" }, { phantom: "visual" }), [
      { phenotype: "ファントム", probability: 1 },
    ]);
    expectRows(
      calculatePairing({ patternless: "visual" }, { patternless: "visual" }),
      [{ phenotype: "パターンレス", probability: 1 }],
    );
    expectRows(
      calculatePairing({ axanthicTug: "visual" }, { axanthicTug: "visual" }),
      [{ phenotype: "アザンティック", probability: 1 }],
    );
  });

  it("visual Phantom × visual Axanthic offspring names stay het-only until both loci are visual", () => {
    const bothVisual = calculatePairing(
      { phantom: "visual", axanthicTug: "visual" },
      { phantom: "visual", axanthicTug: "visual" },
    );
    expectRows(bothVisual, [{ phenotype: "アザンティック・ファントム", probability: 1 }]);
  });

  it("calculator UI path matches the engine for the six morphs", () => {
    const lw = pick("lillyWhite");
    const sable = pick("sable");
    const capp = pick("cappuccino");
    const ax = pick("axanthic", "visual");
    const phantom = pick("phantom", "visual");
    const patternless = pick("patternless", "visual");

    expectRows(runCalculatorPairing(lw, sable), [
      { phenotype: "ノーマル", probability: 0.25 },
      { phenotype: "セーブル", probability: 0.25 },
      { phenotype: "リリーホワイト", probability: 0.25 },
      { phenotype: "リリーセーブル", probability: 0.25 },
    ]);
    expectRows(runCalculatorPairing(sable, sable), [
      { phenotype: "ノーマル", probability: 0.25 },
      { phenotype: "セーブル", probability: 0.5 },
      { phenotype: "スーパーセーブル", probability: 0.25 },
    ]);
    expectRows(runCalculatorPairing(lw, lw), [
      { phenotype: "ノーマル", probability: 0.25 },
      { phenotype: "リリーホワイト", probability: 0.5 },
      { phenotype: "スーパーリリーホワイト", probability: 0.25 },
    ]);
    expectRows(runCalculatorPairing(capp, capp), [
      { phenotype: "ノーマル", probability: 0.25 },
      { phenotype: "カプチーノ", probability: 0.5 },
      { phenotype: "スーパーカプチーノ", probability: 0.25 },
    ]);
    expectRows(runCalculatorPairing(lw, capp), [
      { phenotype: "ノーマル", probability: 0.25 },
      { phenotype: "カプチーノ", probability: 0.25 },
      { phenotype: "リリーホワイト", probability: 0.25 },
      { phenotype: "フラペチーノ", probability: 0.25 },
    ]);
    expectRows(runCalculatorPairing(ax, empty()), [
      { phenotype: "ヘテロ アザンティック", probability: 1 },
    ]);
    expectRows(runCalculatorPairing(phantom, empty()), [
      { phenotype: "ヘテロ ファントム", probability: 1 },
    ]);
    expectRows(runCalculatorPairing(patternless, empty()), [
      { phenotype: "ヘテロ パターンレス", probability: 1 },
    ]);
    expectRows(runCalculatorPairing(phantom, patternless), [
      {
        phenotype: "ヘテロ ファントム / ヘテロ パターンレス",
        probability: 1,
      },
    ]);
  });
});
