import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("animal parent sex and delete confirm wiring", () => {
  it("filters sire and dam lists by sex on the live animal form", () => {
    const form = readFileSync("app/(app)/animals/animal-form.tsx", "utf8");
    expect(form).toContain("parentOptionsForRole");
    expect(form).toContain('parentOptionsForRole(parentOptions, "sire"');
    expect(form).toContain('parentOptionsForRole(parentOptions, "dam"');
  });

  it("asks before deleting an animal on the detail page", () => {
    const form = readFileSync("app/(app)/animals/delete-animal-form.tsx", "utf8");
    expect(form).toContain("window.confirm");
    expect(form).toContain("この個体を削除しますか");
  });

  it("submits cadence from a hidden field so iPhone can save weekly", () => {
    const fields = readFileSync("app/(app)/animals/check-cadence-fields.tsx", "utf8");
    expect(fields).toContain('name="checkCadence"');
    expect(fields).toContain("<select");
    expect(fields).not.toMatch(/<select[^>]*name=/);
    const form = readFileSync("app/components/mutation-form.tsx", "utf8");
    expect(form).not.toMatch(/fieldset[^>]*contents/);
  });

  it("labels the growth guide as 参考目安, not 平均", () => {
    const page = readFileSync("app/(app)/animals/[id]/page.tsx", "utf8");
    const deferred = readFileSync("app/(app)/animals/animal-detail-deferred.tsx", "utf8");
    expect(deferred).toContain("参考目安には個体差があります");
    expect(deferred).toContain("growthGuideSeries");
    expect(page).not.toContain("標準体重");
    expect(deferred).not.toContain("標準体重");
    const chart = readFileSync("app/components/growth-chart.tsx", "utf8");
    expect(chart).toContain("あなたのクレス");
    expect(chart).toContain("参考目安");
    expect(chart).toContain("クレスノート実測平均");
    expect(chart).toContain("overflow-hidden");
  });
});
