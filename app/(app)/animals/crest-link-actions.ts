"use server";

import { actionError, actionOk, revalidateApp } from "@/app/components/action-result";
import { textField } from "@/lib/db/form";
import { requireAppUser } from "@/lib/auth/session";
import {
  issueOwnedTransfer,
  redeemOwnedTransfer,
  revokeOwnedTransfer,
} from "@/lib/db/crest-link-io";

export async function issueAnimalTransfer(animalId: string) {
  if (!animalId) return actionError("発行できませんでした。");
  try {
    const user = await requireAppUser();
    await issueOwnedTransfer(user.id, animalId);
  } catch (error) {
    return actionError(error, "発行できませんでした。");
  }
  revalidateApp("/animals", `/animals/${animalId}`);
  return actionOk(`/animals/${animalId}`);
}

export async function revokeAnimalTransfer(animalId: string) {
  if (!animalId) return actionError("無効にできませんでした。");
  try {
    const user = await requireAppUser();
    await revokeOwnedTransfer(user.id, animalId);
  } catch (error) {
    return actionError(error, "無効にできませんでした。");
  }
  revalidateApp("/animals", `/animals/${animalId}`);
  return actionOk(`/animals/${animalId}`);
}

export async function redeemAnimalTransfer(formData: FormData) {
  const code = textField(formData, "code");
  const ownerLabel = textField(formData, "ownerLabel");
  try {
    const user = await requireAppUser();
    const result = await redeemOwnedTransfer(user.id, code, ownerLabel);
    revalidateApp("/animals", `/animals/${result.animalId}`);
    return actionOk(`/animals/${result.animalId}`);
  } catch (error) {
    return actionError(error, "引き継げませんでした。");
  }
}
