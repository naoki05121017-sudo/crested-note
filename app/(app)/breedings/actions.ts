"use server";

import { actionError, actionOk, revalidateApp } from "@/app/components/action-result";
import { replaceGenes } from "@/lib/db/genes";
import {
  deleteOwnedAnimal,
  insertOwnedAnimal,
  issueNextAnimalCode,
} from "@/lib/db/animal-io";
import { issueOwnedCrestLink } from "@/lib/db/crest-link-io";
import { requireAppUser } from "@/lib/auth/session";
import { calculatePairing, genotypeFromCopies, type AlleleCopies } from "@/lib/genetics";
import {
  nowIso,
  parseEggResult,
  parseGenotype,
  parseSex,
  textField,
} from "@/lib/db/form";
import { addDays, getAnimal, getBreeding, getSettings } from "@/lib/db/queries";
import {
  closeOwnedBreeding,
  getEggContext,
  insertOwnedBreeding,
  insertOwnedClutchWithEggs,
  insertOwnedPrediction,
  markAnimalsBreeding,
  markEggHatched,
  updateOwnedEgg,
} from "@/lib/db/owned-tables";
import { newId } from "@/lib/db/store";
import type { AnimalRecord } from "@/lib/db/types";
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
  const pairing = calculatePairing(male.genotype, female.genotype, {
    visualA: male.traits,
    visualB: female.traits,
  });
  try {
    const user = await requireAppUser();
    const stamp = nowIso();
    await insertOwnedPrediction(user.id, {
      id: predictionId,
      name: `${animalTitle(male)} × ${animalTitle(female)}`,
      maleId,
      femaleId,
      parentA: male.genotype,
      parentB: female.genotype,
      pairing,
      breedingId: id,
      projectId: textField(formData, "projectId"),
      createdAt: stamp,
    });
    await insertOwnedBreeding(user.id, {
      id,
      maleId,
      femaleId,
      startedOn: startedOn || new Date().toISOString().slice(0, 10),
      notes,
      predictionId,
      projectId: textField(formData, "projectId"),
      createdAt: stamp,
    });
    await markAnimalsBreeding(user.id, [maleId, femaleId]);
  } catch (error) {
    return actionError(error, "ペアを作成できませんでした。");
  }

  revalidateApp("/breedings", `/breedings/${id}`);
  return actionOk(`/breedings/${id}`);
}

export async function closeBreeding(id: string) {
  try {
    const user = await requireAppUser();
    await closeOwnedBreeding(user.id, id);
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
    const user = await requireAppUser();
    await insertOwnedClutchWithEggs(
      user.id,
      breedingId,
      { id: clutchId, laidOn, notes },
      Array.from({ length: eggCount }, () => ({
        id: newId(),
        expectedHatchOn,
      })),
    );
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
    const user = await requireAppUser();
    breedingId = await updateOwnedEgg(user.id, eggId, {
      result,
      expectedHatchOn,
      notes,
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
    const user = await requireAppUser();
    const { breeding } = await getEggContext(user.id, eggId);
    breedingId = breeding.id;
    animalId = newId();
    const stamp = nowIso();
    const settings = await getSettings();
    const record: AnimalRecord = {
      id: animalId,
      crestLinkId: "",
      code: await issueNextAnimalCode(user.id),
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
      isPublic: settings.publicByDefault,
      shareSlug: settings.publicByDefault ? newId().slice(0, 8) : "",
      prefecture: settings.prefecture,
      createdAt: stamp,
      updatedAt: stamp,
    };
    const genes = replaceGenes([], animalId, genotype);
    await insertOwnedAnimal(user.id, record, genes);
    try {
      await issueOwnedCrestLink(user.id, record);
      await markEggHatched(user.id, eggId, animalId);
    } catch (error) {
      await deleteOwnedAnimal(user.id, animalId).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    return actionError(error, "孵化登録できませんでした。");
  }

  revalidateApp("/animals", `/animals/${animalId}`, `/breedings/${breedingId}`);
  return actionOk(`/animals/${animalId}?from=${breedingId}`);
}
