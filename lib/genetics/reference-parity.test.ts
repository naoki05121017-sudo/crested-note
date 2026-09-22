import { describe, expect, it } from "vitest";
import { calculatePairing } from "./calculate";
import { CSH_DIPLOTYPES, inferCshDiplotype } from "./csh";
import type { PairingResult } from "./types";

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

describe("reference site parity (crested-gecko-calc.pages.dev)", () => {
  it("1. セーブル × セーブル", () => {
    const result = calculatePairing({}, {}, { visualA: ["sable"], visualB: ["sable"] });
    expectRows(result, [
      { phenotype: "ノーマル", probability: 0.25 },
      { phenotype: "セーブル", probability: 0.5 },
      { phenotype: "スーパーセーブル", probability: 0.25 },
    ]);
    expect(result.outcomes.some((row) => /het/.test(row.phenotype))).toBe(false);
  });

  it("2. リリーホワイト × リリーホワイト", () => {
    const result = calculatePairing({ lillyWhite: "het" }, { lillyWhite: "het" });
    expectRows(result, [
      { phenotype: "ノーマル", probability: 0.25 },
      { phenotype: "リリーホワイト", probability: 0.5 },
      { phenotype: "スーパーリリーホワイト", probability: 0.25 },
    ]);
  });

  it("3. リリーホワイト × セーブル", () => {
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

  it("4. カプチーノ × セーブル → ルアク 25%", () => {
    const result = calculatePairing(
      { cappuccino: "het" },
      {},
      { visualB: ["sable"] },
    );
    expect(p(result, "ルアク")).toBeCloseTo(0.25);
    expect(p(result, "カプチーノ")).toBeCloseTo(0.25);
    expect(p(result, "セーブル")).toBeCloseTo(0.25);
    expect(p(result, "ノーマル")).toBeCloseTo(0.25);
    expect(sum(result)).toBeCloseTo(1);
  });

  it("5. ハイウェイ × セーブル", () => {
    const result = calculatePairing(
      {},
      {},
      { visualA: ["highway"], visualB: ["sable"] },
    );
    expect(p(result, "セーブル/ハイウェイ")).toBeCloseTo(0.25);
    expect(p(result, "セーブル")).toBeCloseTo(0.25);
    expect(p(result, "ハイウェイ")).toBeCloseTo(0.25);
    expect(p(result, "ノーマル")).toBeCloseTo(0.25);
  });

  it("6. カプチーノ × ハイウェイ", () => {
    const result = calculatePairing(
      { cappuccino: "het" },
      {},
      { visualB: ["highway"] },
    );
    expect(p(result, "カプチーノ/ハイウェイ")).toBeCloseTo(0.25);
    expect(p(result, "カプチーノ")).toBeCloseTo(0.25);
    expect(p(result, "ハイウェイ")).toBeCloseTo(0.25);
    expect(p(result, "ノーマル")).toBeCloseTo(0.25);
  });

  it("7. アザンティック × ノーマル", () => {
    const result = calculatePairing({ axanthicTug: "visual" }, {});
    expectRows(result, [{ phenotype: "ヘテロ アザンティック", probability: 1 }]);
  });

  it("8. アザンティック × ヘテロ アザンティック", () => {
    const result = calculatePairing({ axanthicTug: "visual" }, { axanthicTug: "het" });
    expectRows(result, [
      { phenotype: "アザンティック", probability: 0.5 },
      { phenotype: "ヘテロ アザンティック", probability: 0.5 },
    ]);
  });

  it("9. アザンティック × アザンティック", () => {
    const result = calculatePairing(
      { axanthicTug: "visual" },
      { axanthicTug: "visual" },
    );
    expectRows(result, [{ phenotype: "アザンティック", probability: 1 }]);
  });

  it("10. ファントム × ノーマル", () => {
    const result = calculatePairing({ phantom: "visual" }, {});
    expectRows(result, [{ phenotype: "ヘテロ ファントム", probability: 1 }]);
  });

  it("11. ファントム × ヘテロ ファントム", () => {
    const result = calculatePairing({ phantom: "visual" }, { phantom: "het" });
    expectRows(result, [
      { phenotype: "ファントム", probability: 0.5 },
      { phenotype: "ヘテロ ファントム", probability: 0.5 },
    ]);
  });

  it("12. ファントム × ファントム", () => {
    const result = calculatePairing({ phantom: "visual" }, { phantom: "visual" });
    expectRows(result, [{ phenotype: "ファントム", probability: 1 }]);
  });

  it("13. チョチョ × ノーマル", () => {
    const result = calculatePairing({ chocho: "visual" }, {});
    expectRows(result, [{ phenotype: "ヘテロ チョチョ", probability: 1 }]);
  });

  it("14. チョチョ × ヘテロ チョチョ", () => {
    const result = calculatePairing({ chocho: "visual" }, { chocho: "het" });
    expectRows(result, [
      { phenotype: "チョチョ", probability: 0.5 },
      { phenotype: "ヘテロ チョチョ", probability: 0.5 },
    ]);
  });

  it("15. リリーホワイト × アザンティック", () => {
    const result = calculatePairing({ lillyWhite: "het" }, { axanthicTug: "visual" });
    expectRows(result, [
      { phenotype: "ヘテロ アザンティック", probability: 0.5 },
      { phenotype: "リリーホワイト（ヘテロ アザンティック）", probability: 0.5 },
    ]);
  });

  it("16. リリーホワイト × ファントム", () => {
    const result = calculatePairing({ lillyWhite: "het" }, { phantom: "visual" });
    expectRows(result, [
      { phenotype: "ヘテロ ファントム", probability: 0.5 },
      { phenotype: "リリーホワイト（ヘテロ ファントム）", probability: 0.5 },
    ]);
  });

  it("17. リリーホワイト × セーブル × ファントム 複合", () => {
    const result = calculatePairing(
      { lillyWhite: "het", phantom: "het" },
      {},
      { visualB: ["sable"] },
    );
    expect(sum(result)).toBeCloseTo(1);
    expect(result.outcomes.every((row) => row.probability > 0)).toBe(true);
    const withAll = result.outcomes.filter(
      (row) =>
        (row.copies.lillyWhite ?? 0) > 0 &&
        (row.copies.phantom ?? 0) > 0 &&
        (row.copies.cappuccino ?? 0) > 0,
    );
    expect(withAll.length).toBeGreaterThan(0);
    expect(sum(result)).toBeCloseTo(1);
  });

  it("18. 複数の劣性遺伝子を同時に持つ", () => {
    const result = calculatePairing(
      { phantom: "visual", chocho: "het", axanthicTug: "het" },
      { phantom: "het", chocho: "visual" },
    );
    expect(sum(result)).toBeCloseTo(1);
    expect(result.outcomes.some((row) => (row.copies.phantom ?? 0) > 0)).toBe(true);
    expect(result.outcomes.some((row) => (row.copies.chocho ?? 0) > 0)).toBe(true);
    expect(result.outcomes.some((row) => (row.copies.axanthicTug ?? 0) > 0)).toBe(true);
    const combo = result.outcomes.find(
      (row) =>
        (row.copies.phantom ?? 0) === 2 &&
        (row.copies.chocho ?? 0) === 2 &&
        (row.copies.axanthicTug ?? 0) >= 1,
    );
    expect(combo?.phenotype).not.toBe("ノーマル");
  });

  it("カプチーノ × カプチーノ is incomplete dominant, not het", () => {
    const result = calculatePairing({ cappuccino: "het" }, { cappuccino: "het" });
    expectRows(result, [
      { phenotype: "ノーマル", probability: 0.25 },
      { phenotype: "カプチーノ", probability: 0.5 },
      { phenotype: "スーパーカプチーノ", probability: 0.25 },
    ]);
  });

  it("アルビノ × ノーマル is research recessive het", () => {
    const result = calculatePairing({ albino: "visual" }, {});
    expectRows(result, [{ phenotype: "ヘテロ アルビノ", probability: 1 }]);
  });

  it("エンプティバック × エンプティバック is incomplete dominant", () => {
    const result = calculatePairing({ emptyBack: "het" }, { emptyBack: "het" });
    expectRows(result, [
      { phenotype: "ノーマル", probability: 0.25 },
      { phenotype: "エンプティバック", probability: 0.5 },
      { phenotype: "スーパーエンプティバック", probability: 0.25 },
    ]);
  });

  it("研究中のレッドベースは劣性参考計算のまま", () => {
    const result = calculatePairing({ redBase: "visual" }, {});
    expectRows(result, [{ phenotype: "ヘテロ レッドベース", probability: 1 }]);
  });

  it("研究中のスーパーストライプは劣性参考計算のまま", () => {
    const result = calculatePairing({ superStripe: "het" }, { superStripe: "het" });
    expect(p(result, "スーパーストライプ")).toBeCloseTo(0.25);
    expect(p(result, "ヘテロ スーパーストライプ")).toBeCloseTo(0.5);
  });

  it("covers all CSH diplotypes as parent states", () => {
    for (const a of CSH_DIPLOTYPES) {
      for (const b of ["NN", "N/Sable", "N/Capp"] as const) {
        const result = calculatePairing({ csh: a }, { csh: b });
        expect(sum(result)).toBeCloseTo(1);
      }
    }
    expect(inferCshDiplotype({ cappuccino: "het" }, ["sable"])).toBe("N/Sable");
  });

  it("does not Punnett polygenic harlequin", () => {
    const result = calculatePairing({ harlequin: "visual" as never }, {});
    expect(p(result, "ノーマル")).toBe(1);
    expect(result.unrecognizedLocusIds).toContain("harlequin");
  });
});
