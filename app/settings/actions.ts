"use server";

import { actionError, actionOk, revalidateApp } from "@/app/components/action-result";
import { requireSessionUser } from "@/lib/auth/session";
import { parseFeedbackCategory, textField } from "@/lib/db/form";
import { insertOwnedFeedback, updateOwnedSettings } from "@/lib/db/owned-tables";
import { newId } from "@/lib/db/store";

export async function saveSettings(formData: FormData) {
  try {
    const user = await requireSessionUser();
    await updateOwnedSettings(user.id, {
      displayName: textField(formData, "displayName"),
      collectionName: textField(formData, "collectionName") || "クレスノート",
      prefecture: textField(formData, "prefecture"),
      publicByDefault: formData.get("publicByDefault") === "on",
    });
  } catch (error) {
    return actionError(error, "保存できませんでした。");
  }
  revalidateApp("/settings");
  return actionOk("/settings");
}

export async function submitFeedback(formData: FormData) {
  const body = textField(formData, "body");
  if (!body) {
    return actionError("ご意見の内容を入力してください。");
  }

  const stamp = new Date().toISOString();
  try {
    const user = await requireSessionUser();
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
