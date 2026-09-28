"use server";

import { redirect } from "next/navigation";
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
import { nextPhotoUrl, parsePhotoForm } from "@/lib/db/animal-photo";
import {
  discardPreviousAnimalPhoto,
  removeManagedAnimalPhoto,
  uploadAnimalPhoto,
} from "@/lib/db/animal-photo-storage";
import { issueCrestLinkForAnimal, retireCrestLinkForAnimal, syncCrestLinkParents } from "@/lib/crest-link/core";
import { parentSexAssignmentError } from "@/lib/db/parent-sex";
import { replaceGenes } from "@/lib/db/genes";
import { getAnimal, getSettings } from "@/lib/db/queries";
import {
  animalIsReferenced,
  deleteOwnedAnimal,
  getOwnedAnimal,
  getOwnedAnimalsByIds,
  insertOwnedAnimal,
  issueNextAnimalCode,
  patchOwnedAnimalCrestLinkId,
  replaceOwnedAnimalGenes,
  listGenesForAnimals,
  updateOwnedAnimal,
} from "@/lib/db/animal-io";
import { mutateDb, newId, newSlug } from "@/lib/db/store";
import { requireSessionUser } from "@/lib/auth/session";
import { parseCheckEveryDays } from "@/lib/care/check-cadence";
import type { AnimalRecord } from "@/lib/db/types";

function parseAnimalFields(formData: FormData, existing?: AnimalRecord) {
  const name = textField(formData, "name");
  if (!name) {
    return { error: "名前は必須です。" as const };
  }
  const isPublic = formData.get("isPublic") === "on";
  const traits = parseTraits(formData);
  const cadence = parseCheckEveryDays(formData, existing?.checkEveryDays);
  if (cadence.error !== null) {
    return { error: cadence.error };
  }
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
      checkEveryDays: cadence.days,
    },
  };
}

function applyCheckEveryDays(
  record: AnimalRecord,
  days: number | undefined,
) {
  if (days == null) {
    delete record.checkEveryDays;
    return;
  }
  record.checkEveryDays = days;
}

async function photoUrlFromForm(animalId: string, formData: FormData, existing = "") {
  const intent = parsePhotoForm(formData);
  if (intent.error) {
    return { error: intent.error, photoUrl: existing, uploaded: null as string | null };
  }
  const uploaded = intent.file ? await uploadAnimalPhoto(animalId, intent.file) : null;
  return {
    error: null as string | null,
    photoUrl: nextPhotoUrl(
      existing,
      uploaded,
      intent.remove,
      textField(formData, "photoUrl"),
    ),
    uploaded,
  };
}

