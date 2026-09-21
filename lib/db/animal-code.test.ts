import { describe, expect, it } from "vitest";
import {
  displayAnimalCode,
  displayAnimalId,
  formatAnimalCode,
  issueAnimalCode,
  parseAnimalCodeSeq,
  syncAnimalCodes,
} from "./animal-code";
import { DEFAULT_SETTINGS, type AnimalRecord, type DatabaseFile } from "./types";

function animal(partial: Partial<AnimalRecord> & Pick<AnimalRecord, "id" | "name">): AnimalRecord {
  return {
    crestLinkId: "",
    code: "",
    sex: "unknown",
    hatchDate: "2024-01-01",
    status: "active",
    sireId: "",
    damId: "",
    morphLabel: "",
    traits: [],
    notes: "",
    photoUrl: "",
    isPublic: false,
    shareSlug: "",
    prefecture: "",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...partial,
  };
}

function db(animals: AnimalRecord[] = [], animalCodeSeq = 0): DatabaseFile {
  return {
    animals,
    genes: [],
    weights: [],
    breedings: [],
    clutches: [],
    eggs: [],
    projects: [],
    projectMembers: [],
    predictions: [],
    settings: { ...DEFAULT_SETTINGS },
    feedback: [],
    crestLinkSeq: 0,
    animalCodeSeq,
    crestLinks: [],
    crestLinkTransfers: [],
  };
}

describe("user-facing animal IDs", () => {
  it("formats 6-digit NC IDs", () => {
    expect(formatAnimalCode(1)).toBe("NC-000001");
    expect(formatAnimalCode(2)).toBe("NC-000002");
    expect(formatAnimalCode(42)).toBe("NC-000042");
    expect(formatAnimalCode(10000)).toBe("NC-010000");
  });

  it("pads stored 4-digit codes for display without rewriting them", () => {
    expect(parseAnimalCodeSeq("NC-0002")).toBe(2);
    expect(displayAnimalId("NC-0002")).toBe("NC-000002");
    expect(displayAnimalId({ code: "NC-0002" })).toBe("NC-000002");
    expect(displayAnimalCode("NC-0001")).toBe("NC-000001");
    expect(displayAnimalId("")).toBe("未発行");
    expect(displayAnimalId("M-01")).toBe("M-01");
  });

  it("issues sequential 6-digit IDs and does not reuse after delete", () => {
    const store = db();
    expect(issueAnimalCode(store)).toBe("NC-000001");
    store.animals.push(animal({ id: "a", name: "A", code: "NC-000001" }));
    expect(issueAnimalCode(store)).toBe("NC-000002");
    store.animals.push(animal({ id: "b", name: "B", code: "NC-000002" }));
    store.animals.push(animal({ id: "c", name: "C", code: issueAnimalCode(store) }));
    expect(store.animals[2]?.code).toBe("NC-000003");
    store.animals = store.animals.filter((row) => row.id !== "b");
    expect(issueAnimalCode(store)).toBe("NC-000004");
  });

  it("treats NC-0002 as seq 2 so the next issue is NC-000003", () => {
    const store = db([animal({ id: "a", name: "A", code: "NC-0002" })], 2);
    expect(issueAnimalCode(store)).toBe("NC-000003");
  });

  it("does not overwrite existing codes or copy Crest Link IDs into code", () => {
    const store = db(
      [
        animal({ id: "keep", name: "レオ", code: "M-01", crestLinkId: "NC-000001" }),
        animal({ id: "four", name: "テスト", code: "NC-0002", crestLinkId: "NC-000012" }),
      ],
      0,
    );
    syncAnimalCodes(store);
    expect(store.animals[0]?.code).toBe("M-01");
    expect(store.animals[1]?.code).toBe("NC-0002");
    expect(displayAnimalId(store.animals[1])).toBe("NC-000002");
  });

  it("does not treat Crest Link IDs as the display sequence", () => {
    const store = db([
      animal({ id: "a", name: "レオ", code: "M-01", crestLinkId: "NC-000001" }),
    ]);
    expect(issueAnimalCode(store)).toBe("NC-000001");
  });
});
