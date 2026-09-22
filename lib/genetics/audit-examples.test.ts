import { describe, expect, it } from "vitest";
import { calculatePairing } from "./calculate";
import { getLocus, LOCI } from "./catalog";
import { offspringGenotypeDistribution } from "./punnett";
import type { PairingResult } from "./types";

/**
 * Cross-check against https://crested-gecko-calc.pages.dev/, which is the
 * source of truth for inheritance mode, allele membership and naming.
 */

function p(result: PairingResult, phenotype: string): number {
  return (
    result.outcomes.find((row) => row.phenotype === phenotype)?.probability ?? 0
  );
}

function distribution(
  locusId: string,
  stateA: string,
  stateB: string,
): Record<string, number> {
  const locus = getLocus(locusId);
  if (!locus) throw new Error(`missing locus ${locusId}`);
  return Object.fromEntries(
    offspringGenotypeDistribution(locus, stateA, stateB).map((row) => [
      row.genotypeId,
      Number(row.probability.toFixed(6)),
    ]),
  );
}

describe("inheritance modes match the reference calculator", () => {
  const expected: Record<string, string> = {
    lillyWhite: "incomplete_dominant",
    emptyBack: "incomplete_dominant",
    cappuccino: "allelic_series",
    axanthicTug: "recessive",
    axanthicMelanistic: "recessive",
    axanthicArv: "recessive",
    axanthicLava: "recessive",
    albino: "recessive",
    chocho: "recessive",
    phantom: "recessive",
    redBase: "recessive",
    superStripe: "recessive",
  };

  for (const [locusId, inheritance] of Object.entries(expected)) {
    it(`${locusId} is ${inheritance}`, () => {
      expect(getLocus(locusId)?.inheritance).toBe(inheritance);
    });
  }

  it("covers every reference locus", () => {
    for (const locusId of Object.keys(expected)) {
      expect(LOCI.some((locus) => locus.id === locusId)).toBe(true);
    }
  });

  it("does not model a polygenic trait as a gene", () => {
    for (const id of [
      "pinstripe",
      "dalmatian",
      "harlequin",
      "flame",
      "tiger",
      "lavender",
      "moonlight",
      "porthole",
      "pied",
      "marbling",
      "softScale",
    ]) {
      expect(getLocus(id)).toBeUndefined();
    }
  });
});

describe("per-locus genotype ratios", () => {
  it("Lilly White × Lilly White is 1 : 2 : 1", () => {
    expect(distribution("lillyWhite", "het", "het")).toEqual({
      wild: 0.25,
      het: 0.5,
      visual: 0.25,
    });
  });

  it("Super Lilly White × normal is 100% Lilly White", () => {
    expect(distribution("lillyWhite", "visual", "wild")).toEqual({ het: 1 });
  });

  it("Empty Back × Empty Back gives a super at 25%", () => {
    expect(distribution("emptyBack", "het", "het")).toEqual({
      wild: 0.25,
      het: 0.5,
      visual: 0.25,
    });
  });

  it("Sable × Sable is 1 : 2 : 1 across the allelic seat", () => {
    expect(distribution("cappuccino", "sable", "sable")).toEqual({
      wild: 0.25,
      sable: 0.5,
      superSable: 0.25,
    });
  });

  it("Luwak × normal splits into Cappuccino and Sable", () => {
    expect(distribution("cappuccino", "luwak", "wild")).toEqual({
      cappuccino: 0.5,
      sable: 0.5,
    });
  });

  it("Luwak × Luwak produces all four supers", () => {
    expect(distribution("cappuccino", "luwak", "luwak")).toEqual({
      superCappuccino: 0.25,
      superSable: 0.25,
      luwak: 0.5,
    });
  });

  it("Sable/Highway × Cappuccino covers the three compounds", () => {
    expect(distribution("cappuccino", "sableHighway", "cappuccino")).toEqual({
      sable: 0.25,
      highway: 0.25,
      luwak: 0.25,
      cappHighway: 0.25,
    });
  });

  it("het Axanthic × het Axanthic is 1 : 2 : 1", () => {
    expect(distribution("axanthicTug", "het", "het")).toEqual({
      wild: 0.25,
      het: 0.5,
      visual: 0.25,
    });
  });
});

