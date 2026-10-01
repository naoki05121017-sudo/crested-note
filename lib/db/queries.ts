import { crestLinkView, type CrestLinkView } from "@/lib/crest-link/core";
import type { Genotype } from "@/lib/genetics";
import { requireAppUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadDb } from "./store";
import { loadPublicAnimals } from "./supabase-io";
import {
  countOwnedAnimals,
  getOwnedAnimal,
  getOwnedAnimalsByIds,
  getOwnedSettings,
  listGenesForAnimals,
  listOwnedAnimalsAll,
  listOwnedAnimalsPage,
  listOwnedBreedingsForAnimal,
  listOwnedChildren,
  listOwnedParentOptions,
  listWeightsForAnimals,
} from "./animal-io";
import {
  dashboardCounts,
  getOwnedBreeding,
  getOwnedPrediction,
  getOwnedPredictionForBreeding,
  getOwnedProject,
  listOwnedBreedings,
  listOwnedPredictions,
  listOwnedProjectMembers,
  listOwnedProjects,
} from "./owned-tables";
import { getAnimalByOwnedCrestLinkId } from "./crest-link-io";
import type {
  Animal,
  AnimalRecord,
  Breeding,
  DatabaseFile,
  FeedbackRecord,
  PredictionRecord,
  ProjectRecord,
  SettingsRecord,
  WeightLogRecord,
} from "./types";

function genotypeOf(db: DatabaseFile, animalId: string): Genotype {
  const genotype: Genotype = {};
  for (const gene of db.genes) {
    if (gene.animalId !== animalId) continue;
    if (gene.status === "wild") continue;
    genotype[gene.locusId] = gene.status;
  }
  return genotype;
}

export function hydrateAnimal(db: DatabaseFile, record: AnimalRecord): Animal {
  return { ...record, genotype: genotypeOf(db, record.id) };
}

function emptyGeneDb(records: AnimalRecord[], genes: DatabaseFile["genes"]): DatabaseFile {
  return {
    animals: records,
    genes,
    weights: [],
    breedings: [],
    clutches: [],
    eggs: [],
    projects: [],
    projectMembers: [],
    predictions: [],
    settings: {
      displayName: "",
      collectionName: "",
      prefecture: "",
      publicByDefault: false,
    },
    feedback: [],
    crestLinkSeq: 0,
    animalCodeSeq: 0,
    crestLinks: [],
    crestLinkTransfers: [],
  };
}

export async function listAnimals(): Promise<Animal[]> {
  const user = await requireAppUser();
  const records = await listOwnedAnimalsAll(user.id);
  const genes = await listGenesForAnimals(records.map((row) => row.id));
  const db = emptyGeneDb(records, genes);
  return records
    .map((record) => hydrateAnimal(db, record))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getAnimal(id: string): Promise<Animal | undefined> {
  const user = await requireAppUser();
  const record = await getOwnedAnimal(user.id, id);
  if (!record) return undefined;
  const genes = await listGenesForAnimals([record.id]);
  return hydrateAnimal(emptyGeneDb([record], genes), record);
}

export async function getAnimalsByIds(ids: string[]): Promise<Animal[]> {
  const user = await requireAppUser();
  const records = await getOwnedAnimalsByIds(user.id, ids);
  const genes = await listGenesForAnimals(records.map((row) => row.id));
  const db = emptyGeneDb(records, genes);
  return records.map((record) => hydrateAnimal(db, record));
}

function publicSnapshotDb(snap: {
  animals: AnimalRecord[];
  genes: DatabaseFile["genes"];
  weights: DatabaseFile["weights"];
}): DatabaseFile {
  return {
    animals: snap.animals,
    genes: snap.genes,
    weights: snap.weights,
    breedings: [],
    clutches: [],
    eggs: [],
    projects: [],
    projectMembers: [],
    predictions: [],
    settings: {
      displayName: "",
      collectionName: "",
      prefecture: "",
      publicByDefault: false,
    },
    feedback: [],
    crestLinkSeq: 0,
    animalCodeSeq: 0,
    crestLinks: [],
    crestLinkTransfers: [],
  };
}

export async function getAnimalBySlug(slug: string): Promise<Animal | undefined> {
  if (!slug) return undefined;
  const snap = await loadPublicAnimals(slug);
  const record = snap.animals.find(
    (animal) => animal.shareSlug === slug && animal.isPublic,
  );
  if (!record) return undefined;
  return hydrateAnimal(publicSnapshotDb(snap), record);
}

export async function listPublicAnimals(): Promise<Animal[]> {
  const snap = await loadPublicAnimals();
  const mini = publicSnapshotDb(snap);
  return snap.animals.map((record) => hydrateAnimal(mini, record));
}

export async function publicWeightsByAnimal(): Promise<Map<string, WeightLogRecord[]>> {
  const snap = await loadPublicAnimals();
  const map = new Map<string, WeightLogRecord[]>();
  for (const row of snap.weights) {
    const list = map.get(row.animalId) ?? [];
    list.push(row);
    map.set(row.animalId, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.weighedOn.localeCompare(b.weighedOn));
  }
  return map;
}

export async function listPublicWeights(animalId: string): Promise<WeightLogRecord[]> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("animals")
    .select("id, is_public")
    .eq("id", animalId)
    .maybeSingle();
  if (error) {
    throw new Error(`animals を読めません: ${error.message}`);
  }
  if (!data?.is_public) return [];
  const logs = await listWeightsForAnimals([animalId]);
  return logs.sort((a, b) => a.weighedOn.localeCompare(b.weighedOn));
}

