"use server";

import { actionError, actionOk, revalidateApp } from "@/app/components/action-result";
import {
  parseAnimalStatus,
  parseGenotype,
  parseSex,
  parseTraits,
  parseTraitLevels,
  nowIso,
  textField,
} from "@/lib/db/form";
import { issueAnimalCode } from "@/lib/db/animal-code";
import { nextPhotoUrl, parsePhotoForm } from "@/lib/db/animal-photo";
import {
  discardPreviousAnimalPhoto,
  removeManagedAnimalPhoto,
  uploadAnimalPhoto,
} from "@/lib/db/animal-photo-storage";
import { issueCrestLinkForAnimal, retireCrestLinkForAnimal, syncCrestLinkParents } from "@/lib/crest-link/core";
import { replaceGenes } from "@/lib/db/genes";
import { getAnimal } from "@/lib/db/queries";
import { mutateDb, newId, newSlug } from "@/lib/db/store";
import type { AnimalRecord } from "@/lib/db/types";

function parseAnimalFields(formData: FormData, existing?: AnimalRecord) {
  const name = textField(formData, "name");
  if (!name) {
    return { error: "名前は必須です。" as const };
  }
  const isPublic = formData.get("isPublic") === "on";
  const traits = parseTraits(formData);
  return {
    error: null,
    data: {
      name,
      sex: parseSex(textField(formData, "sex")),
      hatchDate: textField(formData, "hatchDate"),
      status: parseAnimalStatus(textField(formData, "status")),
      sireId: textField(formData, "sireId"),
      damId: textField(formData, "damId"),
      morphLabel: textField(formData, "morphLabel"),
      traits,
      traitLevels: parseTraitLevels(formData, traits),
      notes: textField(formData, "notes"),
      prefecture: textField(formData, "prefecture"),
      isPublic,
      shareSlug: existing?.shareSlug || (isPublic ? newSlug() : ""),
      genotype: parseGenotype(formData),
    },
  };
}

async function photoUrlFromForm(animalId: string, formData: FormData, existing = "") {
  const intent = parsePhotoForm(formData);
  if (intent.error) {
    return { error: intent.error, photoUrl: existing, uploaded: null as string | null };
  }
  const uploaded = intent.file ? await uploadAnimalPhoto(animalId, intent.file) : null;
  return {
    error: null as string | null,
    photoUrl: nextPhotoUrl(existing, uploaded, intent.remove),
    uploaded,
  };
}

export async function createAnimal(formData: FormData) {
  const parsed = parseAnimalFields(formData);
  if (parsed.error) {
    return actionError(parsed.error);
  }

  const id = newId();
  const stamp = nowIso();
  let uploaded: string | null = null;

  try {
    const photo = await photoUrlFromForm(id, formData);
    if (photo.error) return actionError(photo.error);
    uploaded = photo.uploaded;

    await mutateDb((db) => {
      const record: AnimalRecord = {
        id,
        crestLinkId: "",
        code: issueAnimalCode(db),
        name: parsed.data.name,
        sex: parsed.data.sex,
        hatchDate: parsed.data.hatchDate,
        status: parsed.data.status,
        sireId: parsed.data.sireId,
        damId: parsed.data.damId,
        morphLabel: parsed.data.morphLabel,
        traits: parsed.data.traits,
        traitLevels: parsed.data.traitLevels,
        notes: parsed.data.notes,
        photoUrl: photo.photoUrl,
        prefecture: parsed.data.prefecture || db.settings.prefecture,
        isPublic: parsed.data.isPublic,
        shareSlug: parsed.data.isPublic
          ? parsed.data.shareSlug || newSlug()
          : parsed.data.shareSlug,
        createdAt: stamp,
        updatedAt: stamp,
      };
      db.animals.push(record);
      issueCrestLinkForAnimal(db, id);
      db.genes = replaceGenes(db.genes, id, parsed.data.genotype);
    });
  } catch (error) {
    if (uploaded) {
      await removeManagedAnimalPhoto(uploaded).catch(() => undefined);
    }
    return actionError(error, "登録できませんでした。");
  }

  revalidateApp("/animals", `/animals/${id}`);
  return actionOk(`/animals/${id}`);
}

