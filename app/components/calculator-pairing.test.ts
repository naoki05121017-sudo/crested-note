import { describe, expect, it } from "vitest";
import {
  addCalculatorTrait,
  collectTraitsForPairing,
  emptyParentState,
  hydrateParentForPairing,
  removeCalculatorTrait,
  runCalculatorPairing,
  setLocusState,
  type CalculatorParentState,
} from "@/app/components/calculator-pairing";
import {
  calculatorTraitOptions,
  rowIdForOption,
} from "@/app/components/calculator-traits";
import { calculatePairing, phenotypeName } from "@/lib/genetics";

function option(id: string) {
  const found = calculatorTraitOptions().find((row) => row.id === id);
  if (!found) throw new Error(`missing option ${id}`);
  return found;
}

function prob(
  result: ReturnType<typeof runCalculatorPairing>,
  phenotype: string,
) {
  return (
    result.outcomes.find((row) => row.phenotype === phenotype)?.probability ?? 0
  );
}

function rendered(result: ReturnType<typeof runCalculatorPairing>) {
  return [
    ...result.outcomes.map((row) => row.phenotype),
    ...result.outcomes.map((row) => row.detail),
    ...result.loci.flatMap((locus) => [
      locus.parentALabel,
      locus.parentBLabel,
      ...locus.outcomes.map((row) => row.label),
    ]),
  ].join(" | ");
}

describe("calculator UI pairing path (遺伝を計算する)", () => {
  it("picks セーブル straight onto the allelic seat", () => {
    const next = addCalculatorTrait(emptyParentState(), option("sable"));
    expect(next.genotype).toEqual({ cappuccino: "sable" });
    expect(next.addedTraits).toEqual(["cappuccino"]);
    expect(next.traits).toEqual([]);
    expect(rowIdForOption(option("sable"))).toBe("cappuccino");
  });

  it("セーブル × セーブル", () => {
    const parent = addCalculatorTrait(emptyParentState(), option("sable"));
    const result = runCalculatorPairing(parent, parent);
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(prob(result, "セーブル")).toBeCloseTo(0.5);
    expect(prob(result, "スーパーセーブル")).toBeCloseTo(0.25);
    expect(rendered(result)).not.toMatch(/ヘテロ セーブル|het セーブル/);
  });

  it("セーブル × リリーホワイト", () => {
    const father = addCalculatorTrait(emptyParentState(), option("sable"));
    const mother = addCalculatorTrait(emptyParentState(), option("lillyWhite"));
    const result = runCalculatorPairing(father, mother);
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(prob(result, "セーブル")).toBeCloseTo(0.25);
    expect(prob(result, "リリーホワイト")).toBeCloseTo(0.25);
    expect(prob(result, "セーブル・リリーホワイト")).toBeCloseTo(0.25);
    expect(rendered(result)).not.toMatch(/ヘテロ セーブル|het セーブル/);
  });

  it("リリーホワイト × リリーホワイト", () => {
    const parent = addCalculatorTrait(emptyParentState(), option("lillyWhite"));
    const result = runCalculatorPairing(parent, parent);
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(prob(result, "リリーホワイト")).toBeCloseTo(0.5);
    expect(prob(result, "スーパーリリーホワイト")).toBeCloseTo(0.25);
  });

  it("swapping the picked allele keeps one row on the seat", () => {
    let parent = addCalculatorTrait(emptyParentState(), option("sable"));
    parent = setLocusState(parent, "cappuccino", "luwak");
    parent = hydrateParentForPairing(parent);
    expect(parent.addedTraits).toEqual(["cappuccino"]);
    expect(parent.genotype).toEqual({ cappuccino: "luwak" });
    const result = runCalculatorPairing(parent, emptyParentState());
    expect(prob(result, "カプチーノ")).toBeCloseTo(0.5);
    expect(prob(result, "セーブル")).toBeCloseTo(0.5);
  });

  it("hides the other allele shortcuts once the seat is taken", () => {
    const parent = addCalculatorTrait(emptyParentState(), option("sable"));
    const available = calculatorTraitOptions().filter(
      (row) => !parent.addedTraits.includes(rowIdForOption(row)),
    );
    expect(available.map((row) => row.id)).not.toContain("cappuccino");
    expect(available.map((row) => row.id)).not.toContain("highway");
  });

  it("removing a morph clears its locus", () => {
    let parent = addCalculatorTrait(emptyParentState(), option("sable"));
    parent = addCalculatorTrait(parent, option("phantom"));
    parent = removeCalculatorTrait(parent, option("sable"), "cappuccino");
    expect(parent.genotype).toEqual({ phantom: "het" });
    expect(parent.addedTraits).toEqual(["phantom"]);
  });

  it("keeps a polygenic morph on the parent without calculating it", () => {
    const parent = addCalculatorTrait(emptyParentState(), option("softScale"));
    expect(parent.traits).toEqual(["softScale"]);
    expect(parent.genotype).toEqual({});
    expect(collectTraitsForPairing(parent)).toEqual(["softScale"]);
    const result = runCalculatorPairing(parent, parent);
    expect(prob(result, "ノーマル")).toBe(1);
  });

  it("restores rows for an animal loaded from the database", () => {
    const stored: CalculatorParentState = {
      genotype: { lillyWhite: "het", axanthicLava: "het" },
      traits: ["sable", "pinstripe"],
      addedTraits: [],
    };
    const hydrated = hydrateParentForPairing(stored);
    expect(hydrated.genotype).toEqual({
      lillyWhite: "het",
      axanthicLava: "het",
      cappuccino: "sable",
    });
    expect(hydrated.traits).toEqual(["pinstripe"]);
    expect(hydrated.addedTraits).toEqual([
      "axanthic",
      "cappuccino",
      "lillyWhite",
      "pinstripe",
    ]);
  });

  it("matches calculatePairing called directly with the same parents", () => {
    const father = addCalculatorTrait(emptyParentState(), option("sable"));
    const mother = addCalculatorTrait(emptyParentState(), option("phantom"));
    const viaUi = runCalculatorPairing(father, mother);
    const direct = calculatePairing(father.genotype, mother.genotype);
    expect(viaUi.outcomes).toEqual(direct.outcomes);
  });

  it("names every summary row from the row genotype", () => {
    const father = addCalculatorTrait(emptyParentState(), option("cappuccino"));
    const mother = addCalculatorTrait(emptyParentState(), option("lillyWhite"));
    const result = runCalculatorPairing(father, mother);
    for (const row of result.outcomes) {
      expect(row.phenotype).toBe(phenotypeName(row.genotype));
    }
    expect(prob(result, "フラペチーノ")).toBeCloseTo(0.25);
  });
});
