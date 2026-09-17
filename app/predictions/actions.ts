"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

export async function savePrediction(formData: FormData) {
  const maleId = textField(formData, "maleId");
  const femaleId = textField(formData, "femaleId");
  const parentA = parseJsonGenotype(textField(formData, "parentA"));
  const parentB = parseJsonGenotype(textField(formData, "parentB"));
  const pairing = calculatePairing(parentA, parentB);
  const male = maleId ? await getAnimal(maleId) : undefined;
  const female = femaleId ? await getAnimal(femaleId) : undefined;
  const name =
    textField(formData, "name") ||
    `${male?.name ?? "親A"} × ${female?.name ?? "親B"}`;

  const id = newId();
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

  revalidatePath("/", "layout");
  redirect(`/predictions/${id}`);
}
