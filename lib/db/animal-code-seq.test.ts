import { describe, expect, it } from "vitest";
import { animalCodeSeqValueForUser, animalCodeSeqWriteRow } from "./animal-code-seq";
import { issueAnimalCode } from "./animal-code";
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

describe("animal_code_seq persistence", () => {
  it("stores the counter per keeper user, not as crest_link_seq id", () => {
    const row = animalCodeSeqWriteRow("keeper-1", 3, 4);
    expect(row).toEqual({ user_id: "keeper-1", value: 4 });
    expect("id" in row).toBe(false);
  });

  it("reads the keeper row even if another user has a higher counter", () => {
    expect(
      animalCodeSeqValueForUser(
        [
          { user_id: "a", value: 12 },
          { user_id: "b", value: 2 },
        ],
        "b",
      ),
    ).toBe(2);
  });
});

describe("register animal uses display code without replacing internal ids", () => {
  it("issues NC-0002 for a child that still points at the sire uuid", () => {
    const store = db([animal({ id: "uuid-sire", name: "父", code: "NC-0001" })], 1);
    const childId = "uuid-child";
    const code = issueAnimalCode(store);
    store.animals.push(
      animal({
        id: childId,
        name: "子",
        code,
        sireId: "uuid-sire",
      }),
    );
    expect(code).toBe("NC-0002");
    expect(childId).not.toBe(code);
    expect(store.animals[1]?.sireId).toBe("uuid-sire");
    expect(store.animalCodeSeq).toBe(2);
  });
});
