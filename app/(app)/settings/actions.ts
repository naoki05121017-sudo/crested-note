"use server";

import { actionError, actionOk, revalidateApp } from "@/app/components/action-result";
import { requireAppUser } from "@/lib/auth/session";
import { nicknameError } from "@/lib/community/album-comments";
import { parseFeedbackCategory, textField } from "@/lib/db/form";
import { insertOwnedFeedback, updateOwnedSettings } from "@/lib/db/owned-tables";
import { listPublicShareSlugsForUser, settingsRevalidatePaths } from "@/lib/db/public-gallery";
import { newId } from "@/lib/db/store";

export async function saveSettings(formData: FormData) {
  const displayName = textField(formData, "displayName");
  const invalid = nicknameError(displayName);
  if (invalid) return actionError(invalid);

  let publicPaths: string[] = [];
  try {
    const user = await requireAppUser();
    await updateOwnedSettings(user.id, {
      displayName,
      collectionName: textField(formData, "collectionName") || "クレスノート",
      prefecture: textField(formData, "prefecture"),
      publicByDefault: formData.get("publicByDefault") === "on",
    });
    publicPaths = settingsRevalidatePaths(await listPublicShareSlugsForUser(user.id));
  } catch (error) {
    return actionError(error, "保存できませんでした。");
  }
  revalidateApp(...publicPaths);
  return actionOk("/settings");
}

export async function submitFeedback(formData: FormData) {
  const body = textField(formData, "body");
  if (!body) {
    return actionError("ご意見の内容を入力してください。");
  }

  const stamp = new Date().toISOString();
  try {
    const user = await requireAppUser();
    await insertOwnedFeedback(user.id, {
      id: newId(),
      category: parseFeedbackCategory(textField(formData, "category")),
      status: "open",
      body,
      name: textField(formData, "name"),
      createdAt: stamp,
      updatedAt: stamp,
      adminNote: "",
    });
  } catch (error) {
    return actionError(error, "送信できませんでした。");
  }

  revalidateApp("/settings");
  return actionOk("/settings?sent=1");
}
