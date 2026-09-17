"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { issueCrestLinkForAnimal } from "@/lib/crest-link/core";
import { calculatePairing, genotypeFromCopies, type AlleleCopies } from "@/lib/genetics";
import {
  nowIso,
  parseEggResult,
  parseGenotype,
  parseSex,
  textField,
} from "@/lib/db/form";
import { addDays, getAnimal, getBreeding } from "@/lib/db/queries";
import { mutateDb, newId } from "@/lib/db/store";
import type { AnimalRecord, ClutchRecord, EggRecord } from "@/lib/db/types";
import { animalTitle } from "@/lib/db/labels";

export async function createBreeding(formData: FormData) {
  const maleId = textField(formData, "maleId");
  const femaleId = textField(formData, "femaleId");
  const startedOn = textField(formData, "startedOn");
  const notes = textField(formData, "notes");

  const male = await getAnimal(maleId);
  const female = await getAnimal(femaleId);
  if (!male || !female) {
    throw new Error("オスとメスを選んでください。");
  }
  if (maleId === femaleId) {
    throw new Error("同じ個体同士ではペアにできません。");
  }
  if (male.sex === "female" || female.sex === "male") {
    throw new Error("性別がペア向きではありません。");
  }

  const id = newId();
  const predictionId = newId();
  const pairing = calculatePairing(male.genotype, female.genotype);
  await mutateDb((db) => {
    db.predictions.push({
      id: predictionId,
      name: `${animalTitle(male)} × ${animalTitle(female)}`,
      maleId,
      femaleId,
      parentA: male.genotype,
      parentB: female.genotype,
      pairing,
      breedingId: id,
      projectId: textField(formData, "projectId"),
      createdAt: nowIso(),
    });
    db.breedings.push({
      id,
      maleId,
      femaleId,
      startedOn: startedOn || new Date().toISOString().slice(0, 10),
      endedOn: "",
      status: "active",
      notes,
      predictionId,
      projectId: textField(formData, "projectId"),
      createdAt: nowIso(),
    });
    const maleRecord = db.animals.find((animal) => animal.id === maleId);
    const femaleRecord = db.animals.find((animal) => animal.id === femaleId);
    if (maleRecord && maleRecord.status === "active") maleRecord.status = "breeding";
    if (femaleRecord && femaleRecord.status === "active") {
      femaleRecord.status = "breeding";
    }
  });

  revalidatePath("/", "layout");
  redirect(`/breedings/${id}`);
}

export async function closeBreeding(id: string) {
  await mutateDb((db) => {
    const breeding = db.breedings.find((row) => row.id === id);
    if (!breeding) return;
    breeding.status = "closed";
    breeding.endedOn = new Date().toISOString().slice(0, 10);
  });
  revalidatePath("/", "layout");
  redirect(`/breedings/${id}`);
}

export async function addClutch(breedingId: string, formData: FormData) {
  const breeding = await getBreeding(breedingId);
  if (!breeding) throw new Error("ペアが見つかりません。");

  const laidOn =
    textField(formData, "laidOn") || new Date().toISOString().slice(0, 10);
  const notes = textField(formData, "notes");
  const eggCount = Math.min(
    12,
    Math.max(1, Number(textField(formData, "eggCount") || "2") || 2),
  );
  const expectedHatchOn =
    textField(formData, "expectedHatchOn") || addDays(laidOn, 90);

  const clutchId = newId();
  await mutateDb((db) => {
    const clutch: ClutchRecord = {
      id: clutchId,
      breedingId,
      laidOn,
      notes,
    };
    db.clutches.push(clutch);
    for (let i = 0; i < eggCount; i += 1) {
      const egg: EggRecord = {
        id: newId(),
        clutchId,
        expectedHatchOn,
        result: "incubating",
        hatchAnimalId: "",
        notes: "",
      };
      db.eggs.push(egg);
    }
  });

  revalidatePath("/", "layout");
  redirect(`/breedings/${breedingId}`);
}

export async function updateEgg(eggId: string, formData: FormData) {
  const result = parseEggResult(textField(formData, "result"));
  const expectedHatchOn = textField(formData, "expectedHatchOn");
  const notes = textField(formData, "notes");

  await mutateDb((db) => {
    const egg = db.eggs.find((row) => row.id === eggId);
    if (!egg) return;
    if (egg.result === "hatched" && egg.hatchAnimalId) {
      return;
    }
    egg.result = result === "hatched" ? egg.result : result;
    if (expectedHatchOn) egg.expectedHatchOn = expectedHatchOn;
    egg.notes = notes;
  });

  revalidatePath("/", "layout");
}

export async function hatchEgg(eggId: string, formData: FormData) {
  const name = textField(formData, "name");
  if (!name) throw new Error("孵化個体の名前は必須です。");

  const copiesRaw = textField(formData, "copiesJson");
  let genotype = parseGenotype(formData);
  if (copiesRaw) {
    try {
      const copies = JSON.parse(copiesRaw) as Record<string, AlleleCopies>;
      genotype = genotypeFromCopies(copies);
    } catch {
      // keep form genotype
    }
  }

  let animalId = "";
  let breedingId = "";

  await mutateDb((db) => {
    const egg = db.eggs.find((row) => row.id === eggId);
    if (!egg) throw new Error("卵が見つかりません。");
    if (egg.hatchAnimalId) throw new Error("すでに孵化登録済みです。");

    const clutch = db.clutches.find((row) => row.id === egg.clutchId);
    if (!clutch) throw new Error("クラッチが見つかりません。");
    const breeding = db.breedings.find((row) => row.id === clutch.breedingId);
    if (!breeding) throw new Error("ペアが見つかりません。");
    breedingId = breeding.id;

    animalId = newId();
    const stamp = nowIso();
    const record: AnimalRecord = {
      id: animalId,
      crestLinkId: "",
      code: textField(formData, "code"),
      name,
      sex: parseSex(textField(formData, "sex")),
      hatchDate:
        textField(formData, "hatchDate") ||
        new Date().toISOString().slice(0, 10),
      status: "active",
      sireId: breeding.maleId,
      damId: breeding.femaleId,
      morphLabel: textField(formData, "morphLabel"),
      traits: [],
      notes: "",
      photoUrl: "",
      isPublic: db.settings.publicByDefault,
      shareSlug: db.settings.publicByDefault ? newId().slice(0, 8) : "",
      prefecture: db.settings.prefecture,
      createdAt: stamp,
      updatedAt: stamp,
    };
    db.animals.push(record);
    issueCrestLinkForAnimal(db, animalId);
    for (const [locusId, status] of Object.entries(genotype)) {
      if (!status || status === "wild") continue;
      db.genes.push({ animalId, locusId, status });
    }
    egg.result = "hatched";
    egg.hatchAnimalId = animalId;
  });

  revalidatePath("/", "layout");
  redirect(`/animals/${animalId}?from=${breedingId}`);
}
