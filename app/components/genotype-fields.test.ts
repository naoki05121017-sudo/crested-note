import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("axanthic registration UI", () => {
  it("offers one アザンティック field and does not list TUG / Melanistic / ARV / Lava", () => {
    const fields = readFileSync("app/components/genotype-fields.tsx", "utf8");
    const workbench = readFileSync("app/components/pairing-workbench.tsx", "utf8");
    expect(fields).toContain('label="アザンティック"');
    expect(fields).toContain('type="hidden"');
    expect(fields).not.toContain("TUG");
    expect(fields).not.toContain("Melanistic");
    expect(fields).not.toContain("ARV");
    expect(fields).not.toContain("Lava");
    expect(workbench).not.toContain("AXANTHIC_LOCI");
    expect(workbench).not.toContain(">系統<");
    expect(workbench).not.toContain("TUG");
    expect(workbench).not.toContain("Melanistic");
    expect(workbench).not.toContain("ARV");
    expect(workbench).not.toContain("Lava");
  });

  it("does not change genetics catalog ids used by stored axanthic data", () => {
    const catalog = readFileSync("lib/genetics/catalog.ts", "utf8");
    expect(catalog).toContain('id: "axanthicTug"');
    expect(catalog).toContain('id: "axanthicMelanistic"');
    expect(catalog).toContain('id: "axanthicArv"');
    expect(catalog).toContain('id: "axanthicLava"');
  });
});
