import { describe, expect, it } from "vitest";
import { calculatePairing } from "./calculate";
import { LOCI, VISUAL_TRAITS, getLocus, getLocusGenotype } from "./catalog";
import { formatProbability } from "./format";
import { formatGenotypeDetail } from "./display";
import { formatGenotypeLabel, phenotypeName } from "./phenotype";
import { gameteDistribution, offspringGenotypeDistribution } from "./punnett";
import type { PairingResult } from "./types";

function prob(result: PairingResult, phenotype: string) {
  return (
    result.outcomes.find((row) => row.phenotype === phenotype)?.probability ?? 0
  );
}

function total(result: PairingResult) {
  return result.outcomes.reduce((sum, row) => sum + row.probability, 0);
}

function names(result: PairingResult) {
  return result.outcomes.map((row) => row.phenotype);
}

function locusProb(
  result: PairingResult,
  locusId: string,
  genotypeId: string,
): number {
  const locus = result.loci.find((row) => row.locusId === locusId);
  return (
    locus?.outcomes.find((row) => row.genotypeId === genotypeId)?.probability ??
    0
  );
}

describe("catalog integrity", () => {
  it("has unique locus ids", () => {
    const ids = LOCI.map((locus) => locus.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique visual trait ids and none of them are calculable", () => {
    const ids = VISUAL_TRAITS.map((trait) => trait.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(getLocus(id)).toBeUndefined();
  });

  it("gives every locus a wild genotype and unique genotype ids", () => {
    for (const locus of LOCI) {
      expect(locus.genotypes.filter((row) => row.wild)).toHaveLength(1);
      const ids = locus.genotypes.map((row) => row.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("enumerates every unordered allele pair exactly once", () => {
    for (const locus of LOCI) {
      const alleles = locus.alleles.map((row) => row.id);
      const expected = (alleles.length * (alleles.length + 1)) / 2;
      expect(locus.genotypes).toHaveLength(expected);
    }
  });

  it("maps every certain state onto a real genotype", () => {
    for (const locus of LOCI) {
      for (const state of locus.states) {
        for (const row of state.mixture) {
          expect(getLocusGenotype(locus.id, row.genotypeId)).toBeTruthy();
        }
        const sum = state.mixture.reduce((acc, row) => acc + row.weight, 0);
        expect(sum).toBeCloseTo(1);
      }
    }
  });

  it("only marks recessive heterozygotes as carriers", () => {
    for (const locus of LOCI) {
      for (const genotype of locus.genotypes) {
        if (!genotype.carrier) continue;
        expect(locus.inheritance).toBe("recessive");
      }
    }
  });

  it("keeps cappuccino, sable and highway on one allelic seat", () => {
    expect(getLocus("sable")).toBeUndefined();
    expect(getLocus("highway")).toBeUndefined();
    const capp = getLocus("cappuccino");
    expect(capp?.inheritance).toBe("allelic_series");
    expect(capp?.alleles.map((row) => row.id)).toEqual([
      "N",
      "Capp",
      "Sable",
      "Highway",
    ]);
    expect(capp?.genotypes.map((row) => row.id)).toEqual([
      "wild",
      "cappuccino",
      "sable",
      "highway",
      "superCappuccino",
      "superSable",
      "superHighway",
      "luwak",
      "cappHighway",
      "sableHighway",
    ]);
  });
});

describe("gametes", () => {
  it("splits an allelic heterozygote evenly", () => {
    const capp = getLocus("cappuccino")!;
    expect([...gameteDistribution(capp, "sable")]).toEqual([
      ["N", 0.5],
      ["Sable", 0.5],
    ]);
    expect([...gameteDistribution(capp, "luwak")]).toEqual([
      ["Capp", 0.5],
      ["Sable", 0.5],
    ]);
  });

  it("treats a 50% possible het as a weighted mixture", () => {
    const phantom = getLocus("phantom")!;
    const gametes = gameteDistribution(phantom, "possible_50");
    expect(gametes.get("a")).toBeCloseTo(0.25);
    expect(gametes.get("A")).toBeCloseTo(0.75);
  });

  it("crosses recessive hets 1 : 2 : 1", () => {
    const phantom = getLocus("phantom")!;
    const rows = offspringGenotypeDistribution(phantom, "het", "het");
    const byId = Object.fromEntries(
      rows.map((row) => [row.genotypeId, row.probability]),
    );
    expect(byId.wild).toBeCloseTo(0.25);
    expect(byId.het).toBeCloseTo(0.5);
    expect(byId.visual).toBeCloseTo(0.25);
  });
});

describe("required pairing cases", () => {
  it("1. セーブル × セーブル", () => {
    const result = calculatePairing(
      { cappuccino: "sable" },
      { cappuccino: "sable" },
    );
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(prob(result, "セーブル")).toBeCloseTo(0.5);
    expect(prob(result, "スーパーセーブル")).toBeCloseTo(0.25);
    expect(total(result)).toBeCloseTo(1);
    expect(names(result).join(" ")).not.toMatch(/het|ヘテロ/);
  });

  it("2. セーブル × リリーホワイト never produces a het sable", () => {
    const result = calculatePairing(
      { cappuccino: "sable" },
      { lillyWhite: "het" },
    );
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(prob(result, "セーブル")).toBeCloseTo(0.25);
    expect(prob(result, "リリーホワイト")).toBeCloseTo(0.25);
    expect(prob(result, "セーブル・リリーホワイト")).toBeCloseTo(0.25);
    expect(total(result)).toBeCloseTo(1);
    const rendered = [
      ...names(result),
      ...result.outcomes.map((row) => row.detail),
      ...result.loci.flatMap((locus) =>
        locus.outcomes.map((row) => row.label),
      ),
    ].join(" ");
    expect(rendered).not.toContain("het セーブル");
    expect(rendered).not.toContain("ヘテロ セーブル");
  });

  it("3. リリーホワイト × リリーホワイト", () => {
    const result = calculatePairing(
      { lillyWhite: "het" },
      { lillyWhite: "het" },
    );
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(prob(result, "リリーホワイト")).toBeCloseTo(0.5);
    expect(prob(result, "スーパーリリーホワイト")).toBeCloseTo(0.25);
    const warning = result.warnings.find((row) => row.id === "superLillyWhite");
    expect(warning?.probability).toBeCloseTo(0.25);
  });

  it("4. カプチーノ × セーブル makes Luwak, not a double het", () => {
    const result = calculatePairing(
      { cappuccino: "cappuccino" },
      { cappuccino: "sable" },
    );
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(prob(result, "カプチーノ")).toBeCloseTo(0.25);
    expect(prob(result, "セーブル")).toBeCloseTo(0.25);
    expect(prob(result, "ルアク")).toBeCloseTo(0.25);
    expect(
      result.warnings.find((row) => row.id === "luwak")?.probability,
    ).toBeCloseTo(0.25);
  });

  it("5. ハイウェイ × セーブル", () => {
    const result = calculatePairing(
      { cappuccino: "highway" },
      { cappuccino: "sable" },
    );
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(prob(result, "ハイウェイ")).toBeCloseTo(0.25);
    expect(prob(result, "セーブル")).toBeCloseTo(0.25);
    expect(prob(result, "セーブル / ハイウェイ")).toBeCloseTo(0.25);
  });

  it("6. カプチーノ × ハイウェイ", () => {
    const result = calculatePairing(
      { cappuccino: "cappuccino" },
      { cappuccino: "highway" },
    );
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(prob(result, "カプチーノ")).toBeCloseTo(0.25);
    expect(prob(result, "ハイウェイ")).toBeCloseTo(0.25);
    expect(prob(result, "カプチーノ / ハイウェイ")).toBeCloseTo(0.25);
    expect(
      result.warnings.find((row) => row.id === "cappHighway")?.probability,
    ).toBeCloseTo(0.25);
  });

  it("7. アザンティック × ノーマル is 100% het", () => {
    const result = calculatePairing({ axanthicTug: "visual" }, {});
    expect(prob(result, "ヘテロ アザンティック (TUG)")).toBeCloseTo(1);
    expect(prob(result, "アザンティック (TUG)")).toBe(0);
  });

  it("8. アザンティック × ヘテロ アザンティック is 1 : 1", () => {
    const result = calculatePairing(
      { axanthicTug: "visual" },
      { axanthicTug: "het" },
    );
    expect(prob(result, "アザンティック (TUG)")).toBeCloseTo(0.5);
    expect(prob(result, "ヘテロ アザンティック (TUG)")).toBeCloseTo(0.5);
  });

  it("9. アザンティック × アザンティック is 100% visual", () => {
    const result = calculatePairing(
      { axanthicTug: "visual" },
      { axanthicTug: "visual" },
    );
    expect(prob(result, "アザンティック (TUG)")).toBeCloseTo(1);
  });

  it("10. ファントム × ファントム", () => {
    const visual = calculatePairing(
      { phantom: "visual" },
      { phantom: "visual" },
    );
    expect(prob(visual, "ファントム")).toBeCloseTo(1);

    const het = calculatePairing({ phantom: "het" }, { phantom: "het" });
    expect(prob(het, "ファントム")).toBeCloseTo(0.25);
    expect(prob(het, "ヘテロ ファントム")).toBeCloseTo(0.5);
    expect(prob(het, "ノーマル")).toBeCloseTo(0.25);
  });

  it("11. チョチョ × チョチョ is recessive, not a display-only trait", () => {
    const result = calculatePairing({ chocho: "het" }, { chocho: "het" });
    expect(prob(result, "チョチョ")).toBeCloseTo(0.25);
    expect(prob(result, "ヘテロ チョチョ")).toBeCloseTo(0.5);
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
  });

  it("12. リリーホワイト × アザンティック", () => {
    const result = calculatePairing(
      { lillyWhite: "het" },
      { axanthicTug: "visual" },
    );
    expect(prob(result, "ヘテロ アザンティック (TUG)")).toBeCloseTo(0.5);
    expect(
      prob(result, "リリーホワイト ヘテロ アザンティック (TUG)"),
    ).toBeCloseTo(0.5);
    expect(total(result)).toBeCloseTo(1);
  });

  it("13. リリーホワイト × ファントム", () => {
    const result = calculatePairing(
      { lillyWhite: "het" },
      { phantom: "visual" },
    );
    expect(prob(result, "ヘテロ ファントム")).toBeCloseTo(0.5);
    expect(prob(result, "リリーホワイト ヘテロ ファントム")).toBeCloseTo(0.5);
    expect(prob(result, "リリーホワイト")).toBe(0);
  });

  it("14. 複数遺伝形質を持つ親同士 keeps every locus", () => {
    const result = calculatePairing(
      { lillyWhite: "het", phantom: "visual", cappuccino: "sable" },
      { phantom: "het", patternless: "het", cappuccino: "highway" },
    );
    expect(total(result)).toBeCloseTo(1);

    for (const locusId of [
      "lillyWhite",
      "phantom",
      "patternless",
      "cappuccino",
    ]) {
      const locus = result.loci.find((row) => row.locusId === locusId);
      expect(locus?.outcomes.some((row) => !row.wild)).toBe(true);
    }

    expect(locusProb(result, "cappuccino", "sableHighway")).toBeCloseTo(0.25);
    expect(locusProb(result, "cappuccino", "sable")).toBeCloseTo(0.25);
    expect(locusProb(result, "cappuccino", "highway")).toBeCloseTo(0.25);
    expect(locusProb(result, "cappuccino", "wild")).toBeCloseTo(0.25);
    expect(locusProb(result, "phantom", "visual")).toBeCloseTo(0.5);
    expect(locusProb(result, "patternless", "het")).toBeCloseTo(0.5);

    const richest = result.outcomes.find(
      (row) =>
        row.genotype.lillyWhite === "het" &&
        row.genotype.phantom === "visual" &&
        row.genotype.patternless === "het" &&
        row.genotype.cappuccino === "sableHighway",
    );
    expect(richest?.probability).toBeCloseTo(1 / 32);
    expect(richest?.phenotype).toBe(
      "ファントム・セーブル / ハイウェイ・リリーホワイト ヘテロ パターンレス",
    );
  });
});

describe("probability hygiene", () => {
  it("never emits a zero row and always sums to one", () => {
    const pairs: [Record<string, string>, Record<string, string>][] = [
      [{}, {}],
      [{ cappuccino: "sable" }, { cappuccino: "sable" }],
      [{ cappuccino: "luwak" }, { cappuccino: "highway" }],
      [{ lillyWhite: "visual" }, { lillyWhite: "het" }],
      [{ phantom: "possible_66" }, { phantom: "het" }],
      [
        { lillyWhite: "het", phantom: "het", emptyBack: "het" },
        { phantom: "visual", superStripe: "het", cappuccino: "cappuccino" },
      ],
    ];
    for (const [a, b] of pairs) {
      const result = calculatePairing(a, b);
      expect(total(result)).toBeCloseTo(1);
      for (const row of result.outcomes) expect(row.probability).toBeGreaterThan(0);
      expect(new Set(names(result)).size).toBe(result.outcomes.length);
    }
  });

  it("keeps the summary row and the detail column on the same genotype", () => {
    const result = calculatePairing(
      { cappuccino: "sable", lillyWhite: "het" },
      { phantom: "het" },
    );
    for (const row of result.outcomes) {
      expect(row.detail).toBe(formatGenotypeDetail(row.genotype));
      expect(row.phenotype).toBe(phenotypeName(row.genotype));
    }
  });

  it("merges identical phenotypes into one row", () => {
    const result = calculatePairing(
      { axanthicTug: "het" },
      { axanthicTug: "het" },
    );
    expect(result.outcomes).toHaveLength(3);
  });
});

describe("legacy input", () => {
  it("reads the old cappuccino-as-recessive records", () => {
    const result = calculatePairing({ cappuccino: "het" }, {});
    expect(prob(result, "カプチーノ")).toBeCloseTo(0.5);
    expect(prob(result, "ノーマル")).toBeCloseTo(0.5);

    const luwakParent = calculatePairing({ cappuccino: "visual" }, {});
    expect(prob(luwakParent, "カプチーノ")).toBeCloseTo(1);
  });

  it("reads the old sable pseudo-locus and sable trait tag", () => {
    const viaKey = calculatePairing({ sable: "het" }, {});
    expect(prob(viaKey, "セーブル")).toBeCloseTo(0.5);
    expect(viaKey.unrecognizedLocusIds).toEqual([]);

    const viaTag = calculatePairing({}, {}, { traitsB: ["sable"] });
    expect(prob(viaTag, "セーブル")).toBeCloseTo(0.5);

    const viaBoth = calculatePairing(
      { cappuccino: "visual" },
      {},
      { traitsA: ["sable"] },
    );
    expect(prob(viaBoth, "セーブル")).toBeCloseTo(1);
  });

  it("reports keys that are not part of the maths", () => {
    const result = calculatePairing({ madeUpGene: "het" }, {});
    expect(result.unrecognizedLocusIds).toEqual(["madeUpGene"]);
    expect(prob(result, "ノーマル")).toBe(1);
  });
});

describe("parent labels", () => {
  it("labels a recorded sable as セーブル, never het", () => {
    expect(formatGenotypeLabel({ cappuccino: "sable" })).toBe("セーブル");
    expect(formatGenotypeLabel({ sable: "het" })).toBe("セーブル");
    expect(formatGenotypeLabel({ cappuccino: "luwak" })).toBe("ルアク");
  });

  it("labels possible hets", () => {
    expect(formatGenotypeLabel({ phantom: "possible_50" })).toBe(
      "50%ヘテロ ファントム",
    );
  });

  it("names the Lilly White copies the way the reference does", () => {
    expect(formatGenotypeLabel({ lillyWhite: "het" })).toBe("リリーホワイト");
    expect(formatGenotypeLabel({ lillyWhite: "visual" })).toBe(
      "スーパーリリーホワイト",
    );
  });

  it("uses the community name for cappuccino plus lilly white", () => {
    expect(
      formatGenotypeLabel({ cappuccino: "cappuccino", lillyWhite: "het" }),
    ).toBe("フラペチーノ");
  });

  it("shows breeder notation in the detail line", () => {
    expect(
      formatGenotypeDetail({ cappuccino: "sable", lillyWhite: "het" }),
    ).toBe("セーブル（N/Sable）、リリーホワイト（NLW）");
  });
});

describe("formatProbability", () => {
  it("formats common ratios", () => {
    expect(formatProbability(1)).toBe("100%");
    expect(formatProbability(0.5)).toBe("50.0%");
    expect(formatProbability(0.25)).toBe("25.0%");
    expect(formatProbability(1 / 3)).toBe("33.3%");
  });
});