export async function filterAnimals(params: {
  q?: string;
  sex?: string;
  status?: string;
  page?: number;
}): Promise<{
  animals: Animal[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const user = await requireAppUser();
  const listed = await listOwnedAnimalsPage(user.id, params);
  const genes = await listGenesForAnimals(listed.records.map((row) => row.id));
  const db = emptyGeneDb(listed.records, genes);
  return {
    animals: listed.records.map((record) => hydrateAnimal(db, record)),
    total: listed.total,
    page: listed.page,
    pageSize: listed.pageSize,
  };
}

export async function listWeights(animalId: string): Promise<WeightLogRecord[]> {
  const logs = await listWeightsForAnimals([animalId]);
  return logs.sort((a, b) => a.weighedOn.localeCompare(b.weighedOn));
}

export async function weightsByAnimal(
  animalIds?: string[],
): Promise<Map<string, WeightLogRecord[]>> {
  const map = new Map<string, WeightLogRecord[]>();
  const ids =
    animalIds ??
    (await listOwnedAnimalsAll((await requireAppUser()).id)).map((row) => row.id);
  const logs = await listWeightsForAnimals(ids);
  for (const row of logs) {
    const list = map.get(row.animalId) ?? [];
    list.push(row);
    map.set(row.animalId, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.weighedOn.localeCompare(b.weighedOn));
  }
  return map;
}

export async function listBreedings(): Promise<Breeding[]> {
  const user = await requireAppUser();
  return listOwnedBreedings(user.id);
}

export async function getBreeding(id: string): Promise<Breeding | undefined> {
  const user = await requireAppUser();
  return getOwnedBreeding(user.id, id);
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const user = await requireAppUser();
  return listOwnedProjects(user.id);
}

export async function getProject(id: string): Promise<ProjectRecord | undefined> {
  const user = await requireAppUser();
  return getOwnedProject(user.id, id);
}

export async function projectMembers(projectId: string): Promise<{
  animal: Animal;
  role: import("./types").ProjectRole;
}[]> {
  const user = await requireAppUser();
  const members = await listOwnedProjectMembers(user.id, projectId);
  const records = await getOwnedAnimalsByIds(
    user.id,
    members.map((row) => row.animalId),
  );
  const genes = await listGenesForAnimals(records.map((row) => row.id));
  const db = emptyGeneDb(records, genes);
  return members.flatMap((row) => {
    const record = records.find((animal) => animal.id === row.animalId);
    if (!record) return [];
    return [{ animal: hydrateAnimal(db, record), role: row.role }];
  });
}

export async function listPredictions(): Promise<PredictionRecord[]> {
  const user = await requireAppUser();
  return listOwnedPredictions(user.id);
}

export async function getPrediction(id: string): Promise<PredictionRecord | undefined> {
  const user = await requireAppUser();
  return getOwnedPrediction(user.id, id);
}

export async function predictionForBreeding(breedingId: string): Promise<PredictionRecord | undefined> {
  const user = await requireAppUser();
  return getOwnedPredictionForBreeding(user.id, breedingId);
}

export async function listAnimalsForParents(): Promise<Animal[]> {
  const user = await requireAppUser();
  const records = await listOwnedParentOptions(user.id);
  return records.map((record) => ({ ...record, genotype: {} }));
}

export async function getSettings(): Promise<SettingsRecord> {
  const user = await requireAppUser();
  return getOwnedSettings(user.id);
}

export async function listFeedbackForOperator(): Promise<FeedbackRecord[]> {
  const db = await loadDb();
  return db.feedback.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function dashboardStats() {
  const user = await requireAppUser();
  const animalCount = await countOwnedAnimals(user.id, { excludeDeceased: true });
  const rest = await dashboardCounts(user.id);
  return {
    animalCount,
    ...rest,
  };
}

export async function getCrestLinkView(animalId: string): Promise<CrestLinkView | undefined> {
  return crestLinkView(await loadDb(), animalId);
}

export async function getAnimalByCrestLinkId(crestLinkId: string) {
  const record = await getAnimalByOwnedCrestLinkId(crestLinkId);
  if (!record) return undefined;
  const genes = await listGenesForAnimals([record.id]);
  return hydrateAnimal(emptyGeneDb([record], genes), record);
}

export async function childrenOf(animalId: string): Promise<Animal[]> {
  const user = await requireAppUser();
  const records = await listOwnedChildren(user.id, animalId);
  const genes = await listGenesForAnimals(records.map((row) => row.id));
  const db = emptyGeneDb(records, genes);
  return records.map((record) => hydrateAnimal(db, record));
}

export async function breedingsForAnimal(animalId: string): Promise<Breeding[]> {
  const user = await requireAppUser();
  const rows = await listOwnedBreedingsForAnimal(user.id, animalId);
  return rows.sort((a, b) => b.startedOn.localeCompare(a.startedOn));
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function pedigreeOf(animalId: string) {
  const user = await requireAppUser();
  const record = await getOwnedAnimal(user.id, animalId);
  if (!record) return undefined;
  const relativeIds = [
    record.sireId,
    record.damId,
  ].filter(Boolean);
  const parents = await getOwnedAnimalsByIds(user.id, relativeIds);
  const sireRecord = parents.find((row) => row.id === record.sireId);
  const damRecord = parents.find((row) => row.id === record.damId);
  const grandIds = [
    sireRecord?.sireId,
    sireRecord?.damId,
    damRecord?.sireId,
    damRecord?.damId,
  ].filter((id): id is string => Boolean(id));
  const grands = await getOwnedAnimalsByIds(user.id, grandIds);
  const children = await listOwnedChildren(user.id, animalId);
  const all = [record, ...parents, ...grands, ...children];
  const genes = await listGenesForAnimals(all.map((row) => row.id));
  const db = emptyGeneDb(all, genes);
  const animal = hydrateAnimal(db, record);
  const sire = sireRecord ? hydrateAnimal(db, sireRecord) : undefined;
  const dam = damRecord ? hydrateAnimal(db, damRecord) : undefined;
  function relative(id?: string) {
    if (!id) return undefined;
    const found = grands.find((row) => row.id === id);
    return found ? hydrateAnimal(db, found) : undefined;
  }
  return {
    animal,
    sire,
    dam,
    sireSire: relative(sire?.sireId),
    sireDam: relative(sire?.damId),
    damSire: relative(dam?.sireId),
    damDam: relative(dam?.damId),
    children: children.map((row) => hydrateAnimal(db, row)),
  };
}
