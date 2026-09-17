import { crestLinkView, getAnimalByCrestLinkId as animalRecordByCrestLink, type CrestLinkView } from "@/lib/crest-link/core";
import { formatGenotypeLabel, type Genotype } from "@/lib/genetics";
import { loadDb } from "./store";
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

export async function listAnimals(): Promise<Animal[]> {
  const db = await loadDb();
  return db.animals
    .map((record) => hydrateAnimal(db, record))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getAnimal(id: string): Promise<Animal | undefined> {
  const db = await loadDb();
  const record = db.animals.find((animal) => animal.id === id);
  return record ? hydrateAnimal(db, record) : undefined;
}

export async function getAnimalBySlug(slug: string): Promise<Animal | undefined> {
  if (!slug) return undefined;
  const db = await loadDb();
  const record = db.animals.find(
    (animal) => animal.shareSlug === slug && animal.isPublic,
  );
  return record ? hydrateAnimal(db, record) : undefined;
}

export async function filterAnimals(params: {
  q?: string;
  sex?: string;
  status?: string;
}): Promise<Animal[]> {
  const q = params.q?.trim().toLowerCase() ?? "";
  const animals = await listAnimals();
  return animals.filter((animal) => {
    if (params.sex && animal.sex !== params.sex) return false;
    if (params.status && animal.status !== params.status) return false;
    if (!q) return true;
    const haystack = [
      animal.name,
      animal.code,
      animal.crestLinkId,
      animal.morphLabel,
      formatGenotypeLabel(animal.genotype),
      animal.notes,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export async function listWeights(animalId: string): Promise<WeightLogRecord[]> {
  const db = await loadDb();
  return db.weights
    .filter((row) => row.animalId === animalId)
    .sort((a, b) => a.weighedOn.localeCompare(b.weighedOn));
}

export async function weightsByAnimal(): Promise<Map<string, WeightLogRecord[]>> {
  const map = new Map<string, WeightLogRecord[]>();
  const db = await loadDb();
  for (const row of db.weights) {
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
  const animals = await listAnimals();
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
    animalCount: animals.filter((animal) => animal.status !== "deceased").length,
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
