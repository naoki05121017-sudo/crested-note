import { describe, expect, it } from "vitest";
import {
  displayAnimalCode,
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

describe("animal display codes", () => {
  it("formats NC-0001 style numbers", () => {
    expect(formatAnimalCode(1)).toBe("NC-0001");
    expect(formatAnimalCode(42)).toBe("NC-0042");
    expect(formatAnimalCode(10000)).toBe("NC-10000");
  });

  it("parses only display codes, not arbitrary text", () => {
    expect(parseAnimalCodeSeq("NC-0001")).toBe(1);
    expect(parseAnimalCodeSeq("M-01")).toBe(0);
    expect(displayAnimalCode("")).toBe("未発行");
    expect(displayAnimalCode("NC-0003")).toBe("NC-0003");
  });

  it("issues unique sequential codes", () => {
    const store = db();
    expect(issueAnimalCode(store)).toBe("NC-0001");
    store.animals.push(animal({ id: "a", name: "A", code: "NC-0001" }));
    expect(issueAnimalCode(store)).toBe("NC-0002");
  });

  it("does not reuse a code after the animal is removed", () => {
    const store = db();
    store.animals.push(animal({ id: "a", name: "A", code: issueAnimalCode(store) }));
    store.animals.push(animal({ id: "b", name: "B", code: issueAnimalCode(store) }));
    store.animals.push(animal({ id: "c", name: "C", code: issueAnimalCode(store) }));
    expect(store.animals.map((row) => row.code)).toEqual([
      "NC-0001",
      "NC-0002",
      "NC-0003",
    ]);
    store.animals = store.animals.filter((row) => row.id !== "b");
    expect(issueAnimalCode(store)).toBe("NC-0004");
  });

  it("keeps existing non-empty codes and fills blanks", () => {
    const store = db(
      [
        animal({ id: "keep", name: "レオ", code: "M-01" }),
        animal({ id: "empty", name: "ルナ", code: "" }),
      ],
      0,
    );
    syncAnimalCodes(store);
    expect(store.animals[0]?.code).toBe("M-01");
    expect(store.animals[1]?.code).toBe("NC-0001");
  });

  it("does not treat Crest Link IDs as the display sequence source unless stored as code", () => {
    const store = db([
      animal({ id: "a", name: "レオ", code: "M-01", crestLinkId: "NC-000001" }),
    ]);
    expect(issueAnimalCode(store)).toBe("NC-0001");
  });
});
