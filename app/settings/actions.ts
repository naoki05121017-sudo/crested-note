"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseFeedbackCategory, textField } from "@/lib/db/form";
import { mutateDb, newId } from "@/lib/db/store";

export async function saveSettings(formData: FormData) {
  await mutateDb((db) => {
    db.settings.displayName = textField(formData, "displayName");
    db.settings.collectionName =
      textField(formData, "collectionName") || "クレスノート";
    db.settings.prefecture = textField(formData, "prefecture");
    db.settings.publicByDefault = formData.get("publicByDefault") === "on";
  });
  revalidatePath("/", "layout");
  redirect("/settings");
}

export async function submitFeedback(formData: FormData) {
  const body = textField(formData, "body");
  if (!body) {
    throw new Error("ご意見の内容を入力してください。");
  }

  const stamp = new Date().toISOString();
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

  revalidatePath("/settings");
  redirect("/settings?sent=1");
}
