"use server";

import { actionError, actionOk, revalidateApp } from "@/app/components/action-result";
import { requireSessionUser } from "@/lib/auth/session";
import { textField } from "@/lib/db/form";
import { getOwnedSettings } from "@/lib/db/animal-io";
import {
  insertPublicComment,
  reportPublicComment,
  softDeletePublicComment,
} from "@/lib/db/animal-comments";

function commentPath(slug: string) {
  return slug ? `/p/${slug}#comments` : "/gallery";
}

export async function addPublicComment(formData: FormData) {
  const animalId = textField(formData, "animalId");
  const slug = textField(formData, "slug");
  try {
    const user = await requireSessionUser();
    const settings = await getOwnedSettings(user.id);
    await insertPublicComment({
      animalId,
      userId: user.id,
      displayName: settings.displayName,
      body: textField(formData, "body"),
      parentId: textField(formData, "parentId") || undefined,
    });
  } catch (error) {
    return actionError(error, "コメントできませんでした。");
  }
  revalidateApp(commentPath(slug));
  return actionOk(commentPath(slug));
}

export async function deletePublicComment(formData: FormData) {
  const slug = textField(formData, "slug");
  try {
    const user = await requireSessionUser();
    const nextSlug = await softDeletePublicComment({
      commentId: textField(formData, "commentId"),
      userId: user.id,
    });
    revalidateApp(commentPath(nextSlug || slug));
    return actionOk(commentPath(nextSlug || slug));
  } catch (error) {
    return actionError(error, "削除できませんでした。");
  }
}

export async function reportPublicCommentAction(formData: FormData) {
  const slug = textField(formData, "slug");
  try {
    const user = await requireSessionUser();
    const nextSlug = await reportPublicComment({
      commentId: textField(formData, "commentId"),
      reporterId: user.id,
      reason: textField(formData, "reason"),
    });
    revalidateApp(commentPath(nextSlug || slug));
    return actionOk(commentPath(nextSlug || slug));
  } catch (error) {
    return actionError(error, "通報できませんでした。");
  }
}