describe("combined naming follows the reference", () => {
  it("names Cappuccino plus Lilly White フラペチーノ", () => {
    const result = calculatePairing(
      { cappuccino: "cappuccino" },
      { lillyWhite: "visual" },
    );
    expect(p(result, "フラペチーノ")).toBeCloseTo(0.5);
    expect(p(result, "リリーホワイト")).toBeCloseTo(0.5);
  });

  it("names Sable, Highway and Phantom combos by joining the morphs", () => {
    const sable = calculatePairing(
      { cappuccino: "sable" },
      { lillyWhite: "visual" },
    );
    expect(p(sable, "セーブル・リリーホワイト")).toBeCloseTo(0.5);

    const highway = calculatePairing(
      { cappuccino: "highway" },
      { lillyWhite: "visual" },
    );
    expect(p(highway, "ハイウェイ・リリーホワイト")).toBeCloseTo(0.5);

    const phantom = calculatePairing(
      { phantom: "visual" },
      { phantom: "visual", lillyWhite: "visual" },
    );
    expect(p(phantom, "ファントム・リリーホワイト")).toBeCloseTo(1);
  });

  it("names the axanthic phantom double recessive", () => {
    const result = calculatePairing(
      { phantom: "visual", axanthicTug: "visual" },
      { phantom: "visual", axanthicTug: "visual" },
    );
    expect(p(result, "アザンティック (TUG)・ファントム")).toBeCloseTo(1);
  });

  it("keeps the axanthic lines apart instead of fusing them", () => {
    const cross = calculatePairing(
      { axanthicTug: "visual" },
      { axanthicLava: "visual" },
    );
    expect(
      p(cross, "ヘテロ アザンティック (TUG)・アザンティック (Lava)"),
    ).toBeCloseTo(1);
    expect(p(cross, "アザンティック (TUG)")).toBe(0);
    expect(p(cross, "アザンティック (Lava)")).toBe(0);
  });
});

describe("possible hets are expected values, not certainties", () => {
  it("50% possible het × normal is 25% het", () => {
    const result = calculatePairing({ phantom: "possible_50" }, {});
    expect(p(result, "ヘテロ ファントム")).toBeCloseTo(0.25);
    expect(p(result, "ノーマル")).toBeCloseTo(0.75);
    expect(p(result, "ファントム")).toBe(0);
  });

  it("66% possible het × normal is 1/3 het", () => {
    const result = calculatePairing({ phantom: "possible_66" }, {});
    expect(p(result, "ヘテロ ファントム")).toBeCloseTo(1 / 3);
    expect(p(result, "ノーマル")).toBeCloseTo(2 / 3);
  });
});

describe("health warnings", () => {
  it("flags the allelic supers the reference calls out", () => {
    const luwakPair = calculatePairing(
      { cappuccino: "cappuccino" },
      { cappuccino: "sable" },
    );
    const luwak = luwakPair.warnings.find((row) => row.id === "luwak");
    expect(luwak?.severity).toBe("danger");

    const superCapp = calculatePairing(
      { cappuccino: "cappuccino" },
      { cappuccino: "cappuccino" },
    ).warnings.find((row) => row.id === "superCappuccino");
    expect(superCapp?.severity).toBe("danger");
    expect(superCapp?.probability).toBeCloseTo(0.25);

    const superSable = calculatePairing(
      { cappuccino: "sable" },
      { cappuccino: "sable" },
    ).warnings.find((row) => row.id === "superSable");
    expect(superSable?.severity).toBe("caution");
  });

  it("does not warn when no risky genotype can appear", () => {
    const result = calculatePairing(
      { cappuccino: "sable" },
      { lillyWhite: "het" },
    );
    expect(result.warnings).toEqual([]);
  });
});
