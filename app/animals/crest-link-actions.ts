"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  issueTransferCode,
  redeemTransferCode,
  revokePendingTransfer,
} from "@/lib/crest-link/core";
import { textField } from "@/lib/db/form";
import { mutateDb } from "@/lib/db/store";

function refreshAnimal(animalId: string) {
  revalidatePath(`/animals/${animalId}`);
  revalidatePath("/animals");
  revalidatePath("/", "layout");
}

export async function issueAnimalTransfer(animalId: string) {
  await mutateDb((db) => {
    issueTransferCode(db, animalId);
  });
  refreshAnimal(animalId);
}

export async function revokeAnimalTransfer(animalId: string) {
  await mutateDb((db) => {
    revokePendingTransfer(db, animalId);
  });
  refreshAnimal(animalId);
}

export async function redeemAnimalTransfer(formData: FormData) {
  const code = textField(formData, "code");
  const ownerLabel = textField(formData, "ownerLabel");
  const result = await mutateDb((db) => redeemTransferCode(db, code, ownerLabel));
  refreshAnimal(result.animalId);
  redirect(`/animals/${result.animalId}`);
}
