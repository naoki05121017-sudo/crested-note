import { describe, expect, it } from "vitest";
import { calculatePairing } from "./calculate";
import { LOCI, VISUAL_TRAITS } from "./catalog";
import { formatProbability, geneStatusLabelJa } from "./format";
import { formatGenotypeLabel } from "./phenotype";
import { offspringCopyDistribution } from "./punnett";

function prob(result: ReturnType<typeof calculatePairing>, phenotype: string) {
  return (
    result.outcomes.find((row) => row.phenotype === phenotype)?.probability ?? 0
  );
}

describe("catalog", () => {
  it("has unique locus ids", () => {
    const ids = LOCI.map((locus) => locus.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique visual trait ids", () => {
    const ids = VISUAL_TRAITS.map((trait) => trait.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("requires superNameJa for incomplete dominant loci", () => {
    for (const locus of LOCI) {
      if (locus.inheritance === "incomplete_dominant") {
        expect(locus.superNameJa).toBeTruthy();
      }
    }
  });

  it("does not treat unconfirmed Soft Scale as a Mendelian locus", () => {
    expect(LOCI.some((locus) => locus.id === "softScale")).toBe(false);
  });

  it("does not treat sable or highway as independent calculable loci", () => {
    expect(LOCI.some((locus) => locus.id === "sable")).toBe(false);
    expect(LOCI.some((locus) => locus.id === "highway")).toBe(false);
    expect(LOCI.some((locus) => locus.id === "chocho")).toBe(true);
  });

  it("keeps cappuccino as the calculable seat for the allelic series", () => {
    expect(LOCI.find((locus) => locus.id === "cappuccino")?.alleleGroup).toBe(
      "cappuccino",
    );
  });
});

describe("offspringCopyDistribution", () => {
  it("het × het is 1:2:1", () => {
    expect(offspringCopyDistribution("het", "het")).toEqual({
      0: 0.25,
      1: 0.5,
      2: 0.25,
    });
  });

  it("visual × wild is 100% het", () => {
    expect(offspringCopyDistribution("visual", "wild")).toEqual({
      0: 0,
      1: 1,
      2: 0,
    });
  });

  it("50% het × wild is 25% het", () => {
    const dist = offspringCopyDistribution("possible_50", "wild");
    expect(dist[0]).toBeCloseTo(0.75);
    expect(dist[1]).toBeCloseTo(0.25);
    expect(dist[2]).toBe(0);
  });

  it("66% het × wild is 1/3 het", () => {
    const dist = offspringCopyDistribution("possible_66", "wild");
    expect(dist[0]).toBeCloseTo(2 / 3);
    expect(dist[1]).toBeCloseTo(1 / 3);
    expect(dist[2]).toBe(0);
  });
});

describe("calculatePairing", () => {
  it("two wild parents yield 100% ノーマル", () => {
    const result = calculatePairing({}, {});
    expect(result.outcomes[0]?.phenotype).toBe("ノーマル");
    expect(result.outcomes[0]?.probability).toBe(1);
    expect(result.outcomes).toHaveLength(1);
    expect(result.warnings).toEqual([]);
  });

  it("het phantom × het phantom", () => {
    const result = calculatePairing(
      { phantom: "het" },
      { phantom: "het" },
    );
    expect(prob(result, "ファントム")).toBeCloseTo(0.25);
    expect(prob(result, "ヘテロ ファントム")).toBeCloseTo(0.5);
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
  });

  it("Lilly White × Lilly White includes super", () => {
    const result = calculatePairing(
      { lillyWhite: "het" },
      { lillyWhite: "het" },
    );
    expect(prob(result, "スーパーリリーホワイト")).toBeCloseTo(0.25);
    expect(prob(result, "リリーホワイト")).toBeCloseTo(0.5);
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(
      result.warnings.some((warning) => warning.id === "superLillyWhite"),
    ).toBe(true);
  });

  it("combines visual Lilly White with het phantom", () => {
    const result = calculatePairing(
      { lillyWhite: "het", phantom: "het" },
      { phantom: "visual" },
    );
    expect(prob(result, "ファントム・リリーホワイト")).toBeCloseTo(0.25);
    expect(prob(result, "リリーホワイト（ヘテロ ファントム）")).toBeCloseTo(0.25);
    expect(prob(result, "ファントム")).toBeCloseTo(0.25);
    expect(prob(result, "ヘテロ ファントム")).toBeCloseTo(0.25);
  });

  it("warns on super cappuccino and sable", () => {
    const result = calculatePairing(
      { lillyWhite: "het", cappuccino: "het" },
      { cappuccino: "het" },
    );
    const superCapp = result.warnings.find((w) => w.id === "superCappuccino");
    const sable = result.warnings.find((w) => w.id === "lillyWhiteCappuccino");
    expect(superCapp?.probability).toBeCloseTo(0.25);
    expect(sable?.probability).toBeCloseTo(0.125);
    expect(superCapp?.severity).toBe("danger");
  });

  it("names super cappuccino from two Capp alleles, not luwak", () => {
    const result = calculatePairing(
      { cappuccino: "visual" },
      { cappuccino: "visual" },
    );
    expect(prob(result, "スーパーカプチーノ")).toBeCloseTo(1);
  });

  it("names ソラク from lilly white plus super cappuccino", () => {
    const result = calculatePairing(
      { lillyWhite: "het", cappuccino: "visual" },
      { cappuccino: "visual" },
    );
    expect(prob(result, "ソラク")).toBeCloseTo(0.5);
    expect(prob(result, "スーパーカプチーノ")).toBeCloseTo(0.5);
  });

  it("names axanthic phantom combo from existing loci", () => {
    const result = calculatePairing(
      { phantom: "visual", axanthicTug: "visual" },
      { phantom: "visual", axanthicTug: "visual" },
    );
    expect(prob(result, "アザンティック・ファントム")).toBeCloseTo(1);
  });

  it("maps Sable visual tags onto the cappuccino seat without a new locus", () => {
    expect(LOCI.some((locus) => locus.id === "sable")).toBe(false);
    const result = calculatePairing(
      { lillyWhite: "het" },
      {},
      { visualB: ["sable"] },
    );
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(prob(result, "セーブル")).toBeCloseTo(0.25);
    expect(prob(result, "リリーホワイト")).toBeCloseTo(0.25);
    expect(prob(result, "リリーセーブル")).toBeCloseTo(0.25);
  });

  it("labels sable × sable from the same copy counts as the locus breakdown", () => {
    const result = calculatePairing({}, {}, { visualA: ["sable"], visualB: ["sable"] });
    expect(prob(result, "ノーマル")).toBeCloseTo(0.25);
    expect(prob(result, "セーブル")).toBeCloseTo(0.5);
    expect(prob(result, "スーパーセーブル")).toBeCloseTo(0.25);
    expect(result.outcomes.some((row) => row.phenotype.includes("het"))).toBe(false);
    const cap = result.loci.find((row) => row.locusId === "cappuccino");
    expect(cap?.outcomes.map((row) => [row.copies, row.label])).toEqual(
      expect.arrayContaining([
        [0, "ノーマル"],
        [1, "セーブル"],
        [2, "スーパーセーブル"],
      ]),
    );
    for (const row of result.outcomes) {
      const copies = row.copies.cappuccino ?? 0;
      const locusLabel = cap?.outcomes.find((item) => item.copies === copies)?.label;
      expect(row.phenotype).toBe(locusLabel);
    }
  });

  it("reports unrecognized locus ids without breaking math", () => {
    const result = calculatePairing({ madeUpGene: "het" }, {});
    expect(result.unrecognizedLocusIds).toEqual(["madeUpGene"]);
    expect(prob(result, "ノーマル")).toBe(1);
  });
});

describe("formatGenotypeLabel", () => {
  it("labels possible hets", () => {
    expect(formatGenotypeLabel({ phantom: "possible_50" })).toBe(
      "50%ヘテロ ファントム",
    );
  });
});

describe("geneStatusLabelJa", () => {
  it("labels Lilly White without het/hom wording", () => {
    expect(geneStatusLabelJa("wild", "incomplete_dominant", "リリーホワイト")).toBe(
      "なし",
    );
    expect(geneStatusLabelJa("het", "incomplete_dominant", "リリーホワイト")).toBe(
      "リリーホワイト（見た目に出る）",
    );
    expect(geneStatusLabelJa("visual", "incomplete_dominant", "リリーホワイト")).toBe(
      "スーパーリリー ⚠️",
    );
    expect(geneStatusLabelJa("het", "incomplete_dominant", "セーブル")).toBe(
      "セーブル（見た目に出る）",
    );
    expect(geneStatusLabelJa("visual", "incomplete_dominant", "セーブル")).toBe(
      "スーパーセーブル",
    );
  });

  it("labels recessive visual as morph name, not ホモ", () => {
    expect(geneStatusLabelJa("het", "recessive", "アザンティック (TUG)")).toBe(
      "ヘテロ（隠れて持つ）",
    );
    expect(geneStatusLabelJa("visual", "recessive", "アザンティック (TUG)")).toBe(
      "アザンティック（見た目に出る）",
    );
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
