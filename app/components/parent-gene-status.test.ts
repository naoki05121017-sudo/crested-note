import { describe, expect, it } from "vitest";
import { getLocus } from "@/lib/genetics";
import {
  coerceParentStatus,
  parentInheritanceFor,
  parentStatusOptions,
  parentStatusesFor,
} from "@/app/components/parent-gene-status";

function labels(traitId: string, locusId?: string) {
  return parentStatusOptions(traitId, locusId ? getLocus(locusId) : getLocus("cappuccino")).map(
    (row) => row.label,
  );
}

describe("parent gene status UI (CSH vs recessive)", () => {
  it("Sable is incomplete dominant: no het / 50% / 66% choices", () => {
    const locus = getLocus("cappuccino");
    expect(parentInheritanceFor("sable", locus)).toBe("incomplete_dominant");
    expect(parentStatusesFor("sable", locus)).toEqual(["wild", "het", "visual"]);
    const text = labels("sable");
    expect(text).toEqual(["なし", "セーブル", "スーパーセーブル"]);
    expect(text.some((row) => row.includes("ヘテロ"))).toBe(false);
    expect(text).not.toContain("ヘテロ（隠れて持つ）");
    expect(text).not.toContain("50%ヘテロ");
    expect(text).not.toContain("66%ヘテロ");
  });

  it("Highway and Cappuccino use the same incomplete-dominant parent states", () => {
    const locus = getLocus("cappuccino");
    expect(parentStatusesFor("highway", locus)).toEqual(["wild", "het", "visual"]);
    expect(parentStatusesFor("cappuccino", locus)).toEqual(["wild", "het", "visual"]);
    expect(labels("highway")).toEqual(["なし", "ハイウェイ", "スーパーハイウェイ"]);
    expect(labels("cappuccino")).toEqual(["なし", "カプチーノ", "スーパーカプチーノ"]);
  });

  it("coerces leftover recessive possible-het onto one visual copy for Sable", () => {
    const locus = getLocus("cappuccino");
    expect(coerceParentStatus("possible_50", "sable", locus)).toBe("het");
    expect(coerceParentStatus("possible_66", "sable", locus)).toBe("het");
  });

  it("recessive Phantom / Axanthic / Chocho still offer het and possible hets", () => {
    for (const id of ["phantom", "chocho", "axanthicTug"] as const) {
      const locus = getLocus(id);
      expect(parentInheritanceFor(id, locus)).toBe("recessive");
      expect(parentStatusesFor(id, locus)).toEqual([
        "wild",
        "het",
        "visual",
        "possible_50",
        "possible_66",
      ]);
      const text = parentStatusOptions(id, locus).map((row) => row.label);
      expect(text).toContain("ヘテロ（隠れて持つ）");
      expect(text).toContain("50%ヘテロ");
      expect(text).toContain("66%ヘテロ");
    }
  });
});
