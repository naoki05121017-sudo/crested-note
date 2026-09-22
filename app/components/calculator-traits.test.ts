import { describe, expect, it } from "vitest";
import {
  AXANTHIC_TRAIT_ID,
  axanthicFromGenotype,
  calculatorTraitOptions,
  clearTraitFromGenotype,
  locusStateOptions,
  rowIdForOption,
  setAxanthicGenotype,
  visibleTraitsFromParent,
} from "@/app/components/calculator-traits";
import { getLocus } from "@/lib/genetics";

describe("calculator trait UI helpers", () => {
  it("groups axanthic loci into one visible row", () => {
    expect(
      visibleTraitsFromParent(
        { axanthicTug: "het", axanthicLava: "visual", phantom: "visual" },
        ["pinstripe"],
      ),
    ).toEqual([AXANTHIC_TRAIT_ID, "phantom", "pinstripe"]);
  });

  it("keeps a second axanthic locus when changing displayed lineage", () => {
    const next = setAxanthicGenotype(
      { axanthicTug: "het", axanthicLava: "visual" },
      "axanthicTug",
      "axanthicArv",
      "het",
    );
    expect(next).toEqual({ axanthicArv: "het", axanthicLava: "visual" });
  });

  it("clears all axanthic loci when the grouped row is removed", () => {
    expect(
      clearTraitFromGenotype(
        { axanthicTug: "het", axanthicLava: "visual", phantom: "het" },
        AXANTHIC_TRAIT_ID,
      ),
    ).toEqual({ phantom: "het" });
  });

  it("reads the first active axanthic line for the lineage selector", () => {
    expect(axanthicFromGenotype({ axanthicMelanistic: "visual" })).toEqual({
      locusId: "axanthicMelanistic",
      stateId: "visual",
    });
  });

  it("routes the three allelic shortcuts to one row", () => {
    const options = calculatorTraitOptions();
    for (const id of ["cappuccino", "sable", "highway"]) {
      const option = options.find((row) => row.id === id);
      expect(option?.kind).toBe("locus");
      expect(option?.locus?.id).toBe("cappuccino");
      expect(option && rowIdForOption(option)).toBe("cappuccino");
    }
    expect(options.find((row) => row.id === "sable")?.defaultStateId).toBe(
      "sable",
    );
  });

  it("offers every allelic genotype on the seat select", () => {
    const capp = getLocus("cappuccino")!;
    expect(locusStateOptions(capp).map((row) => row.value)).toEqual([
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

  it("labels lilly white copies without het wording", () => {
    const lilly = getLocus("lillyWhite")!;
    expect(locusStateOptions(lilly)).toEqual([
      { value: "wild", label: "ノーマル（遺伝子なし）" },
      { value: "het", label: "リリーホワイト（1コピー）" },
      { value: "visual", label: "スーパーリリーホワイト（2コピー）" },
    ]);
  });

  it("labels recessive states with ヘテロ and ビジュアル", () => {
    const phantom = getLocus("phantom")!;
    expect(locusStateOptions(phantom).map((row) => row.label)).toEqual([
      "ノーマル（遺伝子なし）",
      "ヘテロ ファントム（保因者）",
      "ファントム（ビジュアル）",
      "50%ヘテロ ファントム",
      "66%ヘテロ ファントム",
    ]);
  });
});
