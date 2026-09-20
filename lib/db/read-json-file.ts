import { existsSync, readFileSync } from "node:fs";
import { JSON_DATA_PATH } from "@/lib/db/json-paths";
import type { DatabaseFile } from "@/lib/db/types";

/** Read the live JSON. Does not write and does not run Crest Link sync. */
export function readLocalJsonFile(): DatabaseFile {
  if (!existsSync(JSON_DATA_PATH)) {
    throw new Error("data/n-crest.json が見つかりません。");
  }
  const parsed = JSON.parse(readFileSync(JSON_DATA_PATH, "utf8")) as Partial<DatabaseFile>;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("data/n-crest.json の形式が正しくありません。");
  }
  return {
    animals: parsed.animals ?? [],
    genes: parsed.genes ?? [],
    weights: parsed.weights ?? [],
    breedings: parsed.breedings ?? [],
    clutches: parsed.clutches ?? [],
    eggs: parsed.eggs ?? [],
    projects: parsed.projects ?? [],
    projectMembers: parsed.projectMembers ?? [],
    predictions: parsed.predictions ?? [],
    settings: parsed.settings ?? {
      displayName: "",
      collectionName: "クレスノート",
      prefecture: "",
      publicByDefault: false,
    },
    feedback: parsed.feedback ?? [],
    crestLinkSeq: Number(parsed.crestLinkSeq) || 0,
    animalCodeSeq: Number(parsed.animalCodeSeq) || 0,
    crestLinks: parsed.crestLinks ?? [],
    crestLinkTransfers: parsed.crestLinkTransfers ?? [],
  };
}
