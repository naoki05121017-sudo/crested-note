import { describe, expect, it } from "vitest";
import {
  isEligibleParent,
  parentOptionsForRole,
  parentSexAssignmentError,
} from "./parent-sex";
import type { Sex } from "./types";

function animal(id: string, sex: Sex) {
  return { id, sex };
}

const roster = [
  animal("m1", "male"),
  animal("f1", "female"),
  animal("u1", "unknown"),
];

describe("parent sex rules", () => {
  it("lists only males for sire and only females for dam", () => {
    expect(parentOptionsForRole(roster, "sire").map((row) => row.id)).toEqual(["m1"]);
    expect(parentOptionsForRole(roster, "dam").map((row) => row.id)).toEqual(["f1"]);
    expect(isEligibleParent(animal("u1", "unknown"), "sire")).toBe(false);
    expect(isEligibleParent(animal("u1", "unknown"), "dam")).toBe(false);
  });

  it("keeps an already stored parent in the list so existing data is not dropped", () => {
    expect(parentOptionsForRole(roster, "sire", "u1").map((row) => row.id)).toEqual([
      "m1",
      "u1",
    ]);
    expect(parentOptionsForRole(roster, "dam", "m1").map((row) => row.id)).toEqual([
      "m1",
      "f1",
    ]);
  });

  it("rejects new unknown or wrong-sex parents and allows keeping the stored ids", () => {
    expect(parentSexAssignmentError(roster, "u1", "")).toMatch(/父にはオスだけ/);
    expect(parentSexAssignmentError(roster, "", "u1")).toMatch(/母にはメスだけ/);
    expect(parentSexAssignmentError(roster, "f1", "")).toMatch(/父にはオスだけ/);
    expect(parentSexAssignmentError(roster, "", "m1")).toMatch(/母にはメスだけ/);
    expect(parentSexAssignmentError(roster, "m1", "f1")).toBeNull();
    expect(
      parentSexAssignmentError(roster, "u1", "m1", { sireId: "u1", damId: "f1" }),
    ).toMatch(/母にはメスだけ/);
    expect(
      parentSexAssignmentError(roster, "u1", "f1", { sireId: "u1", damId: "f1" }),
    ).toBeNull();
  });
});
