import { describe, expect, it } from "vitest";
import { weightTone } from "./math";

describe("weightTone", () => {
  it("uses soft wording around the mean", () => {
    expect(weightTone(0.2, 30)).toBe("平均的");
    expect(weightTone(2, 30)).toBe("やや重め");
    expect(weightTone(-2, 30)).toBe("やや軽め");
    expect(weightTone(8, 30)).toBe("重め");
  });
});
