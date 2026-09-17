import { describe, expect, it } from "vitest";
import {
  crestLinkPublicPath,
  crestLinkView,
  formatCrestLinkId,
  getAnimalByCrestLinkId,
  issueCrestLinkForAnimal,
  issueTransferCode,
  redeemTransferCode,
  retireCrestLinkForAnimal,
  syncCrestLinks,
} from "./core";
import { DEFAULT_SETTINGS, type AnimalRecord, type DatabaseFile } from "@/lib/db/types";

function animal(partial: Partial<AnimalRecord> & Pick<AnimalRecord, "id" | "name">): AnimalRecord {
  return {
    crestLinkId: "",
    code: "",
    sex: "unknown",
    hatchDate: "2024-01-01",
    status: "active",
    sireId: "",
    damId: "",
    morphLabel: "ファントム",
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

function emptyDb(animals: AnimalRecord[] = []): DatabaseFile {
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
    settings: { ...DEFAULT_SETTINGS, displayName: "N.crest" },
    feedback: [],
    crestLinkSeq: 0,
    crestLinks: [],
    crestLinkTransfers: [],
  };
}

describe("Crest Link IDs", () => {
  it("formats sequential IDs", () => {
    expect(formatCrestLinkId(1)).toBe("NC-000001");
    expect(formatCrestLinkId(15)).toBe("NC-000015");
  });

  it("issues unique IDs in order", () => {
    const db = emptyDb([animal({ id: "a", name: "A" }), animal({ id: "b", name: "B" })]);
    syncCrestLinks(db);
    expect(db.animals[0].crestLinkId).toBe("NC-000001");
    expect(db.animals[1].crestLinkId).toBe("NC-000002");
    expect(db.crestLinkSeq).toBe(2);
  });

  it("never reuses a retired ID", () => {
    const db = emptyDb([animal({ id: "a", name: "A" })]);
    issueCrestLinkForAnimal(db, "a");
    retireCrestLinkForAnimal(db, "a");
    db.animals = [animal({ id: "b", name: "B" })];
    issueCrestLinkForAnimal(db, "b");
    expect(db.animals[0].crestLinkId).toBe("NC-000002");
    expect(db.crestLinks.map((row) => row.id).sort()).toEqual(["NC-000001", "NC-000002"]);
    expect(db.crestLinks.find((row) => row.id === "NC-000001")?.status).toBe("retired");
  });
});

describe("Crest Link transfer", () => {
  it("keeps the same ID and records owner history by display name only", () => {
    const db = emptyDb([animal({ id: "a", name: "A" })]);
    const link = issueCrestLinkForAnimal(db, "a");
    expect(link.currentOwnerLabel).toBe("N.crest");
    const transfer = issueTransferCode(db, "a");
    const result = redeemTransferCode(db, transfer.code, "購入者A");
    expect(result.crestLinkId).toBe("NC-000001");
    expect(db.animals[0].crestLinkId).toBe("NC-000001");
    expect(db.animals[0].id).toBe("a");
    const view = crestLinkView(db, "a");
    expect(view?.currentOwnerLabel).toBe("購入者A");
    expect(view?.ownerHistory.map((entry) => entry.ownerLabel)).toEqual([
      "N.crest",
      "購入者A",
    ]);
    expect(JSON.stringify(db.crestLinkTransfers)).not.toContain("N.crest");
  });

  it("keeps NC-000001 through owner A → B → C and never mints another ID", () => {
    const db = emptyDb([
      animal({
        id: "11111111-1111-1111-1111-111111111111",
        name: "レオ",
        code: "M-01",
      }),
    ]);
    db.settings.displayName = "所有者A";
    issueCrestLinkForAnimal(db, "11111111-1111-1111-1111-111111111111");
    expect(db.animals[0].crestLinkId).toBe("NC-000001");
    expect(db.animals[0].id).not.toBe(db.animals[0].crestLinkId);

    const toB = issueTransferCode(db, "11111111-1111-1111-1111-111111111111");
    redeemTransferCode(db, toB.code, "所有者B");
    expect(db.animals[0].crestLinkId).toBe("NC-000001");
    expect(crestLinkView(db, "11111111-1111-1111-1111-111111111111")?.currentOwnerLabel).toBe(
      "所有者B",
    );

    const toC = issueTransferCode(db, "11111111-1111-1111-1111-111111111111");
    redeemTransferCode(db, toC.code, "所有者C");
    const leo = db.animals[0];
    const view = crestLinkView(db, leo.id);
    expect(leo.id).toBe("11111111-1111-1111-1111-111111111111");
    expect(leo.crestLinkId).toBe("NC-000001");
    expect(view?.crestLinkId).toBe("NC-000001");
    expect(view?.currentOwnerLabel).toBe("所有者C");
    expect(view?.ownerHistory.map((entry) => entry.ownerLabel)).toEqual([
      "所有者A",
      "所有者B",
      "所有者C",
    ]);
    expect(db.animals.filter((row) => row.crestLinkId === "NC-000001")).toHaveLength(1);
    expect(db.crestLinkSeq).toBe(1);
    expect(db.crestLinks.filter((row) => row.id.startsWith("NC-")).map((row) => row.id)).toEqual([
      "NC-000001",
    ]);

    db.animals.push(animal({ id: "new-animal", name: "別個体" }));
    issueCrestLinkForAnimal(db, "new-animal");
    expect(db.animals[1].crestLinkId).toBe("NC-000002");
    expect(db.animals[0].crestLinkId).toBe("NC-000001");
  });

  it("does not mint a Crest Link ID during transfer", () => {
    const db = emptyDb([animal({ id: "a", name: "A" })]);
    expect(() => issueTransferCode(db, "a")).toThrow("Crest Link が見つかりません");
  });

  it("rejects a used code", () => {
    const db = emptyDb([animal({ id: "a", name: "A" })]);
    issueCrestLinkForAnimal(db, "a");
    const transfer = issueTransferCode(db, "a");
    redeemTransferCode(db, transfer.code.toLowerCase(), "購入者A");
    expect(() => redeemTransferCode(db, transfer.code, "購入者B")).toThrow();
  });
});

describe("Crest Link pedigree", () => {
  it("links three generations by Crest Link ID", () => {
    const db = emptyDb([animal({ id: "gen1", name: "レオ", code: "M-01", sex: "male" })]);
    issueCrestLinkForAnimal(db, "gen1");
    db.animals.push(
      animal({ id: "gen2", name: "子", code: "M-02", sex: "male", sireId: "gen1" }),
    );
    issueCrestLinkForAnimal(db, "gen2");
    db.animals.push(
      animal({ id: "gen3", name: "孫", code: "M-03", sireId: "gen2" }),
    );
    issueCrestLinkForAnimal(db, "gen3");

    expect(getAnimalByCrestLinkId(db, "NC-000001")?.name).toBe("レオ");
    expect(getAnimalByCrestLinkId(db, "NC-000002")?.name).toBe("子");
    expect(getAnimalByCrestLinkId(db, "NC-000003")?.name).toBe("孫");

    const grandchild = crestLinkView(db, "gen3");
    expect(grandchild?.crestLinkId).toBe("NC-000003");
    expect(grandchild?.sire?.crestLinkId).toBe("NC-000002");
    expect(grandchild?.grandparents.map((row) => row.crestLinkId)).toEqual(["NC-000001"]);

    const root = crestLinkView(db, "gen1");
    expect(root?.children.map((row) => row.crestLinkId)).toEqual(["NC-000002"]);
    expect(root?.grandchildren.map((row) => row.crestLinkId)).toEqual(["NC-000003"]);
    expect(db.crestLinks.find((row) => row.id === "NC-000003")?.sireCrestLinkId).toBe(
      "NC-000002",
    );
    expect(crestLinkPublicPath("NC-000001")).toBe("/crest/NC-000001");
  });

  it("never assigns a second Crest Link ID to the same animal", () => {
    const db = emptyDb([animal({ id: "a", name: "A" })]);
    const first = issueCrestLinkForAnimal(db, "a");
    const second = issueCrestLinkForAnimal(db, "a");
    expect(first.id).toBe("NC-000001");
    expect(second.id).toBe("NC-000001");
    expect(db.crestLinks.filter((row) => row.status === "active")).toHaveLength(1);
  });
});
