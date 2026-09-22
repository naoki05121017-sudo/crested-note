import { describe, expect, it } from "vitest";
import { calculatePairing } from "./calculate";
import { LOCI } from "./catalog";

function p(
  result: ReturnType<typeof calculatePairing>,
  phenotype: string,
): number {
  return (
    result.outcomes.find((row) => row.phenotype === phenotype)?.probability ?? 0
  );
}

describe("major morph pairing examples", () => {
  it("Lilly White × Lilly White is 1 : 2 : 1 incomplete dominant", () => {
    const result = calculatePairing(
      { lillyWhite: "het" },
      { lillyWhite: "het" },
    );
    expect(p(result, "スーパーリリーホワイト")).toBeCloseTo(0.25);
    expect(p(result, "リリーホワイト")).toBeCloseTo(0.5);
    expect(p(result, "ノーマル")).toBeCloseTo(0.25);
  });

  it("Lilly White (one copy) × wild is 50% Lilly White, not 100%", () => {
    const result = calculatePairing({ lillyWhite: "het" }, {});
    expect(p(result, "リリーホワイト")).toBeCloseTo(0.5);
    expect(p(result, "ノーマル")).toBeCloseTo(0.5);
  });

  it("Super Lilly White × wild is 100% Lilly White", () => {
    const result = calculatePairing({ lillyWhite: "visual" }, {});
    expect(p(result, "リリーホワイト")).toBeCloseTo(1);
  });

  it("het Phantom × het Phantom is 1 : 2 : 1 recessive", () => {
    const result = calculatePairing({ phantom: "het" }, { phantom: "het" });
    expect(p(result, "ファントム")).toBeCloseTo(0.25);
    expect(p(result, "het ファントム")).toBeCloseTo(0.5);
    expect(p(result, "ノーマル")).toBeCloseTo(0.25);
  });

  it("visual Phantom × wild is 100% het (not visual)", () => {
    const result = calculatePairing({ phantom: "visual" }, {});
    expect(p(result, "het ファントム")).toBeCloseTo(1);
    expect(p(result, "ファントム")).toBe(0);
  });

  it("het Patternless × het Patternless matches Phantom math", () => {
    const result = calculatePairing(
      { patternless: "het" },
      { patternless: "het" },
    );
    expect(p(result, "パターンレス")).toBeCloseTo(0.25);
    expect(p(result, "het パターンレス")).toBeCloseTo(0.5);
  });

  it("het Cappuccino × het Cappuccino can produce Luwak at 25%", () => {
    const result = calculatePairing(
      { cappuccino: "het" },
      { cappuccino: "het" },
    );
    expect(p(result, "ルワック（スーパーカプチーノ）")).toBeCloseTo(0.25);
    expect(p(result, "het カプチーノ")).toBeCloseTo(0.5);
    expect(p(result, "ノーマル")).toBeCloseTo(0.25);
    expect(
      result.warnings.find((w) => w.id === "superCappuccino")?.probability,
    ).toBeCloseTo(0.25);
  });

  it("TUG het × TUG het can produce visual TUG; TUG het × Lava het cannot fuse into one axanthic gene", () => {
    const same = calculatePairing(
      { axanthicTug: "het" },
      { axanthicTug: "het" },
    );
    expect(p(same, "アザンティック (TUG)")).toBeCloseTo(0.25);

    const cross = calculatePairing(
      { axanthicTug: "het" },
      { axanthicLava: "het" },
    );
    expect(p(cross, "アザンティック (TUG)")).toBe(0);
    expect(p(cross, "アザンティック (Lava)")).toBe(0);
    expect(p(cross, "het アザンティック (TUG)")).toBeCloseTo(0.25);
    expect(p(cross, "het アザンティック (Lava)")).toBeCloseTo(0.25);
    expect(
      p(cross, "het アザンティック (TUG) het アザンティック (Lava)"),
    ).toBeCloseTo(0.25);
    expect(p(cross, "ノーマル")).toBeCloseTo(0.25);
  });

  it("visual TUG × visual Lava yields double hets, not visual axanthic", () => {
    const result = calculatePairing(
      { axanthicTug: "visual" },
      { axanthicLava: "visual" },
    );
    expect(p(result, "het アザンティック (TUG) het アザンティック (Lava)")).toBeCloseTo(
      1,
    );
    expect(p(result, "アザンティック (TUG)")).toBe(0);
    expect(p(result, "アザンティック (Lava)")).toBe(0);
  });

  it("does not treat Soft Scale as a Mendelian locus; Sable keys map onto cappuccino", () => {
    expect(LOCI.some((locus) => locus.id === "softScale")).toBe(false);
    expect(LOCI.some((locus) => locus.id === "sable")).toBe(false);
    const soft = calculatePairing({ softScale: "visual" }, {});
    expect(p(soft, "ノーマル")).toBe(1);
    expect(soft.unrecognizedLocusIds).toEqual(["softScale"]);
    const sable = calculatePairing({ sable: "het" }, {});
    expect(p(sable, "セーブル")).toBeCloseTo(0.5);
    expect(p(sable, "ノーマル")).toBeCloseTo(0.5);
    expect(sable.unrecognizedLocusIds).toEqual([]);
  });

  it("maps a parent Sable visual tag onto the cappuccino seat", () => {
    const result = calculatePairing(
      { lillyWhite: "het" },
      {},
      { visualB: ["sable"] },
    );
    expect(p(result, "ノーマル")).toBeCloseTo(0.25);
    expect(p(result, "セーブル")).toBeCloseTo(0.25);
    expect(p(result, "リリーホワイト")).toBeCloseTo(0.25);
    expect(p(result, "リリーセーブル")).toBeCloseTo(0.25);
    expect(p(result, "ルワック（スーパーカプチーノ）")).toBe(0);
    expect(result.unrecognizedLocusIds).toEqual([]);
  });

  it("Super Lilly White × Super Lilly White is 100% super", () => {
    const result = calculatePairing(
      { lillyWhite: "visual" },
      { lillyWhite: "visual" },
    );
    expect(p(result, "スーパーリリーホワイト")).toBeCloseTo(1);
  });

  it("visual Phantom × het Phantom is 1 : 1 visual : het", () => {
    const result = calculatePairing({ phantom: "visual" }, { phantom: "het" });
    expect(p(result, "ファントム")).toBeCloseTo(0.5);
    expect(p(result, "het ファントム")).toBeCloseTo(0.5);
  });

  it("het Charcoal × het Charcoal is classic recessive 1 : 2 : 1", () => {
    const result = calculatePairing({ charcoal: "het" }, { charcoal: "het" });
    expect(p(result, "チャコール")).toBeCloseTo(0.25);
    expect(p(result, "het チャコール")).toBeCloseTo(0.5);
    expect(p(result, "ノーマル")).toBeCloseTo(0.25);
  });

  it("visual Cappuccino × wild is 100% het, never Luwak", () => {
    const result = calculatePairing({ cappuccino: "visual" }, {});
    expect(p(result, "het カプチーノ")).toBeCloseTo(1);
    expect(p(result, "ルワック（スーパーカプチーノ）")).toBe(0);
  });

  it("Lilly White visual Cappuccino × wild is LW het-capp, not Frappuccino", () => {
    const result = calculatePairing(
      { lillyWhite: "het", cappuccino: "visual" },
      {},
    );
    expect(p(result, "リリーホワイト het カプチーノ")).toBeCloseTo(0.5);
    expect(p(result, "het カプチーノ")).toBeCloseTo(0.5);
    expect(p(result, "フラプチーノ（リリーホワイト＋ルワック）")).toBe(0);
  });

  it("Lilly White Luwak × Luwak is 50% Frappuccino : 50% Luwak", () => {
    const result = calculatePairing(
      { lillyWhite: "het", cappuccino: "visual" },
      { cappuccino: "visual" },
    );
    expect(p(result, "フラプチーノ（リリーホワイト＋ルワック）")).toBeCloseTo(0.5);
    expect(p(result, "ルワック（スーパーカプチーノ）")).toBeCloseTo(0.5);
  });

  it("50% possible het × wild is 25% het expected value", () => {
    const result = calculatePairing({ phantom: "possible_50" }, {});
    expect(p(result, "het ファントム")).toBeCloseTo(0.25);
    expect(p(result, "ノーマル")).toBeCloseTo(0.75);
    expect(p(result, "ファントム")).toBe(0);
  });

  it("66% possible het × wild is 1/3 het expected value", () => {
    const result = calculatePairing({ phantom: "possible_66" }, {});
    expect(p(result, "het ファントム")).toBeCloseTo(1 / 3);
    expect(p(result, "ノーマル")).toBeCloseTo(2 / 3);
  });

  it("independent loci multiply: LW het × Phantom het vs wild", () => {
    const result = calculatePairing(
      { lillyWhite: "het", phantom: "het" },
      {},
    );
    expect(p(result, "リリーホワイト het ファントム")).toBeCloseTo(0.25);
    expect(p(result, "リリーホワイト")).toBeCloseTo(0.25);
    expect(p(result, "het ファントム")).toBeCloseTo(0.25);
    expect(p(result, "ノーマル")).toBeCloseTo(0.25);
  });
});
