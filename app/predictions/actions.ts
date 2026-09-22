"use server";

import { actionError, actionOk, revalidateApp } from "@/app/components/action-result";
import { calculatePairing, type Genotype } from "@/lib/genetics";
import { nowIso, textField } from "@/lib/db/form";
import { getAnimal } from "@/lib/db/queries";
import { mutateDb, newId } from "@/lib/db/store";

function parseJsonGenotype(raw: string): Genotype {
  try {
    const parsed = JSON.parse(raw) as Genotype;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function parseJsonStringArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map((value) => String(value)) : [];
  } catch {
    return [];
  }
}

export async function savePrediction(formData: FormData) {
  const maleId = textField(formData, "maleId");
  const femaleId = textField(formData, "femaleId");
  const parentA = parseJsonGenotype(textField(formData, "parentA"));
  const parentB = parseJsonGenotype(textField(formData, "parentB"));
  const visualA = parseJsonStringArray(textField(formData, "visualA"));
  const visualB = parseJsonStringArray(textField(formData, "visualB"));
  const pairing = calculatePairing(parentA, parentB, { visualA, visualB });
  const male = maleId ? await getAnimal(maleId) : undefined;
  const female = femaleId ? await getAnimal(femaleId) : undefined;
  const name =
    textField(formData, "name") ||
    `${male?.name ?? "親A"} × ${female?.name ?? "親B"}`;

  const id = newId();
  try {
    await mutateDb((db) => {
      db.predictions.push({
        id,
        name,
        maleId,
        femaleId,
        parentA,
        parentB,
        pairing,
        breedingId: textField(formData, "breedingId"),
        projectId: textField(formData, "projectId"),
        createdAt: nowIso(),
      });
    });
  } catch (error) {
    return actionError(error, "保存できませんでした。");
  }

  revalidateApp("/predictions", `/predictions/${id}`);
  return actionOk(`/predictions/${id}`);
}
