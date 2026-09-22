import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("animal parent sex and delete confirm wiring", () => {
  it("filters sire and dam lists by sex on the live animal form", () => {
    const form = readFileSync("app/animals/animal-form.tsx", "utf8");
    expect(form).toContain("parentOptionsForRole");
    expect(form).toContain('parentOptionsForRole(parentOptions, "sire"');
    expect(form).toContain('parentOptionsForRole(parentOptions, "dam"');
  });

  it("asks before deleting an animal on the detail page", () => {
    const form = readFileSync("app/animals/delete-animal-form.tsx", "utf8");
    expect(form).toContain("window.confirm");
    expect(form).toContain("この個体を削除しますか");
  });
});
