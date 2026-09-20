"use server";

import { actionError, actionOk, revalidateApp } from "@/app/components/action-result";
import {
  issueTransferCode,
  redeemTransferCode,
  revokePendingTransfer,
} from "@/lib/crest-link/core";
import { textField } from "@/lib/db/form";
import { mutateDb } from "@/lib/db/store";

export async function issueAnimalTransfer(animalId: string) {
  if (!animalId) return actionError("発行できませんでした。");
  try {
    await mutateDb((db) => {
      issueTransferCode(db, animalId);
    });
  } catch (error) {
    return actionError(error, "発行できませんでした。");
  }
  revalidateApp("/animals", `/animals/${animalId}`);
  return actionOk(`/animals/${animalId}`);
}

export async function revokeAnimalTransfer(animalId: string) {
  if (!animalId) return actionError("無効にできませんでした。");
  try {
    await mutateDb((db) => {
      revokePendingTransfer(db, animalId);
    });
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
    const result = await mutateDb((db) =>
      redeemTransferCode(db, code, ownerLabel),
    );
    revalidateApp("/animals", `/animals/${result.animalId}`);
    return actionOk(`/animals/${result.animalId}`);
  } catch (error) {
    return actionError(error, "引き継げませんでした。");
  }
}
