import { describe, expect, it } from "vitest";
import { parseFeedbackCategory, parseFeedbackStatus } from "./form";

describe("feedback parsing", () => {
  it("accepts user form categories", () => {
    expect(parseFeedbackCategory("improvement")).toBe("improvement");
    expect(parseFeedbackCategory("bug")).toBe("bug");
    expect(parseFeedbackCategory("morph")).toBe("morph");
    expect(parseFeedbackCategory("other")).toBe("other");
  });

  it("falls back to other for unknown categories", () => {
    expect(parseFeedbackCategory("unknown")).toBe("other");
  });

  it("keeps operator statuses for a future inbox", () => {
    expect(parseFeedbackStatus("open")).toBe("open");
    expect(parseFeedbackStatus("reviewing")).toBe("reviewing");
    expect(parseFeedbackStatus("planned")).toBe("planned");
    expect(parseFeedbackStatus("done")).toBe("done");
    expect(parseFeedbackStatus("hold")).toBe("hold");
    expect(parseFeedbackStatus("nope")).toBe("open");
  });
});
