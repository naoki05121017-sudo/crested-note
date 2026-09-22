import { describe, expect, it } from "vitest";
import {
  addCalculatorTrait,
  collectVisualTagsForPairing,
  hydrateParentForPairing,
  runCalculatorPairing,
  uiTagsForPairing,
  type CalculatorParentState,
} from "@/app/components/calculator-pairing";
import { calculatorTraitOptions } from "@/app/components/calculator-traits";
import { calculatePairing } from "@/lib/genetics";

function option(id: string) {
  const found = calculatorTraitOptions().find((row) => row.id === id);
  if (!found) throw new Error(`missing option ${id}`);
  return found;
}

function emptyParent(): CalculatorParentState {
  return { genotype: {}, visualTags: [], addedTraits: [] };
}

function prob(
  result: ReturnType<typeof runCalculatorPairing>,
  phenotype: string,
) {
  return result.outcomes.find((row) => row.phenotype === phenotype)?.probability ?? 0;
}

function screenRows(result: ReturnType<typeof runCalculatorPairing>) {
  return result.outcomes.map((row) => ({
    phenotype: row.phenotype,
    probability: row.probability,
    copies: row.copies,
  }));
}

describe("calculator UI pairing path (遺伝を計算する)", () => {
  it("matches the 遺伝を計算する button: calculatePairing(hydrated.genotype, { visualA/B from ui tags })", () => {
    const displayed: CalculatorParentState = {
      genotype: {},
      visualTags: [],
      addedTraits: ["sable"],
    };
    const a = hydrateParentForPairing(displayed);
    const b = hydrateParentForPairing(displayed);
    const result = calculatePairing(a.genotype, b.genotype, {
      visualA: uiTagsForPairing(a),
      visualB: uiTagsForPairing(b),
    });
    expect(uiTagsForPairing(a)).toContain("sable");
    expect(a.genotype.cappuccino).toBe("het");
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(prob(result, "セーブル")).toBeCloseTo(0.5);
    expect(prob(result, "スーパーセーブル")).toBeCloseTo(0.25);
    const cap = result.loci.find((row) => row.locusId === "cappuccino");
    expect(cap?.nameJa).toBe("セーブル");
    expect(cap?.outcomes.map((row) => row.label).sort()).toEqual(
      ["ノーマル", "セーブル", "スーパーセーブル"].sort(),
    );
    expect(result.outcomes.some((row) => row.phenotype.includes("het セーブル"))).toBe(
      false,
    );
  });

  it("セーブル × セーブル (手入力の選択表示だけでも計算する)", () => {
    const displayedOnly: CalculatorParentState = {
      genotype: {},
      visualTags: [],
      addedTraits: ["sable"],
    };
    const hydrated = hydrateParentForPairing(displayedOnly);
    expect(hydrated.visualTags).toContain("sable");
    expect(hydrated.genotype.cappuccino).toBe("het");
    expect(hydrated.genotype.sable).toBeUndefined();

    const result = runCalculatorPairing(displayedOnly, displayedOnly);
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(prob(result, "セーブル")).toBeCloseTo(0.5);
    expect(prob(result, "スーパーセーブル")).toBeCloseTo(0.25);
    expect(
      prob(result, "ノーマル") +
        prob(result, "セーブル") +
        prob(result, "スーパーセーブル"),
    ).toBeCloseTo(1);
  });

  it("セーブル × セーブル via picker addCalculatorTrait", () => {
    const father = addCalculatorTrait(emptyParent(), option("sable"));
    const mother = addCalculatorTrait(emptyParent(), option("sable"));
    const result = runCalculatorPairing(father, mother);
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(prob(result, "セーブル")).toBeCloseTo(0.5);
    expect(prob(result, "スーパーセーブル")).toBeCloseTo(0.25);
  });

  it("adds Sable as a visual tag on the cappuccino seat, not as a fake locus", () => {
    const next = addCalculatorTrait(emptyParent(), option("sable"));
    expect(next.addedTraits).toEqual(["sable"]);
    expect(next.visualTags).toEqual(["sable"]);
    expect(next.genotype.sable).toBeUndefined();
    expect(next.genotype.cappuccino).toBe("het");
    expect(collectVisualTagsForPairing(next)).toEqual(["sable"]);
  });

  it("keeps an other-group morph such as Soft Scale on the parent after pick", () => {
    const next = addCalculatorTrait(emptyParent(), option("softScale"));
    expect(option("softScale").kind).toBe("visual");
    expect(next.addedTraits).toEqual(["softScale"]);
    expect(next.visualTags).toEqual(["softScale"]);
  });

  it("リリーホワイト × ノーマル", () => {
    const father = addCalculatorTrait(emptyParent(), option("lillyWhite"));
    const result = runCalculatorPairing(father, emptyParent());
    expect(prob(result, "ノーマル")).toBeCloseTo(0.5);
    expect(prob(result, "リリーホワイト")).toBeCloseTo(0.5);
  });

  it("セーブル × ノーマル", () => {
    const mother = addCalculatorTrait(emptyParent(), option("sable"));
    const result = runCalculatorPairing(emptyParent(), mother);
    expect(prob(result, "ノーマル")).toBeCloseTo(0.5);
    expect(prob(result, "セーブル")).toBeCloseTo(0.5);
  });

  it("実機経路: ギルティ（リリーホワイト）× 仮想セーブル", () => {
    const guilty: CalculatorParentState = {
      genotype: { lillyWhite: "het" },
      visualTags: [],
      addedTraits: ["lillyWhite"],
    };
    const virtualSable = addCalculatorTrait(emptyParent(), option("sable"));
    const result = runCalculatorPairing(guilty, virtualSable);
    const rows = screenRows(result);
    expect(rows.map((row) => row.phenotype).sort()).toEqual(
      ["セーブル", "ノーマル", "リリーセーブル", "リリーホワイト"].sort(),
    );
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(prob(result, "セーブル")).toBeCloseTo(0.25);
    expect(prob(result, "リリーホワイト")).toBeCloseTo(0.25);
    expect(prob(result, "リリーセーブル")).toBeCloseTo(0.25);
    const combo = rows.find((row) => row.phenotype === "リリーセーブル");
    expect(combo?.copies.lillyWhite).toBe(1);
    expect(combo?.copies.cappuccino).toBe(1);
  });

  it("セーブル × リリーホワイト", () => {
    const father = addCalculatorTrait(emptyParent(), option("sable"));
    const mother = addCalculatorTrait(emptyParent(), option("lillyWhite"));
    const result = runCalculatorPairing(father, mother);
    expect(prob(result, "リリーセーブル")).toBeCloseTo(0.25);
    expect(prob(result, "セーブル")).toBeCloseTo(0.25);
  });

  it("ファントム（見た目）× リリーホワイト", () => {
    let father = addCalculatorTrait(emptyParent(), option("phantom"));
    father = {
      ...father,
      genotype: { ...father.genotype, phantom: "visual" },
    };
    const mother = addCalculatorTrait(emptyParent(), option("lillyWhite"));
    const result = runCalculatorPairing(father, mother);
    expect(prob(result, "het ファントム")).toBeCloseTo(0.5);
    expect(prob(result, "リリーホワイト het ファントム")).toBeCloseTo(0.5);
  });

  it("リリーホワイト × ファントム（見た目）", () => {
    const father = addCalculatorTrait(emptyParent(), option("lillyWhite"));
    let mother = addCalculatorTrait(emptyParent(), option("phantom"));
    mother = {
      ...mother,
      genotype: { ...mother.genotype, phantom: "visual" },
    };
    const result = runCalculatorPairing(father, mother);
    expect(prob(result, "het ファントム")).toBeCloseTo(0.5);
    expect(prob(result, "リリーホワイト het ファントム")).toBeCloseTo(0.5);
  });

  it("maps a sable genotype key the way the old UI sent it (no visualTags)", () => {
    const result = calculatePairing(
      { lillyWhite: "het" },
      { sable: "het" },
    );
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(prob(result, "セーブル")).toBeCloseTo(0.25);
    expect(prob(result, "リリーホワイト")).toBeCloseTo(0.25);
    expect(prob(result, "リリーセーブル")).toBeCloseTo(0.25);
    expect(result.unrecognizedLocusIds).toEqual([]);
  });
});
