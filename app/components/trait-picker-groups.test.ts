import { describe, expect, it } from "vitest";
import { calculatorTraitOptions } from "@/app/components/calculator-traits";
import {
  optionsInGroup,
  pickerGroupFor,
  sortPickerOptions,
  traitMatchesQuery,
} from "@/app/components/trait-picker-groups";

describe("trait picker grouping (UI only)", () => {
  const options = calculatorTraitOptions();

  it("shows frequent morphs in basic and hides the rest under other", () => {
    const lily = options.find((row) => row.id === "lillyWhite");
    const sable = options.find((row) => row.id === "sable");
    const pin = options.find((row) => row.id === "pinstripe");
    const wall = options.find((row) => row.id === "whiteWall");
    const highway = options.find((row) => row.id === "highway");
    const red = options.find((row) => row.id === "redBase");
    const soft = options.find((row) => row.id === "softScale");
    expect(lily && pickerGroupFor(lily)).toBe("basic");
    expect(sable && pickerGroupFor(sable)).toBe("basic");
    expect(pin && pickerGroupFor(pin)).toBe("basic");
    expect(wall && pickerGroupFor(wall)).toBe("basic");
    expect(highway && pickerGroupFor(highway)).toBe("other");
    expect(red && pickerGroupFor(red)).toBe("other");
    expect(soft && pickerGroupFor(soft)).toBe("other");
  });

  it("keeps a single axanthic picker item, not four loci", () => {
    const ax = options.filter((row) => row.label.includes("アザンティック"));
    expect(ax.map((row) => row.id)).toEqual(["axanthic"]);
  });

  it("matches Japanese and English search", () => {
    const sable = options.find((row) => row.id === "sable");
    const ax = options.find((row) => row.id === "axanthic");
    expect(sable && traitMatchesQuery(sable, "Sable")).toBe(true);
    expect(ax && traitMatchesQuery(ax, "アザン")).toBe(true);
    expect(sable && traitMatchesQuery(sable, "ファントム")).toBe(false);
  });

  it("does not delete morphs: every option is either basic or other", () => {
    const basic = optionsInGroup(options, "basic");
    const other = optionsInGroup(options, "other");
    expect(basic[0]?.id).toBe("lillyWhite");
    expect(basic.map((row) => row.id)).toContain("sable");
    expect(other.map((row) => row.id)).toContain("softScale");
    expect(other.map((row) => row.id)).toContain("porthole");
    expect(other.map((row) => row.id)).toContain("lavender");
    expect(basic.length + other.length).toBe(options.length);
    const ids = new Set(options.map((row) => row.id));
    expect(ids.has("albino")).toBe(true);
    expect(ids.has("emptyBack")).toBe(true);
    expect(ids.has("superStripe")).toBe(true);
    expect(sortPickerOptions(options).length).toBe(options.length);
  });
});
