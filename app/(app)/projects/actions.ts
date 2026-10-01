"use server";

import { actionError, actionOk, revalidateApp } from "@/app/components/action-result";
import {
  nowIso,
  parseProjectRole,
  parseProjectStatus,
  textField,
} from "@/lib/db/form";
import { requireAppUser } from "@/lib/auth/session";
import { getOwnedProject, updateOwnedProject, upsertOwnedProjectMember, deleteOwnedProject, deleteOwnedProjectMember, insertOwnedProject } from "@/lib/db/owned-tables";
import { newId } from "@/lib/db/store";

export async function createProject(formData: FormData) {
  const name = textField(formData, "name");
  if (!name) return actionError("プロジェクト名は必須です。");
  const id = newId();
  try {
    const user = await requireAppUser();
    await insertOwnedProject(user.id, {
      id,
      name,
      goal: textField(formData, "goal"),
      notes: textField(formData, "notes"),
      status: "active",
      createdAt: nowIso(),
    });
  } catch (error) {
    return actionError(error, "作成できませんでした。");
  }
  revalidateApp("/projects", `/projects/${id}`);
  return actionOk(`/projects/${id}`);
}

export async function updateProject(id: string, formData: FormData) {
  try {
    const user = await requireAppUser();
    const existing = await getOwnedProject(user.id, id);
    if (!existing) throw new Error("プロジェクトが見つかりません。");
    const name = textField(formData, "name") || existing.name;
    await updateOwnedProject(user.id, id, {
      name,
      goal: textField(formData, "goal"),
      notes: textField(formData, "notes"),
      status: parseProjectStatus(textField(formData, "status")),
    });
  } catch (error) {
    return actionError(error, "保存できませんでした。");
  }
  revalidateApp("/projects", `/projects/${id}`);
  return actionOk(`/projects/${id}`);
}

export async function addProjectMember(projectId: string, formData: FormData) {
  const animalId = textField(formData, "animalId");
  if (!animalId) return actionError("個体を選んでください。");
  const role = parseProjectRole(textField(formData, "role"));
  try {
    const user = await requireAppUser();
    await upsertOwnedProjectMember(user.id, projectId, animalId, role);
  } catch (error) {
    return actionError(error, "追加できませんでした。");
  }
  revalidateApp(`/projects/${projectId}`);
  return actionOk(`/projects/${projectId}`);
}

export async function removeProjectMember(projectId: string, animalId: string) {
  try {
    const user = await requireAppUser();
    await deleteOwnedProjectMember(user.id, projectId, animalId);
  } catch (error) {
    return actionError(error, "外せませんでした。");
  }
  revalidateApp(`/projects/${projectId}`);
  return actionOk(`/projects/${projectId}`);
}

export async function deleteProject(id: string) {
  try {
    const user = await requireAppUser();
    await deleteOwnedProject(user.id, id);
  } catch (error) {
    return actionError(error, "削除できませんでした。");
  }
  revalidateApp("/projects");
  return actionOk("/projects");
}
