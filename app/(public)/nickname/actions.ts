"use server";

import { actionError, actionOk, revalidateApp } from "@/app/components/action-result";
import { requireSessionUser } from "@/lib/auth/session";
import { nicknameError } from "@/lib/community/album-comments";
import { textField } from "@/lib/db/form";
import { updateOwnedDisplayName } from "@/lib/db/owned-tables";
import { listPublicShareSlugsForUser, settingsRevalidatePaths } from "@/lib/db/public-gallery";

export async function saveNickname(formData: FormData) {
  const displayName = textField(formData, "displayName");
  const invalid = nicknameError(displayName);
  if (invalid) return actionError(invalid);

  let publicPaths: string[] = [];
  try {
    const user = await requireSessionUser();
    await updateOwnedDisplayName(user.id, displayName);
    publicPaths = settingsRevalidatePaths(await listPublicShareSlugsForUser(user.id));
  } catch (error) {
    return actionError(error, "保存できませんでした。");
  }
  revalidateApp(...publicPaths);
  return actionOk("/");
}
