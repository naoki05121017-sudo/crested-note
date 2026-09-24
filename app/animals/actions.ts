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
import { issueAnimalCode } from "@/lib/db/animal-code";
import { nextPhotoUrl, parsePhotoForm } from "@/lib/db/animal-photo";
import {
  discardPreviousAnimalPhoto,
  removeManagedAnimalPhoto,
  uploadAnimalPhoto,
} from "@/lib/db/animal-photo-storage";
import { issueCrestLinkForAnimal, retireCrestLinkForAnimal, syncCrestLinkParents } from "@/lib/crest-link/core";
import { parentSexAssignmentError } from "@/lib/db/parent-sex";
import { replaceGenes } from "@/lib/db/genes";
import { getAnimal } from "@/lib/db/queries";
import { mutateDb, newId, newSlug } from "@/lib/db/store";
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

  const id = newId();
  const stamp = nowIso();
  let uploaded: string | null = null;

  try {
    const photo = await photoUrlFromForm(id, formData);
    if (photo.error) return actionError(photo.error);
    uploaded = photo.uploaded;

    await mutateDb((db) => {
      const parentError = parentSexAssignmentError(
        db.animals,
        fields.sireId,
        fields.damId,
      );
      if (parentError) throw new Error(parentError);
      const record: AnimalRecord = {
        id,
        crestLinkId: "",
        code: issueAnimalCode(db),
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
        prefecture: fields.prefecture || db.settings.prefecture,
        checkEveryDays: fields.checkEveryDays,
        isPublic: fields.isPublic,
        shareSlug: fields.isPublic
          ? fields.shareSlug || newSlug()
          : fields.shareSlug,
        createdAt: stamp,
        updatedAt: stamp,
      };
      db.animals.push(record);
      issueCrestLinkForAnimal(db, id);
      db.genes = replaceGenes(db.genes, id, fields.genotype);
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

    await mutateDb((db) => {
      const record = db.animals.find((animal) => animal.id === id);
      if (!record) return;
      const parentError = parentSexAssignmentError(
        db.animals,
        fields.sireId,
        fields.damId,
        { sireId: existing.sireId, damId: existing.damId },
      );
      if (parentError) throw new Error(parentError);
      record.name = fields.name;
      record.sex = fields.sex;
      record.hatchDate = fields.hatchDate;
      record.status = fields.status;
      record.sireId = fields.sireId;
      record.damId = fields.damId;
      record.morphLabel = fields.morphLabel;
      record.traits = fields.traits;
      record.traitLevels = fields.traitLevels;
      record.notes = fields.notes;
      record.photoUrl = photo.photoUrl;
      record.prefecture = fields.prefecture;
      applyCheckEveryDays(record, fields.checkEveryDays);
      record.isPublic = fields.isPublic;
      if (fields.isPublic && !record.shareSlug) {
        record.shareSlug = newSlug();
      }
      record.updatedAt = nowIso();
      db.genes = replaceGenes(db.genes, id, fields.genotype);
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
    await mutateDb((db) => {
      const record = db.animals.find((animal) => animal.id === id);
      if (!record) return;
      applyCheckEveryDays(record, cadence.days);
      record.updatedAt = nowIso();
    });
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
