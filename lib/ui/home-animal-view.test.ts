import { describe, expect, it } from "vitest";
import { parseHomeAnimalView } from "./home-animal-view";

describe("home animal view preference", () => {
  it("keeps list as the default and accepts card", () => {
    expect(parseHomeAnimalView(null)).toBe("list");
    expect(parseHomeAnimalView("list")).toBe("list");
    expect(parseHomeAnimalView("card")).toBe("card");
    expect(parseHomeAnimalView("other")).toBe("list");
  });
});
