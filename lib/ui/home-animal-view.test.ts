import { describe, expect, it } from "vitest";
import { parseHomeAnimalView } from "./home-animal-view";

describe("home animal view preference", () => {
  it("keeps card as the default and accepts list", () => {
    expect(parseHomeAnimalView(null)).toBe("card");
    expect(parseHomeAnimalView("card")).toBe("card");
    expect(parseHomeAnimalView("list")).toBe("list");
    expect(parseHomeAnimalView("other")).toBe("card");
  });
});
