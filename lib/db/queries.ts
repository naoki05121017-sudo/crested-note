import { crestLinkView, getAnimalByCrestLinkId as animalRecordByCrestLink, type CrestLinkView } from "@/lib/crest-link/core";
import type { Genotype } from "@/lib/genetics";
import { requireSessionUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadDb } from "./store";
import { loadPublicAnimals } from "./supabase-io";
import {
  countOwnedAnimals,
  getOwnedAnimal,
  listGenesForAnimals,
  listOwnedAnimalsAll,
  listOwnedAnimalsPage,
  listWeightsForAnimals,
} from "./animal-io";
import type {
  Animal,
  AnimalRecord,
  Breeding,
  Clutch,
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
  const user = await requireSessionUser();
  const records = await listOwnedAnimalsAll(user.id);
  const genes = await listGenesForAnimals(records.map((row) => row.id));
  const db = emptyGeneDb(records, genes);
  return records
    .map((record) => hydrateAnimal(db, record))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getAnimal(id: string): Promise<Animal | undefined> {
  const user = await requireSessionUser();
  const record = await getOwnedAnimal(user.id, id);
  if (!record) return undefined;
  const genes = await listGenesForAnimals([record.id]);
  return hydrateAnimal(emptyGeneDb([record], genes), record);
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
  const user = await requireSessionUser();
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
    (await listOwnedAnimalsAll((await requireSessionUser()).id)).map((row) => row.id);
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
  const db = await loadDb();
  return db.breedings
    .map((record) => hydrateBreeding(db, record.id))
    .filter((row): row is Breeding => row !== undefined)
    .sort((a, b) => b.startedOn.localeCompare(a.startedOn));
}

export async function getBreeding(id: string): Promise<Breeding | undefined> {
  return hydrateBreeding(await loadDb(), id);
}

function hydrateBreeding(db: DatabaseFile, id: string): Breeding | undefined {
  const record = db.breedings.find((breeding) => breeding.id === id);
  if (!record) return undefined;
  const clutches: Clutch[] = db.clutches
    .filter((clutch) => clutch.breedingId === id)
    .map((clutch) => ({
      ...clutch,
      eggs: db.eggs.filter((egg) => egg.clutchId === clutch.id),
    }))
    .sort((a, b) => b.laidOn.localeCompare(a.laidOn));
  return { ...record, clutches };
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const db = await loadDb();
  return db.projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getProject(id: string): Promise<ProjectRecord | undefined> {
  const db = await loadDb();
  return db.projects.find((project) => project.id === id);
}

export async function projectMembers(projectId: string): Promise<{
  animal: Animal;
  role: import("./types").ProjectRole;
}[]> {
  const db = await loadDb();
  return db.projectMembers
    .filter((row) => row.projectId === projectId)
    .flatMap((row) => {
      const record = db.animals.find((animal) => animal.id === row.animalId);
      if (!record) return [];
      return [{ animal: hydrateAnimal(db, record), role: row.role }];
    });
}

export async function listPredictions(): Promise<PredictionRecord[]> {
  const db = await loadDb();
  return db.predictions.sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function getPrediction(id: string): Promise<PredictionRecord | undefined> {
  const db = await loadDb();
  return db.predictions.find((row) => row.id === id);
}

export async function predictionForBreeding(breedingId: string): Promise<PredictionRecord | undefined> {
  const db = await loadDb();
  return db.predictions.find((row) => row.breedingId === breedingId);
}

export async function getSettings(): Promise<SettingsRecord> {
  const db = await loadDb();
  return db.settings;
}

export async function listFeedbackForOperator(): Promise<FeedbackRecord[]> {
  const db = await loadDb();
  return db.feedback.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function dashboardStats() {
  const user = await requireSessionUser();
  const animalCount = await countOwnedAnimals(user.id, { excludeDeceased: true });
  const breedings = await listBreedings();
  const incubating = breedings.flatMap((breeding) =>
    breeding.clutches.flatMap((clutch) =>
      clutch.eggs
        .filter(
          (egg) => egg.result === "incubating" || egg.result === "fertile",
        )
        .map((egg) => ({ egg, breedingId: breeding.id })),
    ),
  );
  const today = new Date().toISOString().slice(0, 10);
  const soon = incubating.filter((row) => {
    if (!row.egg.expectedHatchOn) return false;
    return row.egg.expectedHatchOn >= today;
  });
  const projects = await listProjects();

  return {
    animalCount,
    activeBreedings: breedings.filter((breeding) => breeding.status === "active")
      .length,
    incubatingEggs: incubating.length,
    projectCount: projects.filter((project) => project.status === "active")
      .length,
    upcomingHatches: soon
      .slice()
      .sort((a, b) =>
        a.egg.expectedHatchOn.localeCompare(b.egg.expectedHatchOn),
      )
      .slice(0, 8),
  };
}

export async function getCrestLinkView(animalId: string): Promise<CrestLinkView | undefined> {
  return crestLinkView(await loadDb(), animalId);
}

export async function getAnimalByCrestLinkId(crestLinkId: string) {
  const db = await loadDb();
  const record = animalRecordByCrestLink(db, crestLinkId);
  return record ? hydrateAnimal(db, record) : undefined;
}

export async function childrenOf(animalId: string): Promise<Animal[]> {
  const animals = await listAnimals();
  return animals.filter(
    (animal) => animal.sireId === animalId || animal.damId === animalId,
  );
}

export async function breedingsForAnimal(animalId: string): Promise<Breeding[]> {
  const breedings = await listBreedings();
  return breedings.filter(
    (breeding) =>
      breeding.maleId === animalId || breeding.femaleId === animalId,
  );
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function pedigreeOf(animalId: string) {
  const db = await loadDb();
  const record = db.animals.find((animal) => animal.id === animalId);
  if (!record) return undefined;
  const animal = hydrateAnimal(db, record);
  const sireRecord = animal.sireId
    ? db.animals.find((row) => row.id === animal.sireId)
    : undefined;
  const damRecord = animal.damId
    ? db.animals.find((row) => row.id === animal.damId)
    : undefined;
  const sire = sireRecord ? hydrateAnimal(db, sireRecord) : undefined;
  const dam = damRecord ? hydrateAnimal(db, damRecord) : undefined;
  return {
    animal,
    sire,
    dam,
    sireSire: sire?.sireId
      ? db.animals.find((row) => row.id === sire.sireId)
        ? hydrateAnimal(db, db.animals.find((row) => row.id === sire.sireId)!)
        : undefined
      : undefined,
    sireDam: sire?.damId
      ? db.animals.find((row) => row.id === sire.damId)
        ? hydrateAnimal(db, db.animals.find((row) => row.id === sire.damId)!)
        : undefined
      : undefined,
    damSire: dam?.sireId
      ? db.animals.find((row) => row.id === dam.sireId)
        ? hydrateAnimal(db, db.animals.find((row) => row.id === dam.sireId)!)
        : undefined
      : undefined,
    damDam: dam?.damId
      ? db.animals.find((row) => row.id === dam.damId)
        ? hydrateAnimal(db, db.animals.find((row) => row.id === dam.damId)!)
        : undefined
      : undefined,
    children: db.animals
      .filter((row) => row.sireId === animalId || row.damId === animalId)
      .map((row) => hydrateAnimal(db, row)),
  };
}