export async function updateAnimal(id: string, formData: FormData) {
  const existing = await getAnimal(id);
  if (!existing) {
    return actionError("個体が見つかりません。");
  }

  const parsed = parseAnimalFields(formData, existing);
  if (parsed.error) {
    return actionError(parsed.error);
  }

  if (parsed.data.sireId === id || parsed.data.damId === id) {
    return actionError("自分自身を親にはできません。");
  }

  const previousPhotoUrl = existing.photoUrl;
  let uploaded: string | null = null;

  try {
    const photo = await photoUrlFromForm(id, formData, previousPhotoUrl);
    if (photo.error) return actionError(photo.error);
    uploaded = photo.uploaded;

    await mutateDb((db) => {
      const record = db.animals.find((animal) => animal.id === id);
      if (!record) return;
      record.name = parsed.data.name;
      record.sex = parsed.data.sex;
      record.hatchDate = parsed.data.hatchDate;
      record.status = parsed.data.status;
      record.sireId = parsed.data.sireId;
      record.damId = parsed.data.damId;
      record.morphLabel = parsed.data.morphLabel;
      record.traits = parsed.data.traits;
      record.traitLevels = parsed.data.traitLevels;
      record.notes = parsed.data.notes;
      record.photoUrl = photo.photoUrl;
      record.prefecture = parsed.data.prefecture;
      record.isPublic = parsed.data.isPublic;
      if (parsed.data.isPublic && !record.shareSlug) {
        record.shareSlug = newSlug();
      }
      record.updatedAt = nowIso();
      db.genes = replaceGenes(db.genes, id, parsed.data.genotype);
      syncCrestLinkParents(db, id);
    });
    await discardPreviousAnimalPhoto(previousPhotoUrl, photo.photoUrl, id).catch(
      () => undefined,
    );
  } catch (error) {
    if (uploaded) {
      await removeManagedAnimalPhoto(uploaded).catch(() => undefined);
    }
    return actionError(error, "保存できませんでした。");
  }

  revalidateApp("/animals", `/animals/${id}`);
  return actionOk(`/animals/${id}`);
}

export async function deleteAnimal(
  id: string,
): Promise<{ error: string | null; deleted: boolean }> {
  if (!id) return { error: "削除できませんでした。", deleted: false };
  let previousPhotoUrl = "";
  try {
    await mutateDb((db) => {
      const usedAsParent = db.animals.some(
        (animal) => animal.sireId === id || animal.damId === id,
      );
      const usedInBreeding = db.breedings.some(
        (breeding) => breeding.maleId === id || breeding.femaleId === id,
      );
      if (usedAsParent || usedInBreeding) {
        throw new Error(
          "血統または繁殖ペアで参照されているため削除できません。先に紐付けを外してください。",
        );
      }
      previousPhotoUrl =
        db.animals.find((animal) => animal.id === id)?.photoUrl ?? "";
      retireCrestLinkForAnimal(db, id);
      db.animals = db.animals.filter((animal) => animal.id !== id);
      db.genes = db.genes.filter((gene) => gene.animalId !== id);
      db.weights = db.weights.filter((row) => row.animalId !== id);
      db.projectMembers = db.projectMembers.filter((row) => row.animalId !== id);
    });
  } catch (error) {
    return { error: actionError(error, "削除できませんでした。").error, deleted: false };
  }
  await discardPreviousAnimalPhoto(previousPhotoUrl, "", id).catch(() => undefined);

  revalidateApp("/animals");
  return { error: null, deleted: true };
}

export async function deleteAnimalForm(
  _prev: { error: string | null; deleted: boolean },
  formData: FormData,
): Promise<{ error: string | null; deleted: boolean }> {
  return deleteAnimal(textField(formData, "animalId"));
}

export async function addWeight(animalId: string, formData: FormData) {
  const weightG = Number(textField(formData, "weightG"));
  if (!Number.isFinite(weightG) || weightG <= 0) {
    return actionError("体重は正の数で入力してください。");
  }
  const weighedOn =
    textField(formData, "weighedOn") || new Date().toISOString().slice(0, 10);

  try {
    await mutateDb((db) => {
      db.weights.push({
        id: newId(),
        animalId,
        weighedOn,
        weightG,
        notes: textField(formData, "notes"),
      });
    });
  } catch (error) {
    return actionError(error, "記録できませんでした。");
  }

  revalidateApp(`/animals/${animalId}`);
  return actionOk(`/animals/${animalId}`);
}

export async function deleteWeight(animalId: string, weightId: string) {
  try {
    await mutateDb((db) => {
      db.weights = db.weights.filter((row) => row.id !== weightId);
    });
  } catch (error) {
    return actionError(error, "削除できませんでした。");
  }
  revalidateApp(`/animals/${animalId}`);
  return actionOk(`/animals/${animalId}`);
}
