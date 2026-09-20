"use server";

import { actionError, actionOk, revalidateApp } from "@/app/components/action-result";
import { parseFeedbackCategory, textField } from "@/lib/db/form";
import { mutateDb, newId } from "@/lib/db/store";

export async function saveSettings(formData: FormData) {
  try {
    await mutateDb((db) => {
      db.settings.displayName = textField(formData, "displayName");
      db.settings.collectionName =
        textField(formData, "collectionName") || "クレスノート";
      db.settings.prefecture = textField(formData, "prefecture");
      db.settings.publicByDefault = formData.get("publicByDefault") === "on";
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
    await mutateDb((db) => {
      db.feedback.push({
        id: newId(),
        category: parseFeedbackCategory(textField(formData, "category")),
        status: "open",
        body,
        name: textField(formData, "name"),
        createdAt: stamp,
        updatedAt: stamp,
        adminNote: "",
      });
    });
  } catch (error) {
    return actionError(error, "送信できませんでした。");
  }

  revalidateApp("/settings");
  return actionOk("/settings?sent=1");
}
