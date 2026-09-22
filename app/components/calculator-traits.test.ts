import { describe, expect, it } from "vitest";
import {
  AXANTHIC_TRAIT_ID,
  axanthicFromGenotype,
  clearTraitFromGenotype,
  setAxanthicGenotype,
  visibleTraitsFromParent,
} from "@/app/components/calculator-traits";

describe("calculator trait UI helpers", () => {
  it("groups axanthic loci into one visible trait", () => {
    expect(
      visibleTraitsFromParent({ axanthicTug: "het", phantom: "visual" }, []),
    ).toEqual(["phantom", AXANTHIC_TRAIT_ID]);
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

  it("clears all axanthic loci when the grouped trait is removed", () => {
    expect(
      clearTraitFromGenotype(
        { axanthicTug: "het", axanthicLava: "visual", phantom: "het" },
        AXANTHIC_TRAIT_ID,
      ),
    ).toEqual({ phantom: "het" });
  });

  it("keeps sable as the visible trait instead of also listing cappuccino", () => {
    expect(
      visibleTraitsFromParent({ cappuccino: "het" }, ["sable"]),
    ).toEqual(["sable"]);
  });

  it("reads the first active axanthic line for the lineage selector", () => {
    expect(
      axanthicFromGenotype({ axanthicMelanistic: "visual" }),
    ).toEqual({ locusId: "axanthicMelanistic", status: "visual" });
  });
});
