import { describe, expect, it } from "vitest";
import { isJapanDomesticAnimal } from "./compare";

describe("isJapanDomesticAnimal", () => {
  it("treats empty prefecture as Japan collection data", () => {
    expect(isJapanDomesticAnimal({})).toBe(true);
    expect(isJapanDomesticAnimal({ prefecture: "" })).toBe(true);
  });

  it("keeps Japanese prefectures and excludes overseas labels", () => {
    expect(isJapanDomesticAnimal({ prefecture: "沖縄県" })).toBe(true);
    expect(isJapanDomesticAnimal({ prefecture: "California" })).toBe(false);
  });
});