export async function createAnimal(formData: FormData) {
  const parsed = parseAnimalFields(formData);
  if (parsed.error || !parsed.data) {
    return actionError(parsed.error ?? "登録できませんでした。");
  }
  const fields = parsed.data;
  const user = await requireSessionUser();

  const id = newId();
  const stamp = nowIso();
  let uploaded: string | null = null;

  try {
    const photo = await photoUrlFromForm(id, formData);
    if (photo.error) return actionError(photo.error);
    uploaded = photo.uploaded;

    const parents = await getOwnedAnimalsByIds(user.id, [
      fields.sireId,
      fields.damId,
    ]);
    const parentError = parentSexAssignmentError(
      parents,
      fields.sireId,
      fields.damId,
    );
    if (parentError) throw new Error(parentError);

    const settings = await getSettings();
    const genes = replaceGenes([], id, fields.genotype);
    const record: AnimalRecord = {
      id,
      crestLinkId: "",
      code: await issueNextAnimalCode(user.id),
      name: fields.name,
      sex: fields.sex,
      hatchDate: fields.hatchDate,
      status: fields.status,
      sireId: fields.sireId,
      damId: fields.damId,
      morphLabel: fields.morphLabel,
      traits: fields.traits,
      traitLevels: fields.traitLevels,
      notes: fields.notes,
      photoUrl: photo.photoUrl,
      prefecture: fields.prefecture || settings.prefecture,
      checkEveryDays: fields.checkEveryDays,
      isPublic: fields.isPublic,
      shareSlug: fields.isPublic
        ? fields.shareSlug || newSlug()
        : fields.shareSlug,
      createdAt: stamp,
      updatedAt: stamp,
    };
    await insertOwnedAnimal(user.id, record, genes);
    try {
      const link = await mutateDb((db) => {
        if (!db.animals.some((animal) => animal.id === id)) {
          db.animals.push(record);
        }
        const issued = issueCrestLinkForAnimal(db, id);
        db.genes = replaceGenes(db.genes, id, fields.genotype);
        return issued;
      });
      await patchOwnedAnimalCrestLinkId(user.id, id, link.id);
    } catch (error) {
      await deleteOwnedAnimal(user.id, id).catch(() => undefined);
      throw error;
    }
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
  if (parsed.error || !parsed.data) {
    return actionError(parsed.error ?? "保存できませんでした。");
  }
  const fields = parsed.data;

  if (fields.sireId === id || fields.damId === id) {
    return actionError("自分自身を親にはできません。");
  }

  const previousPhotoUrl = existing.photoUrl;
  let uploaded: string | null = null;

  try {
    const photo = await photoUrlFromForm(id, formData, previousPhotoUrl);
    if (photo.error) return actionError(photo.error);
    uploaded = photo.uploaded;
    const user = await requireSessionUser();
    const parents = await getOwnedAnimalsByIds(user.id, [
      fields.sireId,
      fields.damId,
    ]);
    const parentError = parentSexAssignmentError(
      parents,
      fields.sireId,
      fields.damId,
      { sireId: existing.sireId, damId: existing.damId },
    );
    if (parentError) throw new Error(parentError);

    const next: AnimalRecord = {
      ...existing,
      name: fields.name,
      sex: fields.sex,
      hatchDate: fields.hatchDate,
      status: fields.status,
      sireId: fields.sireId,
      damId: fields.damId,
      morphLabel: fields.morphLabel,
      traits: fields.traits,
      traitLevels: fields.traitLevels,
      notes: fields.notes,
      photoUrl: photo.photoUrl,
      prefecture: fields.prefecture,
      isPublic: fields.isPublic,
      shareSlug:
        fields.isPublic && !existing.shareSlug
          ? newSlug()
          : existing.shareSlug,
      updatedAt: nowIso(),
    };
    applyCheckEveryDays(next, fields.checkEveryDays);
    const genes = await replaceOwnedAnimalGenes(id, fields.genotype);
    await updateOwnedAnimal(user.id, next, genes);
    await mutateDb((db) => {
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
    const user = await requireSessionUser();
    if (await animalIsReferenced(user.id, id)) {
      throw new Error(
        "血統または繁殖ペアで参照されているため削除できません。先に紐付けを外してください。",
      );
    }
    const existingRow = await getOwnedAnimal(user.id, id);
    previousPhotoUrl = existingRow?.photoUrl ?? "";
    await mutateDb((db) => {
      retireCrestLinkForAnimal(db, id);
      db.projectMembers = db.projectMembers.filter((row) => row.animalId !== id);
    });
    await deleteOwnedAnimal(user.id, id);
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

  revalidateApp("/", `/animals/${animalId}`);
  return actionOk(`/animals/${animalId}?recorded=1`);
}

export async function updateCheckCadence(id: string, formData: FormData) {
  const existing = await getAnimal(id);
  if (!existing) {
    return actionError("個体が見つかりません。");
  }
  const cadence = parseCheckEveryDays(formData, existing.checkEveryDays);
  if (cadence.error !== null) {
    return actionError(cadence.error);
  }

  try {
    const user = await requireSessionUser();
    const next: AnimalRecord = { ...existing, updatedAt: nowIso() };
    applyCheckEveryDays(next, cadence.days);
    const genes = await listGenesForAnimals([id]);
    await updateOwnedAnimal(user.id, next, genes);
  } catch (error) {
    return actionError(error, "保存できませんでした。");
  }

  revalidateApp("/", `/animals/${id}`);
  redirect(`/animals/${id}#check-cadence`);
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
