"use server";

import { actionError, actionOk, revalidateApp } from "@/app/components/action-result";
import { issueCrestLinkForAnimal } from "@/lib/crest-link/core";
import { issueAnimalCode } from "@/lib/db/animal-code";
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
    return actionError("オスとメスを選んでください。");
  }
  if (maleId === femaleId) {
    return actionError("同じ個体同士ではペアにできません。");
  }
  if (male.sex === "female" || female.sex === "male") {
    return actionError("性別がペア向きではありません。");
  }

  const id = newId();
  const predictionId = newId();
  const pairing = calculatePairing(male.genotype, female.genotype);
  try {
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
  } catch (error) {
    return actionError(error, "ペアを作成できませんでした。");
  }

  revalidateApp("/breedings", `/breedings/${id}`);
  return actionOk(`/breedings/${id}`);
}

export async function closeBreeding(id: string) {
  try {
    await mutateDb((db) => {
      const breeding = db.breedings.find((row) => row.id === id);
      if (!breeding) throw new Error("ペアが見つかりません。");
      breeding.status = "closed";
      breeding.endedOn = new Date().toISOString().slice(0, 10);
    });
  } catch (error) {
    return actionError(error, "終了できませんでした。");
  }
  revalidateApp("/breedings", `/breedings/${id}`);
  return actionOk(`/breedings/${id}`);
}

export async function addClutch(breedingId: string, formData: FormData) {
  const breeding = await getBreeding(breedingId);
  if (!breeding) return actionError("ペアが見つかりません。");

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
  try {
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
  } catch (error) {
    return actionError(error, "追加できませんでした。");
  }

  revalidateApp(`/breedings/${breedingId}`);
  return actionOk(`/breedings/${breedingId}`);
}

export async function updateEgg(eggId: string, formData: FormData) {
  const result = parseEggResult(textField(formData, "result"));
  const expectedHatchOn = textField(formData, "expectedHatchOn");
  const notes = textField(formData, "notes");
  let breedingId = "";

  try {
    await mutateDb((db) => {
      const egg = db.eggs.find((row) => row.id === eggId);
      if (!egg) throw new Error("卵が見つかりません。");
      const clutch = db.clutches.find((row) => row.id === egg.clutchId);
      breedingId = clutch?.breedingId ?? "";
      if (egg.result === "hatched" && egg.hatchAnimalId) {
        return;
      }
      egg.result = result === "hatched" ? egg.result : result;
      if (expectedHatchOn) egg.expectedHatchOn = expectedHatchOn;
      egg.notes = notes;
    });
  } catch (error) {
    return actionError(error, "更新できませんでした。");
  }

  const href = breedingId ? `/breedings/${breedingId}` : "/breedings";
  revalidateApp(href);
  return actionOk(href);
}

export async function hatchEgg(eggId: string, formData: FormData) {
  const name = textField(formData, "name");
  if (!name) return actionError("孵化個体の名前は必須です。");

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

  try {
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
        code: issueAnimalCode(db),
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
  } catch (error) {
    return actionError(error, "孵化登録できませんでした。");
  }

  revalidateApp("/animals", `/animals/${animalId}`, `/breedings/${breedingId}`);
  return actionOk(`/animals/${animalId}?from=${breedingId}`);
}
